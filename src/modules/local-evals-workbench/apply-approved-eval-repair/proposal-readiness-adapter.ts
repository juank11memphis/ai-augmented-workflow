import type { StoredRepairProposal } from '../repair-context/contracts.js';
import type { ApprovedRepairProposalReaderPort, PendingApprovedRepairProposal } from './ports.js';

export type PendingRepairProposalStore = {
  getPendingProposal(proposalId: string): StoredRepairProposal | undefined;
  claimPendingProposal(proposalId: string): boolean;
};

export class RepairProposalStoreReadinessAdapter implements ApprovedRepairProposalReaderPort {
  constructor(private readonly store: PendingRepairProposalStore) {}

  getPendingProposal(proposalId: string): PendingApprovedRepairProposal | null {
    const proposal = this.store.getPendingProposal(proposalId);
    if (!proposal) return null;
    return proposal;
  }
  claimPendingProposal(proposalId: string): boolean { return this.store.claimPendingProposal(proposalId); }
}
