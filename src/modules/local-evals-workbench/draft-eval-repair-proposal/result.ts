import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';

export type RepairProposalApprovalState = 'pending';

export type RepairProposalSourceFailureScope = {
  readonly suiteId: string;
  readonly testCaseId: string;
  readonly evalRunModelId: string;
  readonly assertionId: string;
};

export type ProposedRepairChange = {
  readonly kind: 'unified-diff' | 'replacement' | 'instructions';
  readonly representation: string;
};

export type RepairProposalPreview = {
  readonly proposalId: string;
  readonly affectedProjectFiles: readonly string[];
  readonly changeSummary: string;
  readonly rationale: string;
  readonly expectedEvalImpact: string;
  readonly proposedChange: ProposedRepairChange;
  readonly approvalState: RepairProposalApprovalState;
  readonly sourceFailureScope?: RepairProposalSourceFailureScope;
};

export type DraftEvalRepairProposalReadyResult = {
  readonly status: 'proposal-ready';
  readonly assistanceModelLabel: string;
  readonly evidence: FailedAssertionEvidence;
  readonly proposal: RepairProposalPreview;
};

export type DraftEvalRepairProposalUnavailableResult = {
  readonly status: 'proposal-unavailable';
  readonly reason: 'missing-openai-api-key';
  readonly message: string;
  readonly setupGuidance: readonly string[];
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type DraftEvalRepairProposalBlockedResult = {
  readonly status: 'blocked';
  readonly reason: 'invalid-scope' | 'unclear-direction' | 'missing-artifact' | 'missing-cell' | 'missing-assertion' | 'non-failed-assertion' | 'unsafe-target-files';
  readonly message: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type DraftEvalRepairProposalRejectedResult = {
  readonly status: 'proposal-rejected';
  readonly reason: 'vague-proposal' | 'unsafe-target-files';
  readonly message: string;
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type DraftEvalRepairProposalErrorResult = {
  readonly status: 'error';
  readonly reason: 'llm-failure' | 'invalid-llm-response';
  readonly message: string;
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type DraftEvalRepairProposalResult =
  | DraftEvalRepairProposalReadyResult
  | DraftEvalRepairProposalUnavailableResult
  | DraftEvalRepairProposalBlockedResult
  | DraftEvalRepairProposalRejectedResult
  | DraftEvalRepairProposalErrorResult;
