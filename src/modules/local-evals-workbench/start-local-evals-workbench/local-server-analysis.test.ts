import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { createWorkbenchDependencies } from '../workbench-composition.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/handler.js';
import type { InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';

const discovery: InternalEvalSuiteDiscoveryResult = { status: 'blocked', reason: 'missing-evals-folder', message: 'No suites.', guidance: [], suites: [], definitions: [], diagnostics: [] };
const selection = { suiteId: 'suite', runId: 'run', attempt: 2, testCaseId: 'case', evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: 'failed' };
const evidence = { suiteId: 'suite', runId: 'run', attempt: 2, testCaseId: 'case', evalRunModelId: 'model', evalRunModelLabel: 'model',
  assertionId: 'failed', assertionLabel: 'failed', assertionKind: 'assertion' as const, assertionMessage: 'failure',
  actualOutputPreview: 'selected actual', expectedPreview: 'selected expected', cellOutputPreview: null, diagnostics: [], artifacts: [] };

test('HTTP analysis adapts one saved selection and leaves evidence visible without credentials or on provider failure', async () => {
  let hasKey = true;
  let providerFails = false;
  const calls: unknown[] = [];
  const analysis: AnalyzeFailedAssertionDependencies = {
    artifactReader: { read: async selected => { calls.push(selected); return { status: 'ready', value: { testedModel: 'model', judgeModel: null, repeats: 2, runScope: 'all', evidence } }; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: hasKey, assistanceModelLabel: 'assist', apiKey: hasKey ? 'private-key' : undefined }) },
    llm: { analyzeFailure: async request => { calls.push(request); if (providerFails) throw new Error('private response');
      return { exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }; } },
    analysisStore: { save: () => 'analysis-1' },
    logger: { info() {}, warn() {}, error() {} },
  };
  const starter = new NodeLocalWorkbenchServerStarter(undefined, request => ({ ...createWorkbenchDependencies(request), analysis }));
  const server = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery });
  const post = async (body: unknown) => {
    const response = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { code: response.status, text: await response.text() };
  };
  try {
    const ready = await post(selection);
    assert.equal(ready.code, 200);
    assert.match(ready.text, /analysis-ready|selected actual/);
    assert.doesNotMatch(ready.text, /private-key/);
    assert.equal(calls.length, 2);
    const invalid = await post({ ...selection, assertionIds: ['failed', 'other'] });
    assert.equal(invalid.code, 400);
    assert.equal(calls.length, 2);
    hasKey = false;
    const unavailable = await post(selection);
    assert.equal(unavailable.code, 200);
    assert.match(unavailable.text, /analysis-unavailable|selected actual/);
    assert.equal(calls.length, 3);
    hasKey = true;
    providerFails = true;
    const failure = await post(selection);
    assert.equal(failure.code, 502);
    assert.match(failure.text, /selected actual/);
    assert.doesNotMatch(failure.text, /private response|private-key/);
  } finally {
    await server.stop?.();
  }
});
