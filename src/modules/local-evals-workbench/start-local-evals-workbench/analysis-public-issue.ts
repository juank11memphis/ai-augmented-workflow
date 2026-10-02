import type { AnalyzeFailedAssertionResult } from '../analyze-failed-assertion/result.js';

type AnalysisFailure = Exclude<AnalyzeFailedAssertionResult, { status: 'analysis-ready' }>;
type AnalysisReason = AnalysisFailure['reason'];

export type PublicAnalysisIssue = {
  readonly stage: 'analysis';
  readonly outcome: 'blocked' | 'failed';
  readonly category: AnalysisReason | 'invalid-request' | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'check-setup' | 'retry' | 'report';
  readonly reference: string;
};

type Copy = Pick<PublicAnalysisIssue, 'title' | 'explanation' | 'nextStep' | 'recoveryAction'>;

const reasonCopy = {
  'missing-openai-api-key': { title: 'Failure analysis unavailable', explanation: 'Analysis needs a local OpenAI API key.', nextStep: 'Check local assistance setup, then try analysis again.', recoveryAction: 'check-setup' },
  'invalid-scope': { title: 'Analysis selection invalid', explanation: 'The selected failure cannot be analyzed in this scope.', nextStep: 'Select one failed assertion in a saved result.', recoveryAction: 'retry' },
  'missing-artifact': { title: 'Analysis evidence unavailable', explanation: 'The saved run evidence could not be found.', nextStep: 'Check the selected result and its saved evidence.', recoveryAction: 'report' },
  'missing-cell': { title: 'Analysis result unavailable', explanation: 'The selected result cell could not be found.', nextStep: 'Select a result that still has saved evidence.', recoveryAction: 'retry' },
  'missing-assertion': { title: 'Analysis assertion unavailable', explanation: 'The selected assertion could not be found.', nextStep: 'Select a saved failed assertion.', recoveryAction: 'retry' },
  'non-failed-assertion': { title: 'Analysis needs a failure', explanation: 'The selected assertion did not fail.', nextStep: 'Select a failed assertion.', recoveryAction: 'retry' },
  'provider-authorization': { title: 'Analysis authorization failed', explanation: 'The analysis provider rejected authorization.', nextStep: 'Check local provider credentials and access before trying again.', recoveryAction: 'check-setup' },
  'provider-rate-limit': { title: 'Analysis rate limited', explanation: 'The analysis provider limited this request.', nextStep: 'Wait before trying analysis again.', recoveryAction: 'retry' },
  'provider-timeout': { title: 'Analysis timed out', explanation: 'The analysis provider did not respond in time.', nextStep: 'Try analysis again later.', recoveryAction: 'retry' },
  'provider-unavailable': { title: 'Analysis service unavailable', explanation: 'The analysis provider could not be reached or was unavailable.', nextStep: 'Check service availability, then try again.', recoveryAction: 'retry' },
  'invalid-llm-response': { title: 'Analysis response invalid', explanation: 'The provider response could not be used safely.', nextStep: 'Try again. If it repeats, report the issue using this reference.', recoveryAction: 'report' },
  'llm-failure': { title: 'Analysis failed', explanation: 'Analysis could not finish. The provider cause is unknown.', nextStep: 'Try again. If it repeats, report the issue using this reference.', recoveryAction: 'report' },
  unknown: { title: 'Analysis failed', explanation: 'Analysis could not finish. Cause unknown.', nextStep: 'Try again. If it repeats, report the issue using this reference.', recoveryAction: 'report' },
} satisfies Record<AnalysisReason, Copy>;

export function analysisIssue(result: AnalysisFailure, reference: string): PublicAnalysisIssue {
  return { stage: 'analysis', outcome: result.status === 'error' ? 'failed' : 'blocked',
    category: result.reason, ...reasonCopy[result.reason], reference };
}

export function invalidAnalysisIssue(reference: string): PublicAnalysisIssue {
  return { stage: 'analysis', outcome: 'blocked', category: 'invalid-request',
    title: 'Analysis request invalid', explanation: 'Sibu could not read this analysis request.',
    nextStep: 'Correct the selection and try analysis again.', recoveryAction: 'retry', reference };
}

export function unknownAnalysisIssue(reference: string): PublicAnalysisIssue {
  return { stage: 'analysis', outcome: 'failed', category: 'unknown',
    title: 'Analysis request failed', explanation: 'Sibu could not complete the analysis request. Cause unknown.',
    nextStep: 'Check the selected result and try again. If it repeats, report this reference.',
    recoveryAction: 'report', reference };
}
