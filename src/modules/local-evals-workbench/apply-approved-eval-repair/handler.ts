import path from 'node:path';

import { APPLY_APPROVED_REPAIR_MARKER } from './command.js';
import type { ApplyApprovedEvalRepairCommand } from './command.js';
import type { ApplyApprovedRepairLoggerPort, ApprovedProjectFileMutatorPort, ApprovedRepairProposalReaderPort, ManagedWorkflowReadinessPort, ProjectFileMutationSafetyPort } from './ports.js';
import type { ApplyApprovedEvalRepairResult, ApprovedRepairBlockedReason } from './result.js';

export type ApplyApprovedEvalRepairDependencies = {
  readonly proposalReader: ApprovedRepairProposalReaderPort;
  readonly safety: ProjectFileMutationSafetyPort;
  readonly workflowReadiness: ManagedWorkflowReadinessPort;
  readonly mutator: ApprovedProjectFileMutatorPort;
  readonly logger: ApplyApprovedRepairLoggerPort;
  readonly clock?: () => number;
};

export async function applyApprovedEvalRepair(command: ApplyApprovedEvalRepairCommand, dependencies: ApplyApprovedEvalRepairDependencies): Promise<ApplyApprovedEvalRepairResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const proposalId = command.proposalId.trim();
  dependencies.logger.info({ event: 'approved_repair_requested', proposalId });

  if (!proposalId || !command.projectRoot.trim()) return block('invalid-request', 'Proposal id and project root are required.', dependencies, startedAt, proposalId || undefined);
  if (command.approvalMarker !== APPLY_APPROVED_REPAIR_MARKER) return block('missing-approval', 'Explicit approval is required before Sibu can change project files.', dependencies, startedAt, proposalId);

  const proposal = await dependencies.proposalReader.getPendingProposal(proposalId);
  if (!proposal) return block('stale-proposal', 'The repair proposal is unavailable or stale. Draft a fresh proposal before approving.', dependencies, startedAt, proposalId);
  if (proposal.approvalState !== 'pending') return block('stale-proposal', 'Only pending repair proposals can be approved.', dependencies, startedAt, proposalId);
  if (!sameRoot(command.projectRoot, proposal.projectRoot)) return block('wrong-project-root', 'The repair proposal was drafted for a different project root.', dependencies, startedAt, proposalId);

  const safety = await dependencies.safety.validateTargets(command.projectRoot, proposal.affectedProjectFiles);
  if (safety.status === 'blocked') return block('unsafe-target', safety.reason, dependencies, startedAt, proposalId, proposal.affectedProjectFiles.length, safety.unsafePaths);

  const readiness = await dependencies.workflowReadiness.checkReadiness(command.projectRoot, safety.safeTargets);
  if (readiness.status === 'blocked') return block('unsafe-workflow-readiness', readiness.message, dependencies, startedAt, proposalId, safety.safeTargets.length, readiness.affectedPaths, readiness.guidance);

  const mutation = await dependencies.mutator.applyApprovedChange({ projectRoot: command.projectRoot, targetPaths: safety.safeTargets, approvedChange: proposal.proposedChange });
  if (mutation.status === 'failed') {
    dependencies.logger.error({ event: 'approved_repair_failed', proposalId, reason: mutation.reason, targetFileCount: safety.safeTargets.length, safeTargetPaths: safety.safeTargets, durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'mutation-failure', proposalId, message: 'The approved change could not be applied. No additional repair action was taken.' };
  }

  dependencies.logger.info({ event: 'approved_repair_applied', proposalId, targetFileCount: safety.safeTargets.length, changedFileCount: mutation.changedFiles.length, safeTargetPaths: mutation.changedFiles.map((file) => file.path), durationMs: elapsed(startedAt, dependencies) });
  return { status: 'applied', proposalId, changedFiles: mutation.changedFiles, message: 'Proposal applied. Review the changed files before rerunning evals.', rerunRecommendation: 'Rerun the focused eval test case first, then the suite if needed.' };
}

function block(reason: Exclude<ApprovedRepairBlockedReason, 'mutation-failure'>, message: string, dependencies: ApplyApprovedEvalRepairDependencies, startedAt: number, proposalId?: string, targetFileCount?: number, unsafePaths?: readonly string[], guidance?: readonly string[]): ApplyApprovedEvalRepairResult {
  dependencies.logger.warn({ event: 'approved_repair_blocked', proposalId, reason, targetFileCount, safeTargetPaths: unsafePaths, durationMs: elapsed(startedAt, dependencies) });
  return { status: 'blocked', reason, proposalId, message, unsafePaths, guidance };
}

function sameRoot(left: string, right: string): boolean {
  return path.resolve(left) === path.resolve(right);
}

function elapsed(startedAt: number, dependencies: ApplyApprovedEvalRepairDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
