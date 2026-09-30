import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/index.js';
import type { DraftEvalRepairProposalDependencies } from '../draft-eval-repair-proposal/index.js';
import type { ApplyApprovedEvalRepairDependencies } from '../apply-approved-eval-repair/index.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

const offlineSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline checks', description: 'Synthetic fixture',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [
    { id: 'first', name: 'First case', turns: [{ role: 'user', content: { type: 'inline', text: 'hello' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'hello' }], graders: [] },
    { id: 'second', name: 'Second case', turns: [{ role: 'user', content: { type: 'inline', text: 'hello' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'hello' }], graders: [] },
  ],
};

const offlineRunner = `import { readFileSync } from 'node:fs';
let input=''; process.stdin.on('data',part=>input+=part); process.stdin.on('end',()=>{
  const request=JSON.parse(input), mode=readFileSync('evals/mode.txt','utf8');
  if(process.env.SIBU_EVAL_MODE!=='1'||mode==='failure') process.exit(3);
  const data=request.operation==='describe'
    ? {runnerId:'offline',capabilities:['single-turn'],models:mode==='no-models'?[]:['fake/available','fake/unavailable'],judgeModels:[],requiredEnvironment:[],costEstimation:true}
    : {targetCalls:request.testCases.length*request.repeats,judgeCalls:0,totalCalls:request.testCases.length*request.repeats,cost:request.model==='fake/available'
      ? {status:'available',amount:0.01,currency:'USD'} : {status:'unavailable',reason:'Provider pricing unavailable.'}};
  if(request.operation==='execute') process.exit(3);
  process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,type:request.operation==='describe'?'description':'estimate',runId:null,caseId:null,attempt:null,data})+'\\n');
});`;

export async function withOfflineWorkbench(run: (workbench: {
  readonly getHtml: () => Promise<string>;
  readonly post: (route: string, body: unknown) => Promise<{ code: number; payload: Record<string, unknown> }>;
  readonly setRunnerMode: (mode: string) => Promise<void>;
}) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-inline-run-'));
  try {
    await mkdir(path.join(root, 'evals'));
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/target.mjs'), 'export const target = null;\n');
    await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify(offlineSuite));
    await writeFile(path.join(root, 'evals/runner.mjs'), offlineRunner);
    await writeFile(path.join(root, 'evals/mode.txt'), 'ready');
    await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
    execFileSync('git', ['init', '-q'], { cwd: root });
    const discovery = await discoverConventionalEvalSuites(
      { type: 'discover-conventional-eval-suites', projectRoot: root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => undefined, warn: () => undefined } }
    );
    assert.equal(discovery.status, 'ready');
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: root, initialDiscoveryResult: discovery });
    try {
      await run({
        getHtml: async () => (await fetch(server.url)).text(),
        post: async (route, body) => {
          const response = await fetch(new URL(route, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
          return { code: response.status, payload: await response.json() as Record<string, unknown> };
        },
        setRunnerMode: (mode) => writeFile(path.join(root, 'evals/mode.txt'), mode),
      });
    } finally { await server.stop?.(); }
  } finally { await rm(root, { recursive: true, force: true }); }
}

export function readyDiscovery(): InternalEvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    definitions: [],
    suites: [{
      id: 'skill-authoring',
      name: 'Skill authoring checks',
      description: 'Checks generated skills.',
      readyTestCaseCount: 2,
      testCases: [{ id: 'names-artifact', name: 'Names artifact' }, { id: 'missing-skill-boundary', name: 'Missing skill boundary' }],
      modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    }],
    diagnostics: [],
  };
}

export function blockedDiscovery(): InternalEvalSuiteDiscoveryResult {
  return {
    status: 'blocked',
    reason: 'missing-evals-folder',
    message: 'No conventional evals folder was found.',
    guidance: ['Add Sibu eval suite JSON files under the project root evals/ folder.'],
    suites: [],
    definitions: [],
    diagnostics: [{ code: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Project does not contain a root evals/ folder.' }],
  };
}



export function runDependencies(calls: string[][], options: { readonly throws?: boolean } = {}): RunLocalEvalSuiteDependencies {
  const suite = {
    version: 2 as const,
    id: 'skill-authoring',
    name: 'Skill authoring checks',
    modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    testCases: [{ id: 'missing-skill-boundary', name: 'Missing skill boundary' }, { id: 'names-artifact', name: 'Names artifact' }],
  };
  return {
    suiteRegistry: { findSuite: async (_projectRoot, suiteId) => suiteId === suite.id ? suite : null },
    evalRunner: {
      runSuite: async (request) => {
        calls.push(request.testCases.map((testCase) => testCase.id));
        if (options.throws) throw new Error('full raw output secret /repo');
        return { status: 'completed', cells: request.testCases.map((testCase) => ({ testCaseId: testCase.id, status: 'passed' as const, output: 'short safe preview' })) };
      },
    },
    artifactStore: { storeRunArtifact: async () => undefined },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

type FakeResponse = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
};

type FakeHandler = (request: { readonly url?: string; readonly method?: string; readonly on?: (event: string, listener: Function) => void }, response: {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body: string): void;
}) => void;

export class FakeLocalHttpServer {
  handler?: FakeHandler;
  listenHost?: string;
  private closed = false;

  constructor(private readonly port: number) {}

  once(_event: 'error', _listener: (error: Error) => void): void {}

  off(_event: 'error', _listener: (error: Error) => void): void {}

  listen(_port: number, host: string, callback: () => void): void {
    this.listenHost = host;
    callback();
  }

  address(): { port: number } {
    return { port: this.port };
  }

  close(callback: (error?: Error) => void): void {
    this.closed = true;
    callback();
  }

  renderResponse(url: string): FakeResponse {
    assert.equal(this.closed, false);
    assert.ok(this.handler);
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';

    this.handler({ url, method: 'GET' }, {
      writeHead: (nextStatusCode, nextHeaders) => {
        statusCode = nextStatusCode;
        headers = nextHeaders;
      },
      end: (nextBody) => {
        body = nextBody;
      },
    });

    return { statusCode, headers, body };
  }


  async renderJsonResponse(url: string, payload: unknown): Promise<FakeResponse> {
    return this.renderRawResponse(url, JSON.stringify(payload));
  }

  async renderRawResponse(url: string, bodyPayload: string): Promise<FakeResponse> {
    assert.equal(this.closed, false);
    assert.ok(this.handler);
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';
    const listeners = new Map<string, Function[]>();
    const request = {
      url,
      method: 'POST',
      on: (event: string, listener: Function) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      },
    };

    this.handler(request, {
      writeHead: (nextStatusCode, nextHeaders) => {
        statusCode = nextStatusCode;
        headers = nextHeaders;
      },
      end: (nextBody) => {
        body = nextBody;
      },
    });

    for (const listener of listeners.get('data') ?? []) listener(bodyPayload);
    for (const listener of listeners.get('end') ?? []) listener();
    await new Promise((resolve) => setImmediate(resolve));
    return { statusCode, headers, body };
  }
}



export function runtimeDependencies(overrides: { readonly run?: RunLocalEvalSuiteDependencies; readonly analysis?: AnalyzeFailedAssertionDependencies; readonly proposal?: DraftEvalRepairProposalDependencies; readonly applyRepair?: ApplyApprovedEvalRepairDependencies } = {}) {
  return { run: overrides.run ?? runDependencies([]), analysis: overrides.analysis ?? analysisDependencies(), proposal: overrides.proposal ?? proposalDependencies(), applyRepair: overrides.applyRepair ?? applyRepairDependencies() };
}

export function applyRepairDependencies(options: { readonly mutationCalls?: unknown[] } = {}): ApplyApprovedEvalRepairDependencies {
  return {
    proposalReader: { getPendingProposal: (proposalId) => proposalId === 'stale' ? null : { proposalId, projectRoot: '/repo', affectedProjectFiles: [proposalId === 'unsafe' ? '../outside.md' : 'prompts/skill-authoring.md'], targetPrecondition: { status: 'absent', path: proposalId === 'unsafe' ? '../outside.md' : 'prompts/skill-authoring.md' }, changeSummary: 'Add hard stop rule.', rationale: 'The active assertion skipped the rule.', expectedEvalImpact: 'The focused assertion should pass.', proposedChange: { kind: 'replacement', representation: 'new content' }, approvalState: 'pending', sourceFailureScope: { suiteId: 'skill-authoring', runId: 'run-1', testCaseId: 'missing-skill-boundary', attempt: 1, evalRunModelId: 'gpt-5-mini', judgeModel: null, repeats: 1, assertionId: 'a1' } }, claimPendingProposal: () => true },
    safety: { validateTargets: async (_root, targets) => targets.some((target) => target.startsWith('..')) ? { status: 'blocked', reason: 'unsafe target', unsafePaths: targets } : { status: 'ok', safeTargets: targets } },
    workflowReadiness: { checkReadiness: async () => ({ status: 'ready' }) },
    mutator: { applyApprovedChange: async (request) => { options.mutationCalls?.push(request); return { status: 'applied', changedFiles: request.targetPaths.map((target) => ({ path: target })) }; } },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

export function analysisPayload() {
  return { suiteId: 'skill-authoring', runId: 'run-1', attempt: 1, testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1' };
}

export function proposalPayload() {
  return { ...analysisPayload(), analysisId: 'analysis-1', repairDirection: { type: 'prompt_issue' } };
}

export function analysisDependencies(options: { readonly hasKey?: boolean; readonly model?: string; readonly throws?: boolean; readonly analysisCalls?: unknown[] } = {}): AnalyzeFailedAssertionDependencies {
  return {
    artifactReader: { read: async () => ({ status: 'ready', value: { testedModel: 'gpt-5-mini', judgeModel: null, repeats: 1, runScope: 'all', evidence: { suiteId: 'skill-authoring', runId: 'run-1', attempt: 1, testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'gpt-5-mini', assertionId: 'a1', assertionLabel: 'a1', assertionKind: 'assertion', assertionMessage: 'Failed active', actualOutputPreview: 'active failed output', expectedPreview: 'expected stop', cellOutputPreview: null, diagnostics: [], artifacts: [] } } }) },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: options.model ?? 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'secret' }) },
    llm: { analyzeFailure: async (request) => { options.analysisCalls?.push(request); if (options.throws) throw new Error('full model response secret raw prompt'); return { exactFailureExplanation: 'The selected assertion failed.', likelyCause: 'prompt_issue', evidenceSummary: 'The output did not stop.', uncertainty: 'Low uncertainty.' }; } },
    analysisStore: { save: () => 'analysis-1' },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

export function proposalDependencies(options: { readonly hasKey?: boolean; readonly model?: string; readonly throws?: boolean; readonly proposalCalls?: unknown[]; readonly targetFile?: string; readonly summary?: string } = {}): DraftEvalRepairProposalDependencies {
  return {
    artifactReader: { read: async () => ({ status: 'ready', value: { testedModel: 'gpt-5-mini', judgeModel: null, repeats: 1, runScope: 'all', evidence: { suiteId: 'skill-authoring', runId: 'run-1', attempt: 1, testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'gpt-5-mini', assertionId: 'a1', assertionLabel: 'a1', assertionKind: 'assertion', assertionMessage: 'Failed active', actualOutputPreview: 'active failed output', expectedPreview: 'expected stop', cellOutputPreview: null, diagnostics: [], artifacts: [] } } }) },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: options.model ?? 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'secret' }) },
    analysisStore: { get: () => ({ exactFailureExplanation: 'The selected assertion failed.', likelyCause: 'prompt_issue', evidenceSummary: 'The output did not stop.', uncertainty: 'Low uncertainty.' }) },
    context: { namedFiles: () => ({ status: 'ready', paths: ['prompts/skill-authoring.md'] }) },
    projectFileReader: { readProjectFilePreviews: async () => ({ status: 'ok', files: [{ path: 'prompts/skill-authoring.md', preview: 'before', digest: 'one' }] }), readTargetState: async () => ({ status: 'ok', value: { status: 'present', path: 'prompts/skill-authoring.md', digest: 'one', content: 'before', preview: 'before' } }) },
    llm: { draftProposal: async (request) => { options.proposalCalls?.push(request); if (options.throws) throw new Error('full model response raw prompt secret'); return { affectedProjectFiles: [options.targetFile ?? 'prompts/skill-authoring.md'], changeSummary: options.summary ?? 'Require missing input hard stops before drafting.', rationale: 'The active assertion failed because the prompt skipped the stop rule.', expectedEvalImpact: 'The selected assertion should pass while preserving other checks.', proposedChange: { kind: 'replacement', representation: 'Add an explicit missing-input hard stop rule.' } }; } },
    proposalStore: { savePendingProposal: async (request) => ({ ...request.proposal, proposalId: 'repair_test', approvalState: 'pending', sourceFailureScope: { suiteId: request.suiteId, runId: request.runId, testCaseId: request.testCaseId, attempt: request.attempt, evalRunModelId: request.evalRunModelId, judgeModel: request.judgeModel, repeats: request.repeats, assertionId: request.assertionId } }) },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

export function failedArtifact(): StoredRunArtifact {
  return {
    suiteId: 'skill-authoring', modelId: 'gpt-5-mini', scope: 'all',
    matrix: { suiteId: 'skill-authoring', suiteName: 'Skill checks', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status: 'failed', cells: [{ testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini', modelLabel: 'GPT-5 mini', status: 'failed', outputPreview: 'short output', durationMs: 10, diagnostics: [], metrics: [], artifacts: [], assertions: [
      { id: 'a1', label: 'Must stop first', kind: 'assertion', status: 'failed', message: 'Failed active', expectedPreview: 'expected stop', actualPreview: 'active failed output', metrics: [], diagnostics: [], artifacts: [] },
      { id: 'a2', label: 'Other failure', kind: 'assertion', status: 'failed', message: 'Other failed', expectedPreview: 'expected other', actualPreview: 'other failed output', metrics: [], diagnostics: [], artifacts: [] },
    ] }] }] },
  };
}
