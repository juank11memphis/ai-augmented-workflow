import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import { isConcreteInstruction } from './request-parser.js';
import type { DraftRepairProposalLoggerPort, ProposalAssistanceConfigPort, ProposalRunArtifactReaderPort, RepairProposalLlmPort, RepairProposalStorePort, SafeProjectFileReaderPort } from './ports.js';
import type { ProposalContextPort, ProposalAnalysisStorePort } from './ports.js';
import { validateProjectFileTargets } from './project-file-safety.js';
import { validateRepairProposalDraft } from './proposal-validation.js';
import { applySingleHunkDiff } from '../repair-context/single-hunk-diff.js';
import type { DraftEvalRepairProposalBlockedResult, DraftEvalRepairProposalResult } from './result.js';

export type DraftEvalRepairProposalDependencies = {
  readonly artifactReader: ProposalRunArtifactReaderPort;
  readonly assistanceConfig: ProposalAssistanceConfigPort;
  readonly projectFileReader: SafeProjectFileReaderPort;
  readonly context: ProposalContextPort;
  readonly analysisStore: ProposalAnalysisStorePort;
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
  const priorAnalysis = dependencies.analysisStore.get(command.analysisId, command);
  if (!priorAnalysis || priorAnalysis.likelyCause !== command.repairDirection.type) return logBlocked(blocked('stale-analysis', 'Analyze this selected failure again before drafting a repair.'), metadata, startedAt, dependencies);

  const selected = await dependencies.artifactReader.read(command);
  if (selected.status === 'blocked') return logBlocked(blocked(selected.reason === 'non-failed-assertion' ? 'non-failed-assertion' : 'missing-artifact', 'The selected failed assertion is unavailable in this saved run.'), metadata, startedAt, dependencies);
  if (selected.value.testedModel !== command.evalRunModelId || selected.value.runScope !== (command.runScope.type === 'all' ? 'all' : 'selected')) return logBlocked(blocked('invalid-scope', 'The selected model or scope does not match this saved run.'), metadata, startedAt, dependencies);
  const evidence = selected.value.evidence;
  if (!config.hasOpenAiApiKey) {
    dependencies.logger.warn({ event: 'repair_proposal_unavailable', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'missing-openai-api-key', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'proposal-unavailable', reason: 'missing-openai-api-key', message: 'Proposal unavailable', setupGuidance: ['Set OPENAI_API_KEY in the server environment.', 'Optionally set SIBU_EVALS_MODEL to choose the assistance model.'], assistanceModelLabel: config.assistanceModelLabel, evidence };
  }

  try {
    const context = dependencies.context.namedFiles(command);
    if (context.status === 'blocked') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: context.reason, evidence }, metadata, startedAt, dependencies);
    const projectFiles = await dependencies.projectFileReader.readProjectFilePreviews(command.projectRoot, context.paths);
    if (projectFiles.status === 'blocked') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: projectFiles.reason, evidence }, metadata, startedAt, dependencies);
    const draft = await dependencies.llm.draftProposal({ model: config.assistanceModelLabel, evidence, repairDirection: command.repairDirection,
      priorAnalysis: { summary: priorAnalysis.evidenceSummary, likelyCause: priorAnalysis.likelyCause }, projectFiles: projectFiles.files });
    if (draft.affectedProjectFiles.length !== 1 || !context.paths.includes(draft.affectedProjectFiles[0] ?? '') || draft.proposedChange.kind === 'instructions') {
      return reject('unsafe-target-files', 'A repair must name exactly one validated project file and a concrete diff or replacement.', draft.affectedProjectFiles.length, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    }
    const targetSafety = validateProjectFileTargets(command.projectRoot, draft.affectedProjectFiles);
    if (targetSafety.status === 'blocked') return reject('unsafe-target-files', targetSafety.reason, draft.affectedProjectFiles.length, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    const validation = validateRepairProposalDraft(command.projectRoot, draft);
    if (validation.status === 'rejected') return reject(validation.reason, validation.message, draft.affectedProjectFiles.length, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    const targetPath = draft.affectedProjectFiles[0]!;
    const current = await dependencies.projectFileReader.readTargetState(command.projectRoot, targetPath);
    if (current.status === 'blocked' || current.value.status !== 'present') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The named repair target could not be safely read.', evidence }, metadata, startedAt, dependencies);
    if (projectFiles.files.find(file => file.path === targetPath)?.digest !== current.value.digest) return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The target changed while drafting. Draft a fresh proposal.', evidence }, metadata, startedAt, dependencies);
    let proposedContent: string;
    try {
      if (validation.proposal.proposedChange.kind === 'replacement') proposedContent = validation.proposal.proposedChange.representation;
      else if (current.value.status === 'present') proposedContent = applySingleHunkDiff(current.value.content, targetPath, validation.proposal.proposedChange.representation);
      else throw new Error('A diff needs an existing file.');
    } catch {
      return reject('vague-proposal', 'The proposed diff cannot be applied to the current file. Draft a single matching hunk or a complete replacement.', 1, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    }
    if (Buffer.byteLength(proposedContent, 'utf8') > 32 * 1024) return reject('vague-proposal', 'The proposed file exceeds the supported size. Draft a smaller one-file change.', 1, metadata, startedAt, dependencies, config.assistanceModelLabel, evidence);
    const proposal = await dependencies.proposalStore.savePendingProposal({ projectRoot: command.projectRoot, suiteId: command.suiteId, runId: command.runId, testCaseId: command.testCaseId, attempt: command.attempt, evalRunModelId: selected.value.testedModel, judgeModel: selected.value.judgeModel, repeats: selected.value.repeats, assertionId: command.assertionId, targetPrecondition: current.value, proposal: validation.proposal });
    dependencies.logger.info({ event: 'repair_proposal_drafted', ...metadata, assistanceModelLabel: config.assistanceModelLabel, targetFileCount: proposal.affectedProjectFiles.length, durationMs: elapsed(startedAt, dependencies), outcome: 'proposal-ready' });
    return { status: 'proposal-ready', assistanceModelLabel: config.assistanceModelLabel, evidence, proposal };
  } catch {
    dependencies.logger.error({ event: 'repair_proposal_failed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'llm-failure', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'llm-failure', message: 'Repair proposal could not be drafted. Try again later.', assistanceModelLabel: config.assistanceModelLabel, evidence };
  }
}

function validateCommand(command: DraftEvalRepairProposalCommand): DraftEvalRepairProposalBlockedResult | null {
  if (!command.runId || !Number.isInteger(command.attempt) || command.attempt < 1 || command.attempt > 20) return blocked('invalid-scope', 'Select one saved run and attempt.');
  if (command.runScope.type === 'test_case' && command.runScope.testCaseId !== command.testCaseId) return blocked('invalid-scope', 'Proposal drafting must stay scoped to the active failed assertion test case.');
  if (command.repairDirection.type === 'custom' && !isConcreteInstruction(command.repairDirection.instruction)) return blocked('unclear-direction', 'Repair direction must be concrete before drafting a proposal.');
  return null;
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
