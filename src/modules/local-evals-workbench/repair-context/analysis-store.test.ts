import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryFailureAnalysisStore } from './analysis-store.js';

test('analysis is session-scoped and bound to the full saved selection', () => {
  const store = new InMemoryFailureAnalysisStore();
  const selection = { suiteId: 'suite', runId: 'run', testCaseId: 'case', attempt: 2, assertionId: 'failed' };
  const analysis = { exactFailureExplanation: 'failed', likelyCause: 'prompt_issue' as const, evidenceSummary: 'one check', uncertainty: 'low' };
  const id = store.save(selection, analysis);
  assert.deepEqual(store.get(id, selection), analysis);
  for (const field of Object.keys(selection) as (keyof typeof selection)[]) {
    assert.equal(store.get(id, { ...selection, [field]: field === 'attempt' ? 1 : 'other' }), null);
  }
  assert.equal(new InMemoryFailureAnalysisStore().get(id, selection), null);
});
