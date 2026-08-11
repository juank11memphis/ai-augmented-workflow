import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFailedAssertionAnalysisPrompt } from './prompt-builder.js';
import type { FailedAssertionEvidence } from './evidence.js';

describe('buildFailedAssertionAnalysisPrompt', () => {
  it('includes required active assertion evidence and output fields', () => {
    const prompt = buildFailedAssertionAnalysisPrompt(evidence());
    assert.match(prompt, /exactFailureExplanation/);
    assert.match(prompt, /likelyCause/);
    assert.match(prompt, /evidenceSummary/);
    assert.match(prompt, /uncertainty/);
    assert.match(prompt, /Must stop first/);
    assert.match(prompt, /bad active output/);
  });

  it('excludes unrelated failed assertion evidence', () => {
    const prompt = buildFailedAssertionAnalysisPrompt(evidence());
    assert.doesNotMatch(prompt, /other failed output|other assertion/);
  });
});

function evidence(): FailedAssertionEvidence {
  return {
    suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'GPT-5 mini', assertionId: 'a1', assertionLabel: 'Must stop first', assertionKind: 'assertion', assertionMessage: 'Failed because output continued.', actualOutputPreview: 'bad active output', expectedPreview: 'stop until inputs exist', cellOutputPreview: 'cell output', diagnostics: [{ code: 'assertion-failed', severity: 'error', message: 'failed', location: 'evals/suite.json' }], artifacts: []
  };
}
