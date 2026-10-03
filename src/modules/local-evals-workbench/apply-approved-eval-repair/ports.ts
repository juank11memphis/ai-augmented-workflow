import type { ProposedRepairChange, RepairProposalPreview } from '../repair-context/contracts.js';
import type { ApprovedRepairChangedFile } from './result.js';
import type { ProjectFileState } from '../repair-context/project-file-state.js';

export type PendingApprovedRepairProposal = RepairProposalPreview & {
  readonly projectRoot: string;
  readonly targetPrecondition: ProjectFileState;
};

export type ApprovedRepairProposalReaderPort = {
  getPendingProposal(proposalId: string): Promise<PendingApprovedRepairProposal | null> | PendingApprovedRepairProposal | null;
  claimPendingProposal(proposalId: string): boolean;
};

export type ProjectFileMutationSafetyPort = {
  validateTargets(projectRoot: string, targetPaths: readonly string[]): Promise<{ readonly status: 'ok'; readonly safeTargets: readonly string[] } | { readonly status: 'blocked'; readonly reason: string; readonly unsafePaths: readonly string[] }>;
};

export type ManagedWorkflowReadinessPort = {
  checkReadiness(projectRoot: string, targetPaths: readonly string[]): Promise<{ readonly status: 'ready' } | { readonly status: 'blocked'; readonly message: string; readonly guidance: readonly string[]; readonly affectedPaths: readonly string[] }>;
};

export type ApprovedProjectFileMutatorPort = {
  applyApprovedChange(request: {
    readonly projectRoot: string;
    readonly targetPaths: readonly string[];
    readonly approvedChange: ProposedRepairChange;
    readonly targetPrecondition: ProjectFileState;
  }): Promise<{ readonly status: 'applied'; readonly changedFiles: readonly ApprovedRepairChangedFile[] } | { readonly status: 'failed'; readonly reason: string; readonly changedFiles: readonly ApprovedRepairChangedFile[] }>;
};

export type ApplyApprovedRepairLogEvent =
  | { readonly event: 'approved_repair_requested' }
  | { readonly event: 'approved_repair_blocked'; readonly reason: string; readonly targetFileCount?: number; readonly durationMs: number }
  | { readonly event: 'approved_repair_applied'; readonly targetFileCount: number; readonly changedFileCount: number; readonly durationMs: number }
  | { readonly event: 'approved_repair_failed'; readonly reason: 'mutation-failure' | 'unexpected-mutation-result' | 'unexpected-port-failure'; readonly mutationState: 'not-attempted' | 'attempted-outcome-uncertain'; readonly targetFileCount: number; readonly changedFileCount: number; readonly durationMs: number };

export type ApplyApprovedRepairLoggerPort = {
  info(event: ApplyApprovedRepairLogEvent): void;
  warn(event: ApplyApprovedRepairLogEvent): void;
  error(event: ApplyApprovedRepairLogEvent): void;
};
