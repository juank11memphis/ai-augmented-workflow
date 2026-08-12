import type { ProposedRepairChange, RepairProposalPreview } from '../draft-eval-repair-proposal/result.js';
import type { ApprovedRepairChangedFile } from './result.js';

export type PendingApprovedRepairProposal = RepairProposalPreview & {
  readonly projectRoot: string;
};

export type ApprovedRepairProposalReaderPort = {
  getPendingProposal(proposalId: string): Promise<PendingApprovedRepairProposal | null> | PendingApprovedRepairProposal | null;
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
  }): Promise<{ readonly status: 'applied'; readonly changedFiles: readonly ApprovedRepairChangedFile[] } | { readonly status: 'failed'; readonly reason: string }>;
};

export type ApplyApprovedRepairLogEvent =
  | { readonly event: 'approved_repair_requested'; readonly proposalId: string }
  | { readonly event: 'approved_repair_blocked'; readonly proposalId?: string; readonly reason: string; readonly targetFileCount?: number; readonly safeTargetPaths?: readonly string[]; readonly durationMs: number }
  | { readonly event: 'approved_repair_applied'; readonly proposalId: string; readonly targetFileCount: number; readonly changedFileCount: number; readonly safeTargetPaths: readonly string[]; readonly durationMs: number }
  | { readonly event: 'approved_repair_failed'; readonly proposalId: string; readonly reason: string; readonly targetFileCount: number; readonly safeTargetPaths: readonly string[]; readonly durationMs: number };

export type ApplyApprovedRepairLoggerPort = {
  info(event: ApplyApprovedRepairLogEvent): void;
  warn(event: ApplyApprovedRepairLogEvent): void;
  error(event: ApplyApprovedRepairLogEvent): void;
};
