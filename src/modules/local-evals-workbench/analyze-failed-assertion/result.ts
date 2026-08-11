import type { FailedAssertionEvidence } from './evidence.js';

export type FailureLikelyCause = 'prompt_issue' | 'eval_assertion_issue' | 'fixture_input_issue' | 'model_nondeterminism' | 'unclear_needs_human_judgment';

export type FailureAnalysis = {
  readonly exactFailureExplanation: string;
  readonly likelyCause: FailureLikelyCause;
  readonly evidenceSummary: string;
  readonly uncertainty: string;
};

export type AnalyzeFailedAssertionReadyResult = {
  readonly status: 'analysis-ready';
  readonly assistanceModelLabel: string;
  readonly evidence: FailedAssertionEvidence;
  readonly analysis: FailureAnalysis;
};

export type AnalyzeFailedAssertionUnavailableResult = {
  readonly status: 'analysis-unavailable';
  readonly reason: 'missing-openai-api-key';
  readonly message: string;
  readonly setupGuidance: readonly string[];
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type AnalyzeFailedAssertionBlockedResult = {
  readonly status: 'blocked';
  readonly reason: 'invalid-scope' | 'missing-artifact' | 'missing-cell' | 'missing-assertion' | 'non-failed-assertion';
  readonly message: string;
};

export type AnalyzeFailedAssertionErrorResult = {
  readonly status: 'error';
  readonly reason: 'llm-failure' | 'invalid-llm-response';
  readonly message: string;
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type AnalyzeFailedAssertionResult =
  | AnalyzeFailedAssertionReadyResult
  | AnalyzeFailedAssertionUnavailableResult
  | AnalyzeFailedAssertionBlockedResult
  | AnalyzeFailedAssertionErrorResult;
