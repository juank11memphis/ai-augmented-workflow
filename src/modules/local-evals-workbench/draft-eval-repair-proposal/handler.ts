import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import { isConcreteInstruction } from './request-parser.js';
import { ProposalProviderFailure, type DraftRepairProposalLogEvent, type DraftRepairProposalLoggerPort, type ProposalAssistanceConfigPort, type ProposalRunArtifactReaderPort, type RepairProposalLlmPort, type RepairProposalStorePort, type SafeProjectFileReaderPort } from './ports.js';
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
  readonly reference?: string;
  readonly clock?: () => number;
};

export async function draftEvalRepairProposal(command: DraftEvalRepairProposalCommand, dependencies: DraftEvalRepairProposalDependencies): Promise<DraftEvalRepairProposalResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const log = (event: DraftRepairProposalLogEvent['event'], outcome: DraftRepairProposalLogEvent['outcome'], reason?: string, targetFileCount?: number): void => {
    const reference = dependencies.reference;
    const safeReference = reference && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(reference) ? reference : undefined;
    const entry: DraftRepairProposalLogEvent = { event, stage: 'proposal', outcome,
      ...(reason ? { reason } : {}), ...(safeReference ? { reference: safeReference } : {}),
      durationMs: elapsed(startedAt, dependencies), ...(targetFileCount !== undefined ? { targetFileCount: Math.min(1, Math.max(0, targetFileCount)) } : {}) };
    try { dependencies.logger[outcome === 'failed' ? 'error' : outcome === 'blocked' ? 'warn' : 'info'](entry); } catch { /* Diagnostics must not change the result. */ }
  };
  log('repair_proposal_requested', 'started');
  let evidence: FailedAssertionEvidence | undefined;
  let assistanceModelLabel = 'unavailable';
  try {
  const config = dependencies.assistanceConfig.getConfig();
  assistanceModelLabel = config.assistanceModelLabel;

  const blockedScope = validateCommand(command);
  if (blockedScope) return logBlocked(blockedScope, log);
  const priorAnalysis = dependencies.analysisStore.get(command.analysisId, command);
  if (!priorAnalysis || priorAnalysis.likelyCause !== command.repairDirection.type) return logBlocked(blocked('stale-analysis', 'Analyze this selected failure again before drafting a repair.'), log);

  const selected = await dependencies.artifactReader.read(command);
  if (selected.status === 'blocked') return logBlocked(blocked(selected.reason === 'non-failed-assertion' ? 'non-failed-assertion' : 'missing-artifact', 'The selected failed assertion is unavailable in this saved run.'), log);
  if (selected.value.testedModel !== command.evalRunModelId || selected.value.runScope !== (command.runScope.type === 'all' ? 'all' : 'selected')) return logBlocked(blocked('invalid-scope', 'The selected model or scope does not match this saved run.'), log);
  evidence = selected.value.evidence;
  if (!config.hasOpenAiApiKey) {
    log('repair_proposal_unavailable', 'blocked', 'missing-openai-api-key');
    return { status: 'proposal-unavailable', reason: 'missing-openai-api-key', message: 'Proposal unavailable', setupGuidance: ['Set OPENAI_API_KEY in the server environment.', 'Optionally set SIBU_EVALS_MODEL to choose the assistance model.'], assistanceModelLabel: config.assistanceModelLabel, evidence };
  }

    const context = dependencies.context.namedFiles(command);
    if (context.status === 'blocked') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The named repair target is unsafe.', evidence }, log);
    const projectFiles = await dependencies.projectFileReader.readProjectFilePreviews(command.projectRoot, context.paths);
    if (projectFiles.status === 'blocked') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The named repair target could not be safely read.', evidence }, log);
    let draft;
    try { draft = await dependencies.llm.draftProposal({ model: config.assistanceModelLabel, evidence, repairDirection: command.repairDirection,
      priorAnalysis: { summary: priorAnalysis.evidenceSummary, likelyCause: priorAnalysis.likelyCause }, projectFiles: projectFiles.files });
    } catch (error) {
      const reason = error instanceof ProposalProviderFailure ? error.reason : 'unknown-cause';
      log('repair_proposal_failed', 'failed', reason);
      return { status: 'error', reason, message: 'Repair proposal could not be drafted. Inspect provider availability and try again later.', assistanceModelLabel, evidence };
    }
    if (draft.affectedProjectFiles.length !== 1 || !context.paths.includes(draft.affectedProjectFiles[0] ?? '') || draft.proposedChange.kind === 'instructions') {
      return reject('unsafe-target-files', 'A repair must name exactly one validated project file and a concrete diff or replacement.', draft.affectedProjectFiles.length, log, assistanceModelLabel, evidence);
    }
    const targetSafety = validateProjectFileTargets(command.projectRoot, draft.affectedProjectFiles);
    if (targetSafety.status === 'blocked') return reject('unsafe-target-files', 'The proposed repair target is unsafe.', draft.affectedProjectFiles.length, log, assistanceModelLabel, evidence);
    const validation = validateRepairProposalDraft(command.projectRoot, draft);
    if (validation.status === 'rejected') return reject(validation.reason,
      validation.reason === 'unsafe-target-files' ? 'The proposed repair target is unsafe.' : validation.message,
      draft.affectedProjectFiles.length, log, assistanceModelLabel, evidence);
    const targetPath = draft.affectedProjectFiles[0]!;
    const current = await dependencies.projectFileReader.readTargetState(command.projectRoot, targetPath);
    if (current.status === 'blocked' || current.value.status !== 'present') return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The named repair target could not be safely read.', evidence }, log);
    const supplied = projectFiles.files.find(file => file.path === targetPath);
    if (supplied?.digest !== current.value.digest || supplied.preview !== current.value.content) return logBlocked({ status: 'blocked', reason: 'unsafe-target-files', message: 'The target changed or its complete content was unavailable while drafting. Draft a fresh proposal.', evidence }, log);
    let proposedContent: string;
    try {
      if (validation.proposal.proposedChange.kind === 'replacement') proposedContent = validation.proposal.proposedChange.representation;
      else if (current.value.status === 'present') proposedContent = applySingleHunkDiff(current.value.content, targetPath, validation.proposal.proposedChange.representation);
      else throw new Error('A diff needs an existing file.');
    } catch {
      return reject('vague-proposal', 'The proposed diff cannot be applied to the current file. Draft a single matching hunk or a complete replacement.', 1, log, assistanceModelLabel, evidence);
    }
    if (proposedContent === current.value.content) return reject('vague-proposal', 'The proposal makes no file change. Draft a concrete repair.', 1, log, assistanceModelLabel, evidence);
    if (Buffer.byteLength(proposedContent, 'utf8') > 32 * 1024) return reject('vague-proposal', 'The proposed file exceeds the supported size. Draft a smaller one-file change.', 1, log, assistanceModelLabel, evidence);
    const proposal = await dependencies.proposalStore.savePendingProposal({ projectRoot: command.projectRoot, suiteId: command.suiteId, runId: command.runId, testCaseId: command.testCaseId, attempt: command.attempt, evalRunModelId: selected.value.testedModel, judgeModel: selected.value.judgeModel, repeats: selected.value.repeats, assertionId: command.assertionId, targetPrecondition: current.value, proposal: validation.proposal });
    log('repair_proposal_drafted', 'completed', undefined, proposal.affectedProjectFiles.length);
    return { status: 'proposal-ready', assistanceModelLabel: config.assistanceModelLabel, evidence, proposal };
  } catch {
    log('repair_proposal_failed', 'failed', 'unknown-cause');
    return { status: 'error', reason: 'unknown-cause', message: 'Repair proposal could not be drafted because the cause is unknown. Inspect the selected failure and try again later.', assistanceModelLabel, evidence };
  }
}

function validateCommand(command: DraftEvalRepairProposalCommand): DraftEvalRepairProposalBlockedResult | null {
  if (!command.runId || !Number.isInteger(command.attempt) || command.attempt < 1 || command.attempt > 20) return blocked('invalid-scope', 'Select one saved run and attempt.');
  if (command.runScope.type === 'test_case' && command.runScope.testCaseId !== command.testCaseId) return blocked('invalid-scope', 'Proposal drafting must stay scoped to the active failed assertion test case.');
  if (command.repairDirection.type === 'custom' && !isConcreteInstruction(command.repairDirection.instruction)) return blocked('unclear-direction', 'Repair direction must be concrete before drafting a proposal.');
  return null;
}

function blocked(reason: DraftEvalRepairProposalBlockedResult['reason'], message: string): DraftEvalRepairProposalBlockedResult { return { status: 'blocked', reason, message }; }
function reject(reason: 'vague-proposal' | 'unsafe-target-files', message: string, targetFileCount: number, log: ProposalLog, assistanceModelLabel: string, evidence: FailedAssertionEvidence): DraftEvalRepairProposalResult {
  log('repair_proposal_rejected', 'blocked', reason, targetFileCount);
  return { status: 'proposal-rejected', reason, message, assistanceModelLabel, evidence };
}
function logBlocked(result: DraftEvalRepairProposalBlockedResult, log: ProposalLog): DraftEvalRepairProposalBlockedResult {
  log('repair_proposal_blocked', 'blocked', result.reason);
  return result;
}
type ProposalLog = (event: DraftRepairProposalLogEvent['event'], outcome: DraftRepairProposalLogEvent['outcome'], reason?: string, targetFileCount?: number) => void;
function elapsed(startedAt: number, dependencies: DraftEvalRepairProposalDependencies): number { return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt); }
