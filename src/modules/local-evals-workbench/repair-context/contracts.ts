import type { ProjectFileState } from './project-file-state.js';

export type FailedAssertionEvidence = {
  readonly suiteId: string; readonly runId?: string; readonly attempt?: number;
  readonly testCaseId: string; readonly evalRunModelId: string; readonly evalRunModelLabel: string;
  readonly assertionId: string; readonly assertionLabel: string; readonly assertionKind: 'assertion' | 'grader';
  readonly assertionMessage: string; readonly actualOutputPreview: string | null;
  readonly expectedPreview: string | null; readonly cellOutputPreview: string | null;
  readonly diagnostics: readonly SafeEvidenceDiagnostic[]; readonly artifacts: readonly SafeEvidenceArtifact[];
  readonly score?: number | null; readonly threshold?: number;
};
export type SafeEvidenceDiagnostic = { readonly code: string; readonly severity: 'info' | 'warning' | 'error'; readonly message: string; readonly location?: string };
export type SafeEvidenceArtifact = { readonly id: string; readonly label: string; readonly kind: 'output-preview' | 'diagnostic' | 'metric' | 'file' | 'trace'; readonly preview?: string; readonly reference?: string };
export type FailureLikelyCause = 'prompt_issue' | 'eval_assertion_issue' | 'fixture_input_issue' | 'model_nondeterminism' | 'unclear_needs_human_judgment';
export type FailureAnalysis = { readonly exactFailureExplanation: string; readonly likelyCause: FailureLikelyCause; readonly evidenceSummary: string; readonly uncertainty: string };
export type ProposedRepairChange = { readonly kind: 'unified-diff' | 'replacement' | 'instructions'; readonly representation: string };
export type RepairProposalApprovalState = 'pending';
export type RepairProposalSourceFailureScope = {
  readonly suiteId: string; readonly runId: string; readonly testCaseId: string; readonly attempt: number;
  readonly evalRunModelId: string; readonly judgeModel: string | null; readonly assertionId: string;
};
export type RepairProposalPreview = {
  readonly proposalId: string; readonly affectedProjectFiles: readonly string[]; readonly changeSummary: string;
  readonly rationale: string; readonly expectedEvalImpact: string; readonly proposedChange: ProposedRepairChange;
  readonly approvalState: RepairProposalApprovalState; readonly sourceFailureScope?: RepairProposalSourceFailureScope;
};
export type StoredRepairProposal = RepairProposalPreview & { readonly projectRoot: string; readonly targetPrecondition: ProjectFileState };
