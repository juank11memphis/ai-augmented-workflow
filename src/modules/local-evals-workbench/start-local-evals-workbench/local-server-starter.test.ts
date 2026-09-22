import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult, InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/index.js';
import type { DraftEvalRepairProposalDependencies } from '../draft-eval-repair-proposal/index.js';
import { APPLY_APPROVED_REPAIR_MARKER } from '../apply-approved-eval-repair/index.js';
import type { ApplyApprovedEvalRepairDependencies } from '../apply-approved-eval-repair/index.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

describe('NodeLocalWorkbenchServerStarter', () => {
  it('binds to localhost and serves only safe initial content', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });
    process.env.OPENAI_API_KEY = 'openai-secret-for-test';
    process.env.SIBU_EVALS_MODEL = 'model-secret-for-test';

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = fakeServer.renderResponse('/');

      assert.equal(fakeServer.listenHost, '127.0.0.1');
      assert.equal(result.host, '127.0.0.1');
      assert.equal(result.url, 'http://127.0.0.1:4321/');
      assert.match(response.body, /Local Sibu Evals/);
      assert.match(response.body, /Eval Suite/);
      assert.match(response.body, /Skill authoring checks/);
      assert.match(response.body, /Run scope/);
      assert.match(response.body, /Run all 2 test cases/);
      assert.match(response.body, /Model/);
      assert.match(response.body, /Pass rate/);
      assert.match(response.body, /0\/2 complete/);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.doesNotMatch(response.body, /openai-secret-for-test|model-secret-for-test|OPENAI_API_KEY|SIBU_EVALS_MODEL|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|process\.env|mutation|mutate|\/repo/);
    } finally {
      await result.stop?.();
      delete process.env.OPENAI_API_KEY;
      delete process.env.SIBU_EVALS_MODEL;
    }
  });

  it('serves discovered eval suite summaries from a local JSON endpoint', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = fakeServer.renderResponse('/api/eval-suites');
      const payload = JSON.parse(response.body) as EvalSuiteDiscoveryResult;

      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
      assert.equal(payload.status, 'ready');
      assert.equal(payload.suites[0]?.name, 'Skill authoring checks');
      assert.equal(payload.suites[0]?.readyTestCaseCount, 2);
      assert.equal(payload.suites[0]?.testCases[0]?.id, 'names-artifact');
      assert.equal(payload.suites[0]?.modelOptions[0]?.id, 'gpt-5-mini');
      assert.equal('definitions' in payload, false);
      assert.doesNotMatch(response.body, /\/repo|OPENAI_API_KEY|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|secret/);
    } finally {
      await result.stop?.();
    }
  });

  it('serves blocked empty setup state from the local JSON endpoint', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: blockedDiscovery() });
    try {
      const response = fakeServer.renderResponse('/api/eval-suites');
      const payload = JSON.parse(response.body) as EvalSuiteDiscoveryResult;

      assert.equal(payload.status, 'blocked');
      assert.equal(payload.suites.length, 0);
      assert.match(response.body, /No conventional evals folder/);
    } finally {
      await result.stop?.();
    }
  });


  it('runs all test cases through POST /api/eval-runs', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const calls: string[][] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ run: runDependencies(calls) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await fakeServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
      const payload = JSON.parse(response.body) as { status: string; matrix: { rows: readonly { testCaseId: string }[] } };

      assert.equal(response.statusCode, 200);
      assert.equal(payload.status, 'completed');
      assert.deepEqual(payload.matrix.rows.map((row) => row.testCaseId), ['missing-skill-boundary', 'names-artifact']);
      assert.deepEqual(calls, [['missing-skill-boundary', 'names-artifact']]);
      assert.doesNotMatch(response.body, /\/repo|secret|full raw output/);
    } finally {
      await result.stop?.();
    }
  });

  it('runs one test case through POST /api/eval-runs', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const calls: string[][] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ run: runDependencies(calls) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await fakeServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'names-artifact' } });
      const payload = JSON.parse(response.body) as { status: string; matrix: { rows: readonly { testCaseId: string }[] } };

      assert.equal(response.statusCode, 200);
      assert.equal(payload.status, 'completed');
      assert.deepEqual(payload.matrix.rows.map((row) => row.testCaseId), ['names-artifact']);
      assert.deepEqual(calls, [['names-artifact']]);
    } finally {
      await result.stop?.();
    }
  });

  it('returns structured JSON for malformed, blocked, and error eval run requests', async () => {
    const malformedServer = new FakeLocalHttpServer(4321);
    const malformedStarter = new NodeLocalWorkbenchServerStarter((handler) => {
      malformedServer.handler = handler;
      return malformedServer;
    }, () => runtimeDependencies({ run: runDependencies([]) }));
    const malformedResult = await malformedStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      assert.equal((await malformedServer.renderRawResponse('/api/eval-runs', '{ not json')).statusCode, 400);
      assert.equal((await malformedServer.renderJsonResponse('/api/eval-runs', { suiteId: 'missing', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } })).statusCode, 422);
      assert.equal((await malformedServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'missing' } })).statusCode, 422);
    } finally {
      await malformedResult.stop?.();
    }

    const errorServer = new FakeLocalHttpServer(4321);
    const errorStarter = new NodeLocalWorkbenchServerStarter((handler) => {
      errorServer.handler = handler;
      return errorServer;
    }, () => runtimeDependencies({ run: runDependencies([], { throws: true }) }));
    const errorResult = await errorStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await errorServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
      assert.equal(response.statusCode, 422);
      assert.match(response.body, /runner-error/);
      assert.doesNotMatch(response.body, /full raw output|secret|\/repo/);
    } finally {
      await errorResult.stop?.();
    }
  });

  it('serves failure analysis unavailable, success, LLM failure, invalid JSON, oversized body, and one-assertion scope checks', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const analysisCalls: unknown[] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ analysis: analysisDependencies({ hasKey: false, analysisCalls }) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const unavailable = await fakeServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(unavailable.statusCode, 200);
      assert.match(unavailable.body, /analysis-unavailable|Analysis unavailable|OPENAI_API_KEY/);
      assert.equal(analysisCalls.length, 0);
      assert.doesNotMatch(unavailable.body, /secret|raw prompt|full model response|other failed output|\/repo/);

      assert.equal((await fakeServer.renderRawResponse('/api/failure-analysis', '{ nope')).statusCode, 400);
      assert.equal((await fakeServer.renderRawResponse('/api/failure-analysis', JSON.stringify(analysisPayload()) + 'x'.repeat(70 * 1024))).statusCode, 400);
      assert.equal((await fakeServer.renderJsonResponse('/api/failure-analysis', { ...analysisPayload(), assertionIds: ['a1', 'a2'] })).statusCode, 400);
    } finally {
      await result.stop?.();
    }

    const successServer = new FakeLocalHttpServer(4321);
    const successCalls: unknown[] = [];
    const successStarter = new NodeLocalWorkbenchServerStarter((handler) => { successServer.handler = handler; return successServer; }, () => runtimeDependencies({ analysis: analysisDependencies({ model: 'override-model', analysisCalls: successCalls }) }));
    const successResult = await successStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await successServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /analysis-ready|override-model|prompt_issue/);
      assert.equal(successCalls.length, 1);
      assert.doesNotMatch(response.body, /secret|raw prompt|full model response|other failed output|proposal|approve|mutation|\/repo/);
    } finally {
      await successResult.stop?.();
    }

    const failureServer = new FakeLocalHttpServer(4321);
    const failureStarter = new NodeLocalWorkbenchServerStarter((handler) => { failureServer.handler = handler; return failureServer; }, () => runtimeDependencies({ analysis: analysisDependencies({ throws: true }) }));
    const failureResult = await failureStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await failureServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(response.statusCode, 502);
      assert.match(response.body, /llm-failure/);
      assert.doesNotMatch(response.body, /full model response|secret|raw prompt/);
    } finally {
      await failureResult.stop?.();
    }
  });

  it('serves repair proposal unavailable, success, rejection, LLM failure, invalid JSON, and active assertion scoping', async () => {
    const unavailableServer = new FakeLocalHttpServer(4321);
    const proposalCalls: unknown[] = [];
    const unavailableStarter = new NodeLocalWorkbenchServerStarter((handler) => { unavailableServer.handler = handler; return unavailableServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ hasKey: false, proposalCalls }) }));
    const unavailableResult = await unavailableStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await unavailableServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /proposal-unavailable|OPENAI_API_KEY/);
      assert.equal(proposalCalls.length, 0);
      assert.doesNotMatch(response.body, /secret|raw prompt|full model response|other failed output|\/repo/);
      assert.equal((await unavailableServer.renderRawResponse('/api/repair-proposals', '{ nope')).statusCode, 400);
      assert.equal((await unavailableServer.renderRawResponse('/api/repair-proposals', JSON.stringify(proposalPayload()) + 'x'.repeat(70 * 1024))).statusCode, 400);
      assert.equal((await unavailableServer.renderJsonResponse('/api/repair-proposals', { ...proposalPayload(), assertionIds: ['a1', 'a2'] })).statusCode, 400);
    } finally { await unavailableResult.stop?.(); }

    const successServer = new FakeLocalHttpServer(4321);
    const successCalls: unknown[] = [];
    const successStarter = new NodeLocalWorkbenchServerStarter((handler) => { successServer.handler = handler; return successServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ model: 'override-model', proposalCalls: successCalls }) }));
    const successResult = await successStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await successServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /proposal-ready|override-model|pending|prompts\/skill-authoring\.md/);
      assert.equal(successCalls.length, 1);
      assert.doesNotMatch(response.body, /OPENAI_API_KEY|secret|raw prompt|full model response|other failed output|\/repo/);
    } finally { await successResult.stop?.(); }

    const rejectedServer = new FakeLocalHttpServer(4321);
    const rejectedStarter = new NodeLocalWorkbenchServerStarter((handler) => { rejectedServer.handler = handler; return rejectedServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ summary: 'fix it' }) }));
    const rejectedResult = await rejectedStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try { assert.equal((await rejectedServer.renderJsonResponse('/api/repair-proposals', proposalPayload())).statusCode, 422); }
    finally { await rejectedResult.stop?.(); }

    const failureServer = new FakeLocalHttpServer(4321);
    const failureStarter = new NodeLocalWorkbenchServerStarter((handler) => { failureServer.handler = handler; return failureServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ throws: true }) }));
    const failureResult = await failureStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await failureServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 502);
      assert.match(response.body, /llm-failure/);
      assert.doesNotMatch(response.body, /full model response|secret|raw prompt/);
    } finally { await failureResult.stop?.(); }
  });

  it('maps approved repair apply endpoint invalid, missing approval, stale, blocked, and successful results', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const mutationCalls: unknown[] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => { fakeServer.handler = handler; return fakeServer; }, () => runtimeDependencies({ applyRepair: applyRepairDependencies({ mutationCalls }) }));
    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      assert.equal((await fakeServer.renderRawResponse('/api/repair-proposals/apply', '{ nope')).statusCode, 400);
      assert.equal((await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'repair_1' })).statusCode, 400);

      const missingApproval = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'repair_1', approvalMarker: 'not-approved' });
      assert.equal(missingApproval.statusCode, 422);
      assert.match(missingApproval.body, /missing-approval/);
      assert.equal(mutationCalls.length, 0);

      const stale = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'stale', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(stale.statusCode, 422);
      assert.match(stale.body, /stale-proposal/);
      assert.equal(mutationCalls.length, 0);

      const blocked = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'unsafe', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(blocked.statusCode, 422);
      assert.match(blocked.body, /unsafe-target/);
      assert.equal(mutationCalls.length, 0);

      const applied = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(applied.statusCode, 200);
      assert.match(applied.body, /applied|prompts\/skill-authoring\.md|changedFileCount|rerunRecommendation/);
      assert.match(applied.body, /Rerun this test case|Rerun full suite/);
      assert.equal(mutationCalls.length, 1);
      assert.doesNotMatch(applied.body, /secret|OPENAI_API_KEY|workflow health|old content|new content/);
    } finally { await result.stop?.(); }
  });

});

function readyDiscovery(): InternalEvalSuiteDiscoveryResult {
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

function blockedDiscovery(): InternalEvalSuiteDiscoveryResult {
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



function runDependencies(calls: string[][], options: { readonly throws?: boolean } = {}): RunLocalEvalSuiteDependencies {
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

class FakeLocalHttpServer {
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



function runtimeDependencies(overrides: { readonly run?: RunLocalEvalSuiteDependencies; readonly analysis?: AnalyzeFailedAssertionDependencies; readonly proposal?: DraftEvalRepairProposalDependencies; readonly applyRepair?: ApplyApprovedEvalRepairDependencies } = {}) {
  return { run: overrides.run ?? runDependencies([]), analysis: overrides.analysis ?? analysisDependencies(), proposal: overrides.proposal ?? proposalDependencies(), applyRepair: overrides.applyRepair ?? applyRepairDependencies() };
}

function applyRepairDependencies(options: { readonly mutationCalls?: unknown[] } = {}): ApplyApprovedEvalRepairDependencies {
  return {
    proposalReader: { getPendingProposal: (proposalId) => proposalId === 'stale' ? null : { proposalId, projectRoot: '/repo', affectedProjectFiles: [proposalId === 'unsafe' ? '../outside.md' : 'prompts/skill-authoring.md'], changeSummary: 'Add hard stop rule.', rationale: 'The active assertion skipped the rule.', expectedEvalImpact: 'The focused assertion should pass.', proposedChange: { kind: 'replacement', representation: 'new content' }, approvalState: 'pending', sourceFailureScope: { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', assertionId: 'a1' } } },
    safety: { validateTargets: async (_root, targets) => targets.some((target) => target.startsWith('..')) ? { status: 'blocked', reason: 'unsafe target', unsafePaths: targets } : { status: 'ok', safeTargets: targets } },
    workflowReadiness: { checkReadiness: async () => ({ status: 'ready' }) },
    mutator: { applyApprovedChange: async (request) => { options.mutationCalls?.push(request); return { status: 'applied', changedFiles: request.targetPaths.map((target) => ({ path: target })) }; } },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

function analysisPayload() {
  return { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1' };
}

function proposalPayload() {
  return { ...analysisPayload(), repairDirection: { type: 'prompt_issue' } };
}

function analysisDependencies(options: { readonly hasKey?: boolean; readonly model?: string; readonly throws?: boolean; readonly analysisCalls?: unknown[] } = {}): AnalyzeFailedAssertionDependencies {
  return {
    artifactReader: { getRunArtifact: () => failedArtifact() },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: options.model ?? 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'secret' }) },
    llm: { analyzeFailure: async (request) => { options.analysisCalls?.push(request); if (options.throws) throw new Error('full model response secret raw prompt'); return { exactFailureExplanation: 'The selected assertion failed.', likelyCause: 'prompt_issue', evidenceSummary: 'The output did not stop.', uncertainty: 'Low uncertainty.' }; } },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

function proposalDependencies(options: { readonly hasKey?: boolean; readonly model?: string; readonly throws?: boolean; readonly proposalCalls?: unknown[]; readonly targetFile?: string; readonly summary?: string } = {}): DraftEvalRepairProposalDependencies {
  return {
    artifactReader: { getRunArtifact: () => failedArtifact() },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: options.model ?? 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'secret' }) },
    projectFileReader: { readProjectFilePreviews: async () => ({ status: 'ok', files: [] }) },
    llm: { draftProposal: async (request) => { options.proposalCalls?.push(request); if (options.throws) throw new Error('full model response raw prompt secret'); return { affectedProjectFiles: [options.targetFile ?? 'prompts/skill-authoring.md'], changeSummary: options.summary ?? 'Require missing input hard stops before drafting.', rationale: 'The active assertion failed because the prompt skipped the stop rule.', expectedEvalImpact: 'The selected assertion should pass while preserving other checks.', proposedChange: { kind: 'instructions', representation: 'Add an explicit missing-input hard stop rule.' } }; } },
    proposalStore: { savePendingProposal: async (request) => ({ ...request.proposal, proposalId: 'repair_test', approvalState: 'pending', sourceFailureScope: { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', assertionId: 'a1' } }) },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

function failedArtifact(): StoredRunArtifact {
  return {
    suiteId: 'skill-authoring', modelId: 'gpt-5-mini', scope: 'all',
    matrix: { suiteId: 'skill-authoring', suiteName: 'Skill checks', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status: 'failed', cells: [{ testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini', modelLabel: 'GPT-5 mini', status: 'failed', outputPreview: 'short output', durationMs: 10, diagnostics: [], metrics: [], artifacts: [], assertions: [
      { id: 'a1', label: 'Must stop first', kind: 'assertion', status: 'failed', message: 'Failed active', expectedPreview: 'expected stop', actualPreview: 'active failed output', metrics: [], diagnostics: [], artifacts: [] },
      { id: 'a2', label: 'Other failure', kind: 'assertion', status: 'failed', message: 'Other failed', expectedPreview: 'expected other', actualPreview: 'other failed output', metrics: [], diagnostics: [], artifacts: [] },
    ] }] }] },
  };
}
