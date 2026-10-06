import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryRepairProposalStore } from './proposal-store.js';

const request = {
  projectRoot: '/repo', suiteId: 'suite', runId: 'run-one', testCaseId: 'case', attempt: 2,
  evalRunModelId: 'model', judgeModel: null, assertionId: 'a2',
  targetPrecondition: { status: 'present' as const, path: 'prompts/agent.md', digest: 'digest', content: 'before', preview: 'before' },
  proposal: { affectedProjectFiles: ['prompts/agent.md'], changeSummary: 'Require verification before action.',
    rationale: 'The selected failed check missed verification.', expectedEvalImpact: 'The focused case should verify first.',
    proposedChange: { kind: 'replacement' as const, representation: 'Verify first.' } },
};

describe('InMemoryRepairProposalStore', () => {
  it('keeps source identity and file precondition private and session scoped', async () => {
    const store = new InMemoryRepairProposalStore();
    const preview = await store.savePendingProposal(request);
    assert.equal(preview.sourceFailureScope?.runId, 'run-one');
    assert.equal(preview.sourceFailureScope?.attempt, 2);
    assert.doesNotMatch(JSON.stringify(preview), /"digest":|"content":|"projectRoot":/);
    const pending = store.getPendingProposal(preview.proposalId);
    assert.deepEqual(pending?.targetPrecondition, request.targetPrecondition);
    assert.equal(new InMemoryRepairProposalStore().getPendingProposal(preview.proposalId), undefined);
  });
  it('claims each proposal once even when the same change is drafted twice', async () => {
    const store = new InMemoryRepairProposalStore();
    const first = await store.savePendingProposal(request);
    const second = await store.savePendingProposal(request);
    assert.notEqual(first.proposalId, second.proposalId);
    assert.equal(store.claimPendingProposal(first.proposalId), true);
    assert.equal(store.claimPendingProposal(first.proposalId), false);
    assert.equal(store.getPendingProposal(first.proposalId), undefined);
    assert.ok(store.getPendingProposal(second.proposalId));
  });
});
