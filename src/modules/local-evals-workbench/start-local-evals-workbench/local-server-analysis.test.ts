import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { createWorkbenchDependencies } from '../workbench-composition.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/handler.js';
import { FailureAnalysisProviderError, type FailureAnalysisProviderCategory } from '../analyze-failed-assertion/ports.js';
import type { LocalEvalsWorkbenchLogEvent } from './ports.js';
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
  const events: LocalEvalsWorkbenchLogEvent[] = [];
  let sinkFails = false;
  const analysis: AnalyzeFailedAssertionDependencies = {
    artifactReader: { read: async selected => { calls.push(selected); return { status: 'ready', value: { testedModel: 'model', judgeModel: null, runScope: 'all', evidence } }; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: hasKey, assistanceModelLabel: 'assist', apiKey: hasKey ? 'private-key' : undefined }) },
    llm: { analyzeFailure: async request => { calls.push(request); if (providerFails) throw new Error('private response');
      return { exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }; } },
    analysisStore: { save: () => 'analysis-1' },
    logger: { info() {}, warn() {}, error() {} },
  };
  const record = (event: LocalEvalsWorkbenchLogEvent) => { events.push(event); if (sinkFails) throw Error('sk-secret sink'); };
  const starter = new NodeLocalWorkbenchServerStarter(undefined, request => ({ ...createWorkbenchDependencies(request), analysis }),
    { info: record, warn: record, error: record });
  const server = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery });
  const post = async (body: unknown, reference?: string) => {
    const response = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST',
      headers: { 'content-type': 'application/json', ...(reference ? { 'x-sibu-request-reference': reference } : {}) }, body: JSON.stringify(body) });
    return { code: response.status, text: await response.text(), reference: response.headers.get('x-sibu-request-reference') };
  };
  try {
    const acceptedReference = '123e4567-e89b-42d3-a456-426614174000';
    const ready = await post(selection, acceptedReference.toUpperCase());
    assert.equal(ready.code, 200);
    assert.equal(ready.reference, acceptedReference);
    assert.equal(JSON.parse(ready.text).reference, acceptedReference);
    assert.deepEqual(events.map(event => event.event), ['failure_analysis_requested', 'failure_analysis_finished']);
    assert.deepEqual(events.map(event => 'reference' in event ? event.reference : undefined), [acceptedReference, acceptedReference]);
    assert.equal((events[1] as { outcome: string }).outcome, 'completed');
    assert.match(ready.text, /analysis-ready|selected actual/);
    assert.doesNotMatch(ready.text, /private-key/);
    assert.equal(calls.length, 2);
    const invalid = await post({ ...selection, assertionIds: ['failed', 'other'] });
    assert.equal(invalid.code, 400);
    assert.equal(JSON.parse(invalid.text).issue.category, 'invalid-request');
    assert.equal(events.at(-1)?.event, 'local_evals_workbench_analysis_boundary_issue');
    assert.equal(calls.length, 2);
    hasKey = false;
    const unavailable = await post(selection);
    assert.equal(unavailable.code, 200);
    assert.match(unavailable.text, /analysis-unavailable|selected actual/);
    assert.equal(calls.length, 3);
    assert.equal(JSON.parse(unavailable.text).issue.category, 'missing-openai-api-key');
    hasKey = true;
    providerFails = true;
    const failure = await post(selection);
    assert.equal(failure.code, 502);
    assert.match(failure.text, /selected actual/);
    assert.doesNotMatch(failure.text, /private response|private-key/);
    assert.equal(JSON.parse(failure.text).issue.category, 'unknown');
    const previousEventCount = events.length;
    sinkFails = true;
    const withFailedSink = await post(selection, 'sk-secret invalid-ref');
    assert.equal(withFailedSink.code, 502);
    assert.match(withFailedSink.reference ?? '', /^[a-f0-9-]{36}$/);
    assert.equal(JSON.parse(withFailedSink.text).issue.reference, withFailedSink.reference);
    assert.deepEqual(events.slice(previousEventCount).map(event => event.event), ['failure_analysis_requested', 'failure_analysis_finished']);
    assert.doesNotMatch(JSON.stringify(events), /private-key|private response|selected actual|selected expected|sk-secret/);
  } finally {
    await server.stop?.();
  }
});

test('HTTP analysis exposes observed provider categories without inferring from runner text', async () => {
  let failure: unknown;
  const events: LocalEvalsWorkbenchLogEvent[] = [];
  const analysis: AnalyzeFailedAssertionDependencies = {
    artifactReader: { read: async () => ({ status: 'ready', value: { testedModel: 'model', judgeModel: null, runScope: 'all', evidence } }) },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: true, assistanceModelLabel: 'assist', apiKey: 'sk-secret' }) },
    llm: { analyzeFailure: async () => { throw failure; } },
    analysisStore: { save: () => 'analysis-1' }, logger: { info() {}, warn() {}, error() {} },
  };
  const record = (event: LocalEvalsWorkbenchLogEvent) => events.push(event);
  const starter = new NodeLocalWorkbenchServerStarter(undefined, request => ({ ...createWorkbenchDependencies(request), analysis }),
    { info: record, warn: record, error: record });
  const server = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery });
  try {
    for (const [category, reason] of [
      ['authorization', 'provider-authorization'], ['rate-limit', 'provider-rate-limit'],
      ['timeout', 'provider-timeout'], ['unavailable', 'provider-unavailable'],
      ['invalid-response', 'invalid-llm-response'], ['unknown', 'unknown'],
    ] as const satisfies readonly (readonly [FailureAnalysisProviderCategory, string])[]) {
      failure = new FailureAnalysisProviderError(category);
      const before = events.length;
      const response = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST', body: JSON.stringify(selection) });
      const payload = await response.json() as { issue: { category: string; stage: string; reference: string } };
      assert.equal(response.status, 502);
      assert.equal(payload.issue.category, reason);
      assert.equal(payload.issue.stage, 'analysis');
      assert.equal(payload.issue.reference, response.headers.get('x-sibu-request-reference'));
      const operationEvents = events.slice(before);
      assert.deepEqual(operationEvents.map(event => event.event), ['failure_analysis_requested', 'failure_analysis_finished']);
      assert.deepEqual(operationEvents.map(event => 'reference' in event ? event.reference : undefined),
        [payload.issue.reference, payload.issue.reference]);
      assert.deepEqual(operationEvents.map(event => 'outcome' in event ? event.outcome : undefined), ['started', 'failed']);
      assert.equal((operationEvents[1] as { reason: string }).reason, reason);
    }
    failure = Error('runner exited; provider authorization unknown; sk-secret');
    const response = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST', body: JSON.stringify(selection) });
    assert.equal((await response.json() as { issue: { category: string } }).issue.category, 'unknown');
    assert.doesNotMatch(JSON.stringify(events), /sk-secret|runner exited|selected actual|private/);
  } finally { await server.stop?.(); }
});

test('malformed input and unexpected pre-handler failure report only analysis boundaries', async () => {
  const events: LocalEvalsWorkbenchLogEvent[] = [];
  let configFails = false;
  const analysis: AnalyzeFailedAssertionDependencies = {
    artifactReader: { read: async () => ({ status: 'ready', value: { testedModel: 'model', judgeModel: null, runScope: 'all', evidence } }) },
    assistanceConfig: { getConfig: () => { if (configFails) throw Error('sk-secret private provider body');
      return { hasOpenAiApiKey: true, assistanceModelLabel: 'assist' }; } },
    llm: { analyzeFailure: async () => { throw Error('should not call provider'); } },
    analysisStore: { save: () => 'analysis-1' }, logger: { info() {}, warn() {}, error() {} },
  };
  const record = (event: LocalEvalsWorkbenchLogEvent) => events.push(event);
  const starter = new NodeLocalWorkbenchServerStarter(undefined, request => ({ ...createWorkbenchDependencies(request), analysis }),
    { info: record, warn: record, error: record });
  const server = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery });
  try {
    const reference = '123e4567-e89b-42d3-a456-426614174000';
    const malformed = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST',
      headers: { 'x-sibu-request-reference': reference }, body: '{sk-secret private project content' });
    const malformedIssue = (await malformed.json() as { issue: { category: string; reference: string } }).issue;
    assert.equal(malformed.status, 400);
    assert.equal(malformedIssue.category, 'invalid-request');
    assert.equal(malformedIssue.reference, reference);
    assert.deepEqual(events.map(event => event.event), ['local_evals_workbench_analysis_boundary_issue']);
    configFails = true;
    const unexpected = await fetch(new URL('/api/failure-analysis', server.url), { method: 'POST', body: JSON.stringify(selection) });
    const unexpectedIssue = (await unexpected.json() as { issue: { category: string; stage: string; reference: string } }).issue;
    assert.equal(unexpected.status, 500);
    assert.equal(unexpectedIssue.category, 'unknown');
    assert.equal(unexpectedIssue.stage, 'analysis');
    assert.equal(unexpectedIssue.reference, unexpected.headers.get('x-sibu-request-reference'));
    assert.deepEqual(events.map(event => event.event), [
      'local_evals_workbench_analysis_boundary_issue', 'local_evals_workbench_analysis_boundary_issue',
    ]);
    assert.doesNotMatch(JSON.stringify([malformedIssue, unexpectedIssue, events]), /sk-secret|private|provider-body|project content/);
  } finally { await server.stop?.(); }
});
