import http from 'node:http';

import { toPublicEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import { createWorkbenchViewModel, renderWorkbenchShell, WORKBENCH_CLIENT_SCRIPT } from '../workbench-ui/index.js';
import { parseEvalRunRequest, runLocalEvalSuite } from '../run-local-eval-suite/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import { analyzeFailedAssertion, parseAnalyzeFailedAssertionRequest } from '../analyze-failed-assertion/index.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/index.js';
import { draftEvalRepairProposal, parseDraftEvalRepairProposalRequest } from '../draft-eval-repair-proposal/index.js';
import { applyApprovedEvalRepair, parseApplyApprovedEvalRepairRequest } from '../apply-approved-eval-repair/index.js';
import type { DraftEvalRepairProposalDependencies } from '../draft-eval-repair-proposal/index.js';
import type { ApplyApprovedEvalRepairDependencies } from '../apply-approved-eval-repair/index.js';
import type { LocalWorkbenchServerStarterPort, LocalWorkbenchServerStartRequest, LocalWorkbenchServerStartResult } from './ports.js';
import { createWorkbenchDependencies, type LocalWorkbenchRuntimeDependencies } from '../workbench-composition.js';
import { describeEvalSuiteRuntime } from '../describe-eval-suite-runtime/index.js';
import { parseDescribeRequest } from '../describe-eval-suite-runtime/request-parser.js';
import { previewEvalRun } from '../preview-eval-run/index.js';
import { parsePreviewRequest } from '../preview-eval-run/request-parser.js';

const LOCAL_WORKBENCH_HOST = '127.0.0.1' as const;
const MAX_JSON_BODY_BYTES = 64 * 1024;

type LocalHttpResponse = {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body: string): void;
};

type LocalHttpRequest = {
  readonly url?: string;
  readonly method?: string;
  on?(event: 'data', listener: (chunk: Buffer | string) => void): void;
  on?(event: 'end', listener: () => void): void;
  on?(event: 'error', listener: () => void): void;
};

type LocalHttpRequestHandler = (request: LocalHttpRequest, response: LocalHttpResponse) => void;

type LocalHttpServer = {
  once(event: 'error', listener: (error: Error) => void): void;
  off(event: 'error', listener: (error: Error) => void): void;
  listen(port: number, host: string, callback: () => void): void;
  address(): string | { port: number } | null;
  close(callback: (error?: Error) => void): void;
};

type LocalHttpServerFactory = (handler: LocalHttpRequestHandler) => LocalHttpServer;

export class NodeLocalWorkbenchServerStarter implements LocalWorkbenchServerStarterPort {
  constructor(
    private readonly createServer: LocalHttpServerFactory = createNodeHttpServer,
    private readonly dependenciesFactory: (request: LocalWorkbenchServerStartRequest) => LocalWorkbenchRuntimeDependencies = createWorkbenchDependencies
  ) {}

  async startServer(request: LocalWorkbenchServerStartRequest): Promise<LocalWorkbenchServerStartResult> {
    const runtimeDependencies = this.dependenciesFactory(request);
    const server = this.createServer((httpRequest, response) => {
      void routeLocalRequest(httpRequest, response, request, runtimeDependencies);
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, LOCAL_WORKBENCH_HOST, () => {
        server.off('error', reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close(() => undefined);
      throw new Error('Local workbench server did not expose a TCP address.');
    }

    return {
      url: `http://${LOCAL_WORKBENCH_HOST}:${address.port}/`,
      host: LOCAL_WORKBENCH_HOST,
      port: address.port,
      stop: () => closeServer(server),
    };
  }
}

async function routeLocalRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, dependencies: LocalWorkbenchRuntimeDependencies): Promise<void> {
  const publicDiscoveryResult = toPublicEvalSuiteDiscoveryResult(startRequest.initialDiscoveryResult);
  if (request.url === '/api/eval-suites') {
    writeJson(response, 200, publicDiscoveryResult);
    return;
  }

  if (request.url === '/api/eval-runs' && request.method === 'POST') {
    await handleEvalRunRequest(request, response, startRequest, dependencies.run);
    return;
  }
  if (request.url === '/api/eval-suites/describe' && request.method === 'POST') {
    if (!dependencies.describe) { writeJson(response, 503, { status: 'blocked', reason: 'runner-unavailable' }); return; }
    const body = await readJsonBody(request);
    const command = body.status === 'ok' ? parseDescribeRequest(body.payload) : undefined;
    if (!command) { writeJson(response, 400, { status: 'blocked', reason: 'invalid-request' }); return; }
    const result = await describeEvalSuiteRuntime(command, dependencies.describe);
    writeJson(response, result.status === 'ready' ? 200 : 422, result);
    return;
  }
  if (request.url === '/api/eval-runs/preview' && request.method === 'POST') {
    if (!dependencies.preview) { writeJson(response, 503, { status: 'blocked', reason: 'runner-unavailable' }); return; }
    const body = await readJsonBody(request);
    const command = body.status === 'ok' ? parsePreviewRequest(body.payload) : undefined;
    if (!command) { writeJson(response, 400, { status: 'blocked', reason: 'invalid-request' }); return; }
    const result = await previewEvalRun(command, dependencies.preview);
    writeJson(response, result.status === 'ready' ? 200 : 422, result);
    return;
  }
  if ((request.url === '/api/eval-suites/describe' || request.url === '/api/eval-runs/preview') && request.method !== 'POST') {
    writeJson(response, 405, { status: 'blocked', reason: 'method-not-allowed' });
    return;
  }

  if (request.url === '/api/failure-analysis' && request.method === 'POST') {
    await handleFailureAnalysisRequest(request, response, startRequest, dependencies.analysis);
    return;
  }

  if (request.url === '/api/repair-proposals' && request.method === 'POST') {
    await handleRepairProposalRequest(request, response, startRequest, dependencies.proposal);
    return;
  }

  if (request.url === '/api/repair-proposals/apply' && request.method === 'POST') {
    await handleApplyRepairProposalRequest(request, response, startRequest, dependencies.applyRepair);
    return;
  }

  const preferredEvalRunModel = dependencies.analysis.assistanceConfig.getConfig().assistanceModelLabel;
  writeHtml(response, renderWorkbenchShell(createWorkbenchViewModel({ discovery: publicDiscoveryResult, preferredEvalRunModel }), WORKBENCH_CLIENT_SCRIPT));
}

async function handleEvalRunRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, dependencies: RunLocalEvalSuiteDependencies): Promise<void> {
  const body = await readJsonBody(request);
  if (body.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: body.message, diagnostics: [{ code: 'invalid-request', severity: 'error', message: body.message }] });
    return;
  }

  const parsed = parseEvalRunRequest(startRequest.projectRoot, body.payload);
  if (parsed.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: parsed.message, diagnostics: [{ code: 'invalid-request', severity: 'error', message: parsed.message }] });
    return;
  }

  const result = await runLocalEvalSuite(parsed.command, dependencies);
  writeJson(response, result.status === 'completed' ? 200 : 422, result);
}

async function handleFailureAnalysisRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, dependencies: AnalyzeFailedAssertionDependencies): Promise<void> {
  const body = await readJsonBody(request);
  if (body.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: body.message });
    return;
  }

  const parsed = parseAnalyzeFailedAssertionRequest(startRequest.projectRoot, body.payload);
  if (parsed.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: parsed.message });
    return;
  }

  const result = await analyzeFailedAssertion(parsed.command, dependencies);
  writeJson(response, result.status === 'analysis-ready' || result.status === 'analysis-unavailable' ? 200 : result.status === 'blocked' ? 422 : 502, result);
}

async function handleRepairProposalRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, dependencies: DraftEvalRepairProposalDependencies): Promise<void> {
  const body = await readJsonBody(request);
  if (body.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: body.message });
    return;
  }

  const parsed = parseDraftEvalRepairProposalRequest(startRequest.projectRoot, body.payload);
  if (parsed.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: parsed.message });
    return;
  }

  const result = await draftEvalRepairProposal(parsed.command, dependencies);
  writeJson(response, result.status === 'proposal-ready' || result.status === 'proposal-unavailable' ? 200 : result.status === 'blocked' || result.status === 'proposal-rejected' ? 422 : 502, result);
}

async function handleApplyRepairProposalRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, dependencies: ApplyApprovedEvalRepairDependencies): Promise<void> {
  const body = await readJsonBody(request);
  if (body.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: body.message });
    return;
  }

  const parsed = parseApplyApprovedEvalRepairRequest(startRequest.projectRoot, body.payload);
  if (parsed.status === 'invalid') {
    writeJson(response, 400, { status: 'blocked', reason: 'invalid-request', message: parsed.message });
    return;
  }

  const result = await applyApprovedEvalRepair(parsed.command, dependencies);
  writeJson(response, result.status === 'applied' ? 200 : result.status === 'blocked' ? 422 : 500, result);
}

function createNodeHttpServer(handler: LocalHttpRequestHandler): LocalHttpServer {
  return http.createServer((request, response) => handler(request, response));
}

async function readJsonBody(request: LocalHttpRequest): Promise<{ readonly status: 'ok'; readonly payload: unknown } | { readonly status: 'invalid'; readonly message: string }> {
  if (!request.on) return { status: 'invalid', message: 'Request body could not be read.' };

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let exceeded = false;
    request.on?.('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_JSON_BODY_BYTES) { exceeded = true; chunks.length = 0; return; }
      if (!exceeded) chunks.push(buffer);
    });
    request.on?.('end', () => {
      if (exceeded) { resolve({ status: 'invalid', message: 'Request body is too large.' }); return; }
      try {
        resolve({ status: 'ok', payload: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown });
      } catch {
        resolve({ status: 'invalid', message: 'Request body must be valid JSON.' });
      }
    });
    request.on?.('error', () => resolve({ status: 'invalid', message: 'Request body could not be read.' }));
  });
}

function writeJson(response: LocalHttpResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, jsonHeaders());
  response.end(JSON.stringify(payload));
}

function writeHtml(response: LocalHttpResponse, body: string): void {
  response.writeHead(200, htmlHeaders());
  response.end(body);
}

function htmlHeaders(): Record<string, string> {
  return { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
}

function jsonHeaders(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
}

function closeServer(server: LocalHttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
