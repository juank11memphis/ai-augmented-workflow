import type { RepairProposalPreview } from '../draft-eval-repair-proposal/result.js';
import type { ApprovedRepairProposalReaderPort, PendingApprovedRepairProposal } from './ports.js';

export type PendingRepairProposalStore = {
  getPendingProposal(proposalId: string): RepairProposalPreview | undefined;
};

export class RepairProposalStoreReadinessAdapter implements ApprovedRepairProposalReaderPort {
  constructor(private readonly store: PendingRepairProposalStore) {}

  getPendingProposal(proposalId: string): PendingApprovedRepairProposal | null {
    const proposal = this.store.getPendingProposal(proposalId);
    if (!proposal) return null;
    const projectRoot = readProjectRoot(proposal);
    if (!projectRoot) return null;
    return { ...proposal, projectRoot };
  }
}

function readProjectRoot(proposal: RepairProposalPreview): string | null {
  const candidate = proposal as RepairProposalPreview & { readonly projectRoot?: unknown };
  return typeof candidate.projectRoot === 'string' && candidate.projectRoot.trim() ? candidate.projectRoot : null;
}
