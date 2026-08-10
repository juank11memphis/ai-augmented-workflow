import http from 'node:http';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import { InMemoryRunArtifactStore, JsonEvalSuiteRegistry, JsonEvalSuiteRunnerAdapter, parseEvalRunRequest, runLocalEvalSuite } from '../run-local-eval-suite/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import type { LocalWorkbenchServerStarterPort, LocalWorkbenchServerStartRequest, LocalWorkbenchServerStartResult } from './ports.js';

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
    private readonly runDependenciesFactory: (request: LocalWorkbenchServerStartRequest) => RunLocalEvalSuiteDependencies = defaultRunDependencies
  ) {}

  async startServer(request: LocalWorkbenchServerStartRequest): Promise<LocalWorkbenchServerStartResult> {
    const runDependencies = this.runDependenciesFactory(request);
    const server = this.createServer((httpRequest, response) => {
      void routeLocalRequest(httpRequest, response, request, runDependencies);
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

async function routeLocalRequest(request: LocalHttpRequest, response: LocalHttpResponse, startRequest: LocalWorkbenchServerStartRequest, runDependencies: RunLocalEvalSuiteDependencies): Promise<void> {
  if (request.url === '/api/eval-suites') {
    writeJson(response, 200, startRequest.initialDiscoveryResult);
    return;
  }

  if (request.url === '/api/eval-runs' && request.method === 'POST') {
    await handleEvalRunRequest(request, response, startRequest, runDependencies);
    return;
  }

  writeHtml(response, renderSafeWorkbenchShell(startRequest.initialDiscoveryResult));
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

function createNodeHttpServer(handler: LocalHttpRequestHandler): LocalHttpServer {
  return http.createServer((request, response) => handler(request, response));
}

function defaultRunDependencies(_request: LocalWorkbenchServerStartRequest): RunLocalEvalSuiteDependencies {
  return {
    suiteRegistry: new JsonEvalSuiteRegistry(),
    evalRunner: new JsonEvalSuiteRunnerAdapter(),
    artifactStore: new InMemoryRunArtifactStore(),
    logger: { info: console.info, warn: console.warn, error: console.error },
  };
}

function renderSafeWorkbenchShell(discoveryResult: EvalSuiteDiscoveryResult): string {
  const statusMessage = discoveryResult.status === 'ready'
    ? `${discoveryResult.suites.length} eval suite${discoveryResult.suites.length === 1 ? '' : 's'} ready.`
    : discoveryResult.message;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sibu Local Evals</title>
</head>
<body>
  <main>
    <h1>Local Sibu Evals</h1>
    <p>The local evals workbench runtime is running.</p>
    <p>${escapeHtml(statusMessage)}</p>
    <p>Eval execution is available through the local JSON runtime.</p>
  </main>
</body>
</html>`;
}

async function readJsonBody(request: LocalHttpRequest): Promise<{ readonly status: 'ok'; readonly payload: unknown } | { readonly status: 'invalid'; readonly message: string }> {
  if (!request.on) return { status: 'invalid', message: 'Request body could not be read.' };

  return new Promise((resolve) => {
    let body = '';
    request.on?.('data', (chunk) => {
      body += chunk.toString();
      if (body.length > MAX_JSON_BODY_BYTES) resolve({ status: 'invalid', message: 'Request body is too large.' });
    });
    request.on?.('end', () => {
      try {
        resolve({ status: 'ok', payload: JSON.parse(body) as unknown });
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character] ?? character));
}

function closeServer(server: LocalHttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
