import { randomUUID } from 'node:crypto';
import type { RepairProposalStorePort } from './ports.js';
import type { RepairProposalPreview } from './result.js';
import type { StoredRepairProposal } from './ports.js';

export class InMemoryRepairProposalStore implements RepairProposalStorePort {
  private readonly proposals = new Map<string, StoredRepairProposal>();
  private readonly consumed = new Set<string>();

  async savePendingProposal(request: Parameters<RepairProposalStorePort['savePendingProposal']>[0]): Promise<RepairProposalPreview> {
    const proposalId = `repair_${randomUUID()}`;
    const proposal: StoredRepairProposal = {
      ...request.proposal,
      proposalId,
      projectRoot: request.projectRoot,
      targetPrecondition: request.targetPrecondition,
      approvalState: 'pending' as const,
      sourceFailureScope: {
        suiteId: request.suiteId,
        runId: request.runId,
        testCaseId: request.testCaseId,
        attempt: request.attempt,
        evalRunModelId: request.evalRunModelId,
        judgeModel: request.judgeModel,
        repeats: request.repeats,
        assertionId: request.assertionId,
      },
    };
    this.proposals.set(proposalId, proposal);
    const { projectRoot: _root, targetPrecondition: _state, ...preview } = proposal;
    return preview;
  }

  getPendingProposal(proposalId: string): StoredRepairProposal | undefined {
    return this.consumed.has(proposalId) ? undefined : this.proposals.get(proposalId);
  }

  claimPendingProposal(proposalId: string): boolean {
    if (!this.proposals.has(proposalId) || this.consumed.has(proposalId)) return false;
    this.consumed.add(proposalId);
    return true;
  }
}
