import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeFailedAssertion, type AnalyzeFailedAssertionDependencies } from './handler.js';
import type { AnalyzeFailedAssertionCommand } from './command.js';
import type { SelectedFailureRead } from '../repair-context/selected-evidence.js';
import { FailureAnalysisProviderError, type FailureAnalysisProviderCategory } from './ports.js';

const command: AnalyzeFailedAssertionCommand = { projectRoot: '/repo', suiteId: 'suite', runId: 'run-1',
  testCaseId: 'case-1', attempt: 2, evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: 'a1' };

const selected: SelectedFailureRead = { status: 'ready', value: {
  testedModel: 'model', judgeModel: null, runScope: 'all',
  evidence: { suiteId: 'suite', runId: 'run-1', attempt: 2, testCaseId: 'case-1', evalRunModelId: 'model',
    evalRunModelLabel: 'model', assertionId: 'a1', assertionLabel: 'a1', assertionKind: 'assertion',
    assertionMessage: 'failed', actualOutputPreview: 'selected actual', expectedPreview: 'selected expected',
    cellOutputPreview: null, diagnostics: [], artifacts: [] },
} };

function dependencies(options: { selected?: SelectedFailureRead; hasKey?: boolean; calls?: unknown[]; events?: unknown[]; failure?: unknown; throwOnLog?: boolean } = {}): AnalyzeFailedAssertionDependencies {
  return {
    artifactReader: { read: async selection => { options.calls?.push(selection); return options.selected ?? selected; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: 'assist', apiKey: 'secret' }) },
    llm: { analyzeFailure: async request => { options.calls?.push(request); if (options.failure) throw options.failure; return { exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }; } },
    analysisStore: { save: () => 'analysis-1' },
    logger: { info: event => { options.events?.push(event); if (options.throwOnLog) throw Error('sink failed'); }, warn: event => { options.events?.push(event); if (options.throwOnLog) throw Error('sink failed'); }, error: event => { options.events?.push(event); if (options.throwOnLog) throw Error('sink failed'); } },
  };
}

describe('analyzeFailedAssertion', () => {
  it('analyzes exactly the selected run, attempt and assertion', async () => {
    const calls: unknown[] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ calls }));
    assert.equal(result.status, 'analysis-ready');
    assert.deepEqual(calls[0], command);
    assert.match(JSON.stringify(calls[1]), /selected actual/);
    assert.doesNotMatch(JSON.stringify(calls[1]), /other attempt/);
  });
  it('emits one safe start and one completed analysis event', async () => {
    const events: unknown[] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ events }));
    assert.equal(result.status, 'analysis-ready');
    assert.deepEqual(events[0], { event: 'failure_analysis_requested', stage: 'analysis', outcome: 'started' });
    assert.deepEqual(events[1], { event: 'failure_analysis_finished', stage: 'analysis', outcome: 'completed', reason: 'analysis-ready', durationMs: (events[1] as { durationMs: number }).durationMs });
    assert.equal(events.length, 2);
    assert.doesNotMatch(JSON.stringify(events), /selected actual|selected expected|secret|assist|run-1/);
  });
  it('blocks missing, mismatched, passed and invalid selections before assistance', async () => {
    for (const reason of ['missing-run', 'missing-evidence', 'mismatched-evidence', 'non-failed-assertion'] as const) {
      const calls: unknown[] = [];
      const result = await analyzeFailedAssertion(command, dependencies({ selected: { status: 'blocked', reason }, calls }));
      assert.equal(result.status, 'blocked');
      assert.equal(calls.length, 1);
    }
    assert.equal((await analyzeFailedAssertion({ ...command, attempt: 0 }, dependencies())).status, 'blocked');
    assert.equal((await analyzeFailedAssertion({ ...command, evalRunModelId: 'other' }, dependencies())).status, 'blocked');
  });
  it('keeps unavailable assistance inspectable and logs no evidence', async () => {
    const calls: unknown[] = [], events: unknown[] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ hasKey: false, calls, events }));
    assert.equal(result.status, 'analysis-unavailable');
    assert.equal(calls.length, 1);
    assert.doesNotMatch(JSON.stringify(events), /selected actual|secret/);
    assert.deepEqual(events.map(event => (event as { outcome: string }).outcome), ['started', 'blocked']);
    assert.deepEqual(events[1], { event: 'failure_analysis_finished', stage: 'analysis', outcome: 'blocked', reason: 'missing-openai-api-key', durationMs: (events[1] as { durationMs: number }).durationMs });
  });
  it('rejects a mismatched ready payload before calling assistance or saving', async () => {
    if (selected.status !== 'ready') throw new Error('Invalid fixture');
    for (const mismatch of [
      { runId: 'other-run' }, { attempt: 1 }, { suiteId: 'other-suite' },
      { testCaseId: 'other-case' }, { assertionId: 'other-assertion' }, { evalRunModelId: 'other-model' },
    ]) {
      const calls: unknown[] = [];
      const result = await analyzeFailedAssertion(command, dependencies({ calls, selected: {
        status: 'ready', value: { ...selected.value, evidence: { ...selected.value.evidence, ...mismatch } },
      } }));
      assert.equal(result.status, 'blocked');
      assert.equal(calls.length, 1);
    }
  });
  it('returns safe recoverable evidence when the reader or provider fails', async () => {
    const readerFailure = { ...dependencies(), artifactReader: { read: async () => { throw new Error('secret reader details'); } } };
    assert.equal((await analyzeFailedAssertion(command, readerFailure)).status, 'blocked');
    const providerFailure = { ...dependencies(), llm: { analyzeFailure: async () => { throw new Error('secret provider details'); } } };
    const result = await analyzeFailedAssertion(command, providerFailure);
    assert.equal(result.status, 'error');
    assert.doesNotMatch(JSON.stringify(result), /secret provider/);
    assert.match(JSON.stringify(result), /selected actual/);
  });
  it('preserves every typed provider category as a distinct safe Result reason', async () => {
    const cases: readonly [FailureAnalysisProviderCategory, string][] = [
      ['authorization', 'provider-authorization'], ['rate-limit', 'provider-rate-limit'],
      ['timeout', 'provider-timeout'], ['unavailable', 'provider-unavailable'],
      ['invalid-response', 'invalid-llm-response'], ['unknown', 'unknown'],
    ];
    for (const [category, reason] of cases) {
      const events: unknown[] = [];
      const result = await analyzeFailedAssertion(command, dependencies({ failure: new FailureAnalysisProviderError(category), events }));
      assert.equal(result.status, 'error');
      if (result.status !== 'error') continue;
      assert.equal(result.reason, reason);
      assert.equal(result.evidence, selected.status === 'ready' ? selected.value.evidence : undefined);
      assert.deepEqual(events.map(event => (event as { outcome: string }).outcome), ['started', 'failed']);
      assert.deepEqual(events[0], { event: 'failure_analysis_requested', stage: 'analysis', outcome: 'started' });
      assert.deepEqual(events[1], { event: 'failure_analysis_finished', stage: 'analysis', outcome: 'failed', reason, durationMs: (events[1] as { durationMs: number }).durationMs });
    }
  });
  it('maps untyped failure to unknown and never emits synthetic key or evidence markers', async () => {
    const events: unknown[] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ failure: Error('SECRET_KEY_MARKER raw provider body'), events }));
    assert.equal(result.status, 'error');
    if (result.status !== 'error') return;
    assert.equal(result.reason, 'unknown');
    assert.doesNotMatch(JSON.stringify(events), /SECRET_KEY_MARKER|selected actual|selected expected|assist|run-1|provider body/);
    assert.equal(result.evidence, selected.status === 'ready' ? selected.value.evidence : undefined);
  });
  it('keeps ready and failed results unchanged when the logging sink throws', async () => {
    const ready = await analyzeFailedAssertion(command, dependencies({ throwOnLog: true }));
    assert.equal(ready.status, 'analysis-ready');
    const failed = await analyzeFailedAssertion(command, dependencies({ throwOnLog: true, failure: new FailureAnalysisProviderError('timeout') }));
    assert.equal(failed.status, 'error');
    if (failed.status === 'error') assert.equal(failed.reason, 'provider-timeout');
  });
});
