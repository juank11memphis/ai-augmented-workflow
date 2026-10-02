import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateRepairProposalDraft } from './proposal-validation.js';

const draft = { affectedProjectFiles: ['prompts/a.md'], changeSummary: 'Add a concrete hard stop rule.', rationale: 'The active assertion failed because the prompt continued.', expectedEvalImpact: 'The selected failed assertion should pass.', proposedChange: { kind: 'replacement' as const, representation: 'Insert the hard stop rule near the top.' } };

describe('validateRepairProposalDraft', () => {
  it('accepts concrete non-evals proposals and rejects vague or unsafe proposals', () => {
    assert.equal(validateRepairProposalDraft('/repo', draft).status, 'ok');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, affectedProjectFiles: ['.env'] }).status, 'rejected');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, expectedEvalImpact: 'unknown' }).status, 'rejected');
    assert.equal(validateRepairProposalDraft('/repo', { ...draft, affectedProjectFiles: [] }).status, 'rejected');
  });

  it('keeps unsafe targets distinct from vague or instructions-only proposals', () => {
    for (const targets of [['../PRIVATE_TARGET'], ['/tmp/PRIVATE_TARGET'], ['.env'], ['prompts/a.md', 'other.md'], []]) {
      const result = validateRepairProposalDraft('/repo', { ...draft, affectedProjectFiles: targets });
      assert.equal(result.status, 'rejected');
      if (result.status === 'rejected') {
        assert.equal(result.reason, 'unsafe-target-files');
        assert.doesNotMatch(result.message, /PRIVATE_TARGET/);
      }
    }
    for (const candidate of [
      { ...draft, proposedChange: { kind: 'instructions' as const, representation: 'Please edit this file.' } },
      { ...draft, changeSummary: 'fix it' },
      { ...draft, proposedChange: { kind: 'replacement' as const, representation: 'unknown' } },
      { ...draft, expectedEvalImpact: 'x'.repeat(2001) },
      { ...draft, proposedChange: { kind: 'replacement' as const, representation: 'x'.repeat(32 * 1024 + 1) } },
    ]) {
      const result = validateRepairProposalDraft('/repo', candidate);
      assert.equal(result.status, 'rejected');
      if (result.status === 'rejected') assert.equal(result.reason, 'vague-proposal');
    }
  });
});
