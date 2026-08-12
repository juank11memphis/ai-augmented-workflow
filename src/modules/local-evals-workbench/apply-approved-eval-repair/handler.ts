import path from 'node:path';

import { APPLY_APPROVED_REPAIR_MARKER } from './command.js';
import type { ApplyApprovedEvalRepairCommand } from './command.js';
import type { ApplyApprovedRepairLoggerPort, ApprovedProjectFileMutatorPort, ApprovedRepairProposalReaderPort, ManagedWorkflowReadinessPort, PendingApprovedRepairProposal, ProjectFileMutationSafetyPort } from './ports.js';
import type { ApplyApprovedEvalRepairResult, ApprovedRepairBlockedReason, ApprovedRepairChangedFile, ApprovedRepairRerunRecommendation } from './result.js';

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

  if (!proposalId || !command.projectRoot.trim()) return block('invalid-request', 'Proposal id and project root are required. No project files changed.', dependencies, startedAt, proposalId || undefined);
  if (command.approvalMarker !== APPLY_APPROVED_REPAIR_MARKER) return block('missing-approval', 'Explicit approval is required before Sibu can change project files. No project files changed.', dependencies, startedAt, proposalId);

  const proposal = await dependencies.proposalReader.getPendingProposal(proposalId);
  if (!proposal) return block('stale-proposal', 'The repair proposal is unavailable or stale. Draft a fresh proposal before approving. No project files changed.', dependencies, startedAt, proposalId);
  if (proposal.approvalState !== 'pending') return block('stale-proposal', 'Only pending repair proposals can be approved. No project files changed.', dependencies, startedAt, proposalId);
  if (!sameRoot(command.projectRoot, proposal.projectRoot)) return block('wrong-project-root', 'The repair proposal was drafted for a different project root. No project files changed.', dependencies, startedAt, proposalId);

  const safety = await dependencies.safety.validateTargets(command.projectRoot, proposal.affectedProjectFiles);
  if (safety.status === 'blocked') return block('unsafe-target', `${safety.reason} No project files changed.`, dependencies, startedAt, proposalId, proposal.affectedProjectFiles.length, safety.unsafePaths);

  const readiness = await dependencies.workflowReadiness.checkReadiness(command.projectRoot, safety.safeTargets);
  if (readiness.status === 'blocked') return block('unsafe-workflow-readiness', `${readiness.message} No project files changed.`, dependencies, startedAt, proposalId, safety.safeTargets.length, readiness.affectedPaths, readiness.guidance);

  const mutation = await dependencies.mutator.applyApprovedChange({ projectRoot: command.projectRoot, targetPaths: safety.safeTargets, approvedChange: proposal.proposedChange });
  if (mutation.status === 'failed') {
    dependencies.logger.error({ event: 'approved_repair_failed', proposalId, reason: mutation.reason, targetFileCount: safety.safeTargets.length, safeTargetPaths: safety.safeTargets, durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'mutation-failure', proposalId, changedFiles: [], changedFileCount: 0, message: 'The approved change could not be applied. No project files changed.' };
  }

  const changedFiles = normalizeChangedFiles(mutation.changedFiles);
  dependencies.logger.info({ event: 'approved_repair_applied', proposalId, targetFileCount: safety.safeTargets.length, changedFileCount: changedFiles.length, safeTargetPaths: changedFiles.map((file) => file.path), durationMs: elapsed(startedAt, dependencies) });
  return {
    status: 'applied',
    proposalId,
    changedFiles,
    changedFileCount: changedFiles.length,
    message: changedFiles.length > 0 ? `Proposal applied. ${changedFiles.length} project file${changedFiles.length === 1 ? '' : 's'} changed; rerun validation before treating the issue as resolved.` : 'Proposal applied, but no project file content changed. Rerun validation only if you still need to confirm behavior.',
    validationStatus: 'not-rerun',
    rerunRecommendation: createRerunRecommendation(proposal),
  };
}

function normalizeChangedFiles(files: readonly ApprovedRepairChangedFile[]): readonly ApprovedRepairChangedFile[] {
  return files.map((file) => ({ path: file.path, summary: file.summary ?? 'Changed by approved proposal.' }));
}

function createRerunRecommendation(proposal: PendingApprovedRepairProposal): ApprovedRepairRerunRecommendation {
  const scope = proposal.sourceFailureScope;
  if (!scope) {
    return {
      message: 'Rerun the full suite to check the applied proposal.',
      primaryAction: { scope: 'suite', label: 'Rerun full suite', suiteId: 'unknown', evalRunModelId: 'unknown', primary: true },
      alternateActions: [],
    };
  }

  return {
    message: 'Rerun this test case first to check the changed proposal; the full suite is still available.',
    primaryAction: { scope: 'test_case', label: 'Rerun this test case', suiteId: scope.suiteId, testCaseId: scope.testCaseId, evalRunModelId: scope.evalRunModelId, assertionId: scope.assertionId, primary: true },
    alternateActions: [{ scope: 'suite', label: 'Rerun full suite', suiteId: scope.suiteId, evalRunModelId: scope.evalRunModelId, primary: false }],
  };
}

function block(reason: Exclude<ApprovedRepairBlockedReason, 'mutation-failure'>, message: string, dependencies: ApplyApprovedEvalRepairDependencies, startedAt: number, proposalId?: string, targetFileCount?: number, unsafePaths?: readonly string[], guidance?: readonly string[]): ApplyApprovedEvalRepairResult {
  dependencies.logger.warn({ event: 'approved_repair_blocked', proposalId, reason, targetFileCount, safeTargetPaths: unsafePaths, durationMs: elapsed(startedAt, dependencies) });
  return { status: 'blocked', reason, proposalId, changedFiles: [], changedFileCount: 0, message, unsafePaths, guidance };
}

function sameRoot(left: string, right: string): boolean {
  return path.resolve(left) === path.resolve(right);
}

function elapsed(startedAt: number, dependencies: ApplyApprovedEvalRepairDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
