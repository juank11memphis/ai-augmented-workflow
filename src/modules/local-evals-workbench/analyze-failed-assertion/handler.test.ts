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
  });
});
