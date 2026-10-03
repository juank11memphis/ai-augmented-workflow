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
  const context = { proposalId: command.proposalId.trim(), startedAt: (dependencies.clock ?? Date.now)(), inspectionPaths: [] as string[], mutationState: 'not-attempted' as 'not-attempted' | 'attempted-outcome-uncertain' };
  try {
    return await applyApprovedEvalRepairChecked(command, dependencies, context);
  } catch {
    return uncertain('unexpected-port-failure', [], context, dependencies);
  }
}

type ApplyContext = { proposalId: string; startedAt: number; inspectionPaths: string[]; mutationState: 'not-attempted' | 'attempted-outcome-uncertain' };

async function applyApprovedEvalRepairChecked(command: ApplyApprovedEvalRepairCommand, dependencies: ApplyApprovedEvalRepairDependencies, context: ApplyContext): Promise<ApplyApprovedEvalRepairResult> {
  const { startedAt, proposalId } = context;
  logSafely(() => dependencies.logger.info({ event: 'approved_repair_requested' }));

  if (!proposalId || !command.projectRoot.trim()) return block('invalid-request', 'Proposal id and project root are required. No project files changed.', dependencies, startedAt, proposalId || undefined);
  if (command.approvalMarker !== APPLY_APPROVED_REPAIR_MARKER) return block('missing-approval', 'Explicit approval is required before Sibu can change project files. No project files changed.', dependencies, startedAt, proposalId);

  const proposal = await dependencies.proposalReader.getPendingProposal(proposalId);
  if (!proposal) return block('stale-proposal', 'The repair proposal is unavailable or stale. Draft a fresh proposal before approving. No project files changed.', dependencies, startedAt, proposalId);
  if (proposal.approvalState !== 'pending') return block('stale-proposal', 'Only pending repair proposals can be approved. No project files changed.', dependencies, startedAt, proposalId);
  if (!sameRoot(command.projectRoot, proposal.projectRoot)) return block('wrong-project-root', 'The repair proposal was drafted for a different project root. No project files changed.', dependencies, startedAt, proposalId);
  const source = proposal.sourceFailureScope;
  if (!source || source.suiteId !== command.suiteId || source.runId !== command.runId
    || source.testCaseId !== command.testCaseId || source.attempt !== command.attempt
    || source.assertionId !== command.assertionId || proposal.affectedProjectFiles.length !== 1
    || proposal.affectedProjectFiles[0] !== proposal.targetPrecondition.path
    || proposal.proposedChange.kind === 'instructions') {
    return block('stale-proposal', 'Proposal and selected failure do not match. Draft a fresh one. No project files changed.', dependencies, startedAt, proposalId);
  }

  const safety = await dependencies.safety.validateTargets(command.projectRoot, proposal.affectedProjectFiles);
  if (safety.status === 'blocked') return block('unsafe-target', 'Repair target is unsafe or unreadable. No project files changed.', dependencies, startedAt, proposalId, proposal.affectedProjectFiles.length, safety.unsafePaths);
  if (safety.safeTargets.length !== 1 || safety.safeTargets[0] !== proposal.targetPrecondition.path) {
    return block('unsafe-target', 'Repair target verification did not match the approved proposal. No project files changed.', dependencies, startedAt, proposalId);
  }
  context.inspectionPaths = [...safety.safeTargets];

  const readiness = await dependencies.workflowReadiness.checkReadiness(command.projectRoot, safety.safeTargets);
  if (readiness.status === 'blocked') return block('unsafe-workflow-readiness', `${readiness.message} No project files changed.`, dependencies, startedAt, proposalId, safety.safeTargets.length, readiness.affectedPaths, readiness.guidance);

  if (!dependencies.proposalReader.claimPendingProposal(proposalId)) return block('stale-proposal', 'This proposal was already applied or is being applied. Draft a fresh one. No project files changed.', dependencies, startedAt, proposalId);
  context.mutationState = 'attempted-outcome-uncertain';
  const mutation = await dependencies.mutator.applyApprovedChange({ projectRoot: command.projectRoot, targetPaths: safety.safeTargets, approvedChange: proposal.proposedChange, targetPrecondition: proposal.targetPrecondition });
  if (mutation.status === 'failed') {
    return uncertain('mutation-failure', mutation.changedFiles, context, dependencies);
  }

  if (mutation.changedFiles.length !== 1 || mutation.changedFiles[0]?.path !== proposal.targetPrecondition.path) {
    return uncertain('mutation-failure', mutation.changedFiles, context, dependencies, 'unexpected-mutation-result');
  }
  const changedFiles = normalizeChangedFiles(mutation.changedFiles, proposal.changeSummary);
  logSafely(() => dependencies.logger.info({ event: 'approved_repair_applied', targetFileCount: safety.safeTargets.length, changedFileCount: changedFiles.length, durationMs: elapsed(startedAt, dependencies) }));
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

function normalizeChangedFiles(files: readonly ApprovedRepairChangedFile[], summary: string): readonly ApprovedRepairChangedFile[] {
  return files.map((file) => ({ path: file.path, summary }));
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

function block(reason: ApprovedRepairBlockedReason, message: string, dependencies: ApplyApprovedEvalRepairDependencies, startedAt: number, proposalId?: string, targetFileCount?: number, unsafePaths?: readonly string[], guidance?: readonly string[]): ApplyApprovedEvalRepairResult {
  logSafely(() => dependencies.logger.warn({ event: 'approved_repair_blocked', reason, targetFileCount, durationMs: elapsed(startedAt, dependencies) }));
  return { status: 'blocked', reason, proposalId, changedFiles: [], changedFileCount: 0, message, unsafePaths, guidance };
}

function uncertain(reason: 'mutation-failure' | 'unexpected-port-failure', changedFiles: readonly ApprovedRepairChangedFile[], context: ApplyContext, dependencies: ApplyApprovedEvalRepairDependencies, logReason: 'mutation-failure' | 'unexpected-mutation-result' | 'unexpected-port-failure' = reason): ApplyApprovedEvalRepairResult {
  const inspectionPaths = [...new Set([...context.inspectionPaths, ...changedFiles.map((file) => file.path)])];
  logSafely(() => dependencies.logger.error({ event: 'approved_repair_failed', reason: logReason, mutationState: context.mutationState, targetFileCount: context.inspectionPaths.length, changedFileCount: changedFiles.length, durationMs: elapsed(context.startedAt, dependencies) }));
  return {
    status: 'error', reason, proposalId: context.proposalId, changedFiles, changedFileCount: changedFiles.length,
    mutationState: context.mutationState, inspectionPaths,
    message: context.mutationState === 'attempted-outcome-uncertain'
      ? `The repair outcome is not confirmed. Inspect ${inspectionPaths.join(', ')} before drafting another proposal; do not repeat this approved change.`
      : 'The repair could not be started. Its cause is unknown; inspect the proposal before drafting another one.',
  };
}

function logSafely(write: () => void): void {
  try { write(); } catch { /* Logging must not change a repair outcome. */ }
}

function sameRoot(left: string, right: string): boolean {
  return path.resolve(left) === path.resolve(right);
}

function elapsed(startedAt: number, dependencies: ApplyApprovedEvalRepairDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
