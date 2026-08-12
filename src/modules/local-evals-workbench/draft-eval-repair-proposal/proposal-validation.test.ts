import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateRepairProposalDraft } from './proposal-validation.js';

const draft = { affectedProjectFiles: ['prompts/a.md'], changeSummary: 'Add a concrete hard stop rule.', rationale: 'The active assertion failed because the prompt continued.', expectedEvalImpact: 'The selected failed assertion should pass.', proposedChange: { kind: 'instructions' as const, representation: 'Insert the hard stop rule near the top.' } };

describe('validateRepairProposalDraft', () => {
  it('accepts concrete non-evals proposals and rejects vague or unsafe proposals', () => {
    assert.equal(validateRepairProposalDraft('/repo', draft).status, 'ok');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, affectedProjectFiles: ['.env'] }).status, 'rejected');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, expectedEvalImpact: 'unknown' }).status, 'rejected');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, affectedProjectFiles: [] }).status, 'rejected');
  });
});
