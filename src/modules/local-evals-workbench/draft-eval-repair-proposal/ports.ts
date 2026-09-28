import type { AssistanceConfig } from '../repair-context/assistance-config.js';
import type { DraftEvalRepairProposalRunScope, DraftProposalPriorAnalysis, RepairDirection } from './command.js';
import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
import type { RepairProposalPreview, ProposedRepairChange, StoredRepairProposal, FailureAnalysis } from '../repair-context/contracts.js';
import type { SelectedFailureReader } from '../repair-context/selected-evidence.js';
import type { ProjectFileState } from '../repair-context/project-file-state.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import type { FailureSelection } from '../repair-context/selected-evidence.js';
export type { StoredRepairProposal } from '../repair-context/contracts.js';

export type ProposalRunArtifactReaderPort = SelectedFailureReader;

export type ProposalAssistanceConfigPort = { getConfig(): AssistanceConfig };

export type ProjectFilePreview = { readonly path: string; readonly preview: string; readonly digest?: string };

export type SafeProjectFileReaderPort = {
  readProjectFilePreviews(projectRoot: string, requestedPaths: readonly string[]): Promise<{ readonly status: 'ok'; readonly files: readonly ProjectFilePreview[] } | { readonly status: 'blocked'; readonly reason: string; readonly unsafePaths: readonly string[] }>;
  readTargetState(projectRoot: string, path: string): Promise<{ readonly status: 'ok'; readonly value: ProjectFileState } | { readonly status: 'blocked'; readonly reason: string }>;
};
export type ProposalContextPort = { namedFiles(command: DraftEvalRepairProposalCommand): { readonly status: 'ready'; readonly paths: readonly string[] } | { readonly status: 'blocked'; readonly reason: string } };
export type ProposalAnalysisStorePort = { get(id: string, selection: FailureSelection): FailureAnalysis | null };

export type RepairProposalDraft = {
  readonly affectedProjectFiles: readonly string[];
  readonly changeSummary: string;
  readonly rationale: string;
  readonly expectedEvalImpact: string;
  readonly proposedChange: ProposedRepairChange;
};

export type RepairProposalLlmPort = {
  draftProposal(request: {
    readonly model: string;
    readonly evidence: FailedAssertionEvidence;
    readonly repairDirection: RepairDirection;
    readonly priorAnalysis?: DraftProposalPriorAnalysis;
    readonly projectFiles: readonly ProjectFilePreview[];
  }): Promise<RepairProposalDraft>;
};

export type RepairProposalStorePort = {
  savePendingProposal(request: {
    readonly projectRoot: string;
    readonly suiteId: string;
    readonly runId: string;
    readonly testCaseId: string;
    readonly attempt: number;
    readonly evalRunModelId: string;
    readonly judgeModel: string | null;
    readonly repeats: number;
    readonly assertionId: string;
    readonly targetPrecondition: ProjectFileState;
    readonly proposal: Omit<RepairProposalPreview, 'proposalId' | 'approvalState'>;
  }): Promise<RepairProposalPreview>;
  getPendingProposal?(proposalId: string): StoredRepairProposal | undefined;
};

export type DraftRepairProposalLogEvent =
  | { readonly event: 'repair_proposal_requested'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string }
  | { readonly event: 'repair_proposal_unavailable'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly reason: string; readonly durationMs: number }
  | { readonly event: 'repair_proposal_drafted'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly targetFileCount: number; readonly durationMs: number; readonly outcome: string }
  | { readonly event: 'repair_proposal_rejected'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly reason: string; readonly targetFileCount: number; readonly durationMs: number }
  | { readonly event: 'repair_proposal_blocked'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly reason: string; readonly durationMs: number }
  | { readonly event: 'repair_proposal_failed'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly reason: string; readonly durationMs: number };

export type DraftRepairProposalLoggerPort = {
  info(event: DraftRepairProposalLogEvent): void;
  warn(event: DraftRepairProposalLogEvent): void;
  error(event: DraftRepairProposalLogEvent): void;
};
