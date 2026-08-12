import { buildFailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import { isConcreteInstruction } from './request-parser.js';
import type { DraftRepairProposalLoggerPort, ProposalAssistanceConfigPort, ProposalRunArtifactReaderPort, RepairProposalLlmPort, RepairProposalStorePort, SafeProjectFileReaderPort } from './ports.js';
import { validateProjectFileTargets } from './project-file-safety.js';
import { validateRepairProposalDraft } from './proposal-validation.js';
import type { DraftEvalRepairProposalBlockedResult, DraftEvalRepairProposalResult } from './result.js';

export type DraftEvalRepairProposalDependencies = {
  readonly artifactReader: ProposalRunArtifactReaderPort;
  readonly assistanceConfig: ProposalAssistanceConfigPort;
  readonly projectFileReader: SafeProjectFileReaderPort;
  readonly llm: RepairProposalLlmPort;
  readonly proposalStore: RepairProposalStorePort;
  readonly logger: DraftRepairProposalLoggerPort;
  readonly clock?: () => number;
};

export async function draftEvalRepairProposal(command: DraftEvalRepairProposalCommand, dependencies: DraftEvalRepairProposalDependencies): Promise<DraftEvalRepairProposalResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const config = dependencies.assistanceConfig.getConfig();
  const metadata = { suiteId: command.suiteId, testCaseId: command.testCaseId, modelId: command.evalRunModelId, assertionId: command.assertionId };
  dependencies.logger.info({ event: 'repair_proposal_requested', ...metadata, assistanceModelLabel: config.assistanceModelLabel });

  const blockedScope = validateCommand(command);
  if (blockedScope) return logBlocked(blockedScope, metadata, startedAt, dependencies);

  const artifact = dependencies.artifactReader.getRunArtifact(command.suiteId, command.evalRunModelId, command.runScope.type, command.runScope.type === 'test_case' ? command.runScope.testCaseId : undefined);
  if (!artifact) return logBlocked(blocked('missing-artifact', 'Run evidence was not found. Run the eval before requesting a proposal.'), metadata, startedAt, dependencies);
  const cell = artifact.matrix.rows.find((row) => row.testCaseId === command.testCaseId)?.cells.find((candidate) => candidate.modelId === command.evalRunModelId);
  if (!cell) return logBlocked(blocked('missing-cell', 'The selected result cell was not found in the stored run.'), metadata, startedAt, dependencies);
  const assertion = cell.assertions.find((candidate) => candidate.id === command.assertionId);
  if (!assertion) return logBlocked(blocked('missing-assertion', 'The selected assertion was not found in the stored result cell.'), metadata, startedAt, dependencies);
  if (assertion.status !== 'failed') return logBlocked(blocked('non-failed-assertion', 'Only failed assertions can receive repair proposals.'), metadata, startedAt, dependencies);

  const evidence = buildFailedAssertionEvidence({ suiteId: command.suiteId, cell, assertion });
  if (!config.hasOpenAiApiKey) {
    dependencies.logger.warn({ event: 'repair_proposal_unavailable', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'missing-openai-api-key', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'proposal-unavailable', reason: 'missing-openai-api-key', message: 'Proposal unavailable', setupGuidance: ['Set OPENAI_API_KEY in the server environment.', 'Optionally set SIBU_EVALS_MODEL to choose the assistance model.'], assistanceModelLabel: config.assistanceModelLabel, evidence };
  }

  try {
    const projectFiles = await dependencies.projectFileReader.readProjectFilePreviews(command.projectRoot, inferContextFiles(command));
    if (projectFiles.status === 'blocked') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: projectFiles.reason, evidence }, metadata, startedAt, dependencies);
    const draft = await dependencies.llm.draftProposal({ model: config.assistanceModelLabel, evidence, repairDirection: command.repairDirection, priorAnalysis: command.priorAnalysis, projectFiles: projectFiles.files });
    const targetSafety = validateProjectFileTargets(command.projectRoot, draft.affectedProjectFiles);
    if (targetSafety.status === 'blocked') return reject('unsafe-target-files', targetSafety.reason, draft.affectedProjectFiles.length, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    const validation = validateRepairProposalDraft(command.projectRoot, draft);
    if (validation.status === 'rejected') return reject(validation.reason, validation.message, draft.affectedProjectFiles.length, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    const proposal = await dependencies.proposalStore.savePendingProposal({ projectRoot: command.projectRoot, ...metadata, evalRunModelId: command.evalRunModelId, proposal: validation.proposal });
    dependencies.logger.info({ event: 'repair_proposal_drafted', ...metadata, assistanceModelLabel: config.assistanceModelLabel, targetFileCount: proposal.affectedProjectFiles.length, durationMs: elapsed(startedAt, dependencies), outcome: 'proposal-ready' });
    return { status: 'proposal-ready', assistanceModelLabel: config.assistanceModelLabel, evidence, proposal };
  } catch {
    dependencies.logger.error({ event: 'repair_proposal_failed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'llm-failure', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'llm-failure', message: 'Repair proposal could not be drafted. Try again later.', assistanceModelLabel: config.assistanceModelLabel, evidence };
  }
}

function validateCommand(command: DraftEvalRepairProposalCommand): DraftEvalRepairProposalBlockedResult | null {
  if (command.runScope.type === 'test_case' && command.runScope.testCaseId !== command.testCaseId) return blocked('invalid-scope', 'Proposal drafting must stay scoped to the active failed assertion test case.');
  if (command.repairDirection.type === 'custom' && !isConcreteInstruction(command.repairDirection.instruction)) return blocked('unclear-direction', 'Repair direction must be concrete before drafting a proposal.');
  return null;
}

function inferContextFiles(command: DraftEvalRepairProposalCommand): readonly string[] {
  if (command.repairDirection.type === 'eval_assertion_issue') return [`evals/${command.suiteId}.json`];
  if (command.repairDirection.type === 'fixture_input_issue') return [`evals/fixtures/${command.testCaseId}.json`, `evals/${command.suiteId}.json`];
  if (command.repairDirection.type === 'regression_case') return [`evals/${command.suiteId}.json`];
  return [];
}

function blocked(reason: DraftEvalRepairProposalBlockedResult['reason'], message: string): DraftEvalRepairProposalBlockedResult { return { status: 'blocked', reason, message }; }
function reject(reason: 'vague-proposal' | 'unsafe-target-files', message: string, targetFileCount: number, metadata: Metadata, startedAt: number, dependencies: DraftEvalRepairProposalDependencies, assistanceModelLabel: string, evidence: FailedAssertionEvidence): DraftEvalRepairProposalResult {
  dependencies.logger.warn({ event: 'repair_proposal_rejected', ...metadata, assistanceModelLabel, reason, targetFileCount, durationMs: elapsed(startedAt, dependencies) });
  return { status: 'proposal-rejected', reason, message, assistanceModelLabel, evidence };
}
function logBlocked(result: DraftEvalRepairProposalBlockedResult, metadata: Metadata, startedAt: number, dependencies: DraftEvalRepairProposalDependencies): DraftEvalRepairProposalBlockedResult {
  dependencies.logger.warn({ event: 'repair_proposal_blocked', ...metadata, reason: result.reason, durationMs: elapsed(startedAt, dependencies) });
  return result;
}
type Metadata = { readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string };
function elapsed(startedAt: number, dependencies: DraftEvalRepairProposalDependencies): number { return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt); }
