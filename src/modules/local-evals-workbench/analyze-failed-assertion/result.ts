import type { FailedAssertionEvidence, FailureAnalysis } from '../repair-context/contracts.js';
export type { FailureLikelyCause, FailureAnalysis } from '../repair-context/contracts.js';

export type AnalyzeFailedAssertionReadyResult = {
  readonly status: 'analysis-ready';
  readonly analysisId: string;
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
  readonly reason: 'provider-authorization' | 'provider-rate-limit' | 'provider-timeout' | 'provider-unavailable' | 'invalid-llm-response' | 'unknown' | 'llm-failure';
  readonly message: string;
  readonly assistanceModelLabel: string;
  readonly evidence?: FailedAssertionEvidence;
};

export type AnalyzeFailedAssertionResult =
  | AnalyzeFailedAssertionReadyResult
  | AnalyzeFailedAssertionUnavailableResult
  | AnalyzeFailedAssertionBlockedResult
  | AnalyzeFailedAssertionErrorResult;
