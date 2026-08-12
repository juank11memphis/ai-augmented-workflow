import { createHash } from 'node:crypto';
import type { RepairProposalStorePort } from './ports.js';
import type { RepairProposalPreview } from './result.js';

export class InMemoryRepairProposalStore implements RepairProposalStorePort {
  private readonly proposals = new Map<string, RepairProposalPreview>();

  async savePendingProposal(request: Parameters<RepairProposalStorePort['savePendingProposal']>[0]): Promise<RepairProposalPreview> {
    const proposalId = createProposalId(request);
    const proposal = { ...request.proposal, proposalId, projectRoot: request.projectRoot, approvalState: 'pending' as const };
    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  getPendingProposal(proposalId: string): RepairProposalPreview | undefined {
    return this.proposals.get(proposalId);
  }
}

function createProposalId(request: Parameters<RepairProposalStorePort['savePendingProposal']>[0]): string {
  return `repair_${createHash('sha256').update(JSON.stringify({ suiteId: request.suiteId, testCaseId: request.testCaseId, modelId: request.evalRunModelId, assertionId: request.assertionId, proposal: request.proposal })).digest('hex').slice(0, 16)}`;
}
