import type { AssistanceConfig } from '../analyze-failed-assertion/ports.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';
import type { DraftEvalRepairProposalRunScope, DraftProposalPriorAnalysis, RepairDirection } from './command.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';
import type { RepairProposalPreview, ProposedRepairChange } from './result.js';

export type ProposalRunArtifactReaderPort = {
  getRunArtifact(suiteId: string, modelId: string, scope: DraftEvalRepairProposalRunScope['type'], testCaseId?: string): StoredRunArtifact | undefined;
};

export type ProposalAssistanceConfigPort = { getConfig(): AssistanceConfig };

export type ProjectFilePreview = { readonly path: string; readonly preview: string };

export type SafeProjectFileReaderPort = {
  readProjectFilePreviews(projectRoot: string, requestedPaths: readonly string[]): Promise<{ readonly status: 'ok'; readonly files: readonly ProjectFilePreview[] } | { readonly status: 'blocked'; readonly reason: string; readonly unsafePaths: readonly string[] }>;
};

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
    readonly testCaseId: string;
    readonly evalRunModelId: string;
    readonly assertionId: string;
    readonly proposal: Omit<RepairProposalPreview, 'proposalId' | 'approvalState'>;
  }): Promise<RepairProposalPreview>;
  getPendingProposal?(proposalId: string): RepairProposalPreview | undefined;
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
