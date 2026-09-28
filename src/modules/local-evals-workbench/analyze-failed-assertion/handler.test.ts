import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeFailedAssertion, type AnalyzeFailedAssertionDependencies } from './handler.js';
import type { AnalyzeFailedAssertionCommand } from './command.js';
import type { SelectedFailureRead } from '../repair-context/selected-evidence.js';

const command: AnalyzeFailedAssertionCommand = { projectRoot: '/repo', suiteId: 'suite', runId: 'run-1',
  testCaseId: 'case-1', attempt: 2, evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: 'a1' };

const selected: SelectedFailureRead = { status: 'ready', value: {
  testedModel: 'model', judgeModel: null, repeats: 2, runScope: 'all',
  evidence: { suiteId: 'suite', runId: 'run-1', attempt: 2, testCaseId: 'case-1', evalRunModelId: 'model',
    evalRunModelLabel: 'model', assertionId: 'a1', assertionLabel: 'a1', assertionKind: 'assertion',
    assertionMessage: 'failed', actualOutputPreview: 'selected actual', expectedPreview: 'selected expected',
    cellOutputPreview: null, diagnostics: [], artifacts: [] },
} };

function dependencies(options: { selected?: SelectedFailureRead; hasKey?: boolean; calls?: unknown[]; events?: unknown[] } = {}): AnalyzeFailedAssertionDependencies {
  return {
    artifactReader: { read: async selection => { options.calls?.push(selection); return options.selected ?? selected; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: 'assist', apiKey: 'secret' }) },
    llm: { analyzeFailure: async request => { options.calls?.push(request); return { exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }; } },
    analysisStore: { save: () => 'analysis-1' },
    logger: { info: event => options.events?.push(event), warn: event => options.events?.push(event), error: event => options.events?.push(event) },
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
    assert.match(JSON.stringify(events), /run-1/);
    assert.match(JSON.stringify(events), /"attempt":2/);
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
});
