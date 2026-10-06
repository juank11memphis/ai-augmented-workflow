import type { AssertionEvidence, Attempt, RunDetail } from '../run-history/contracts.js';

export type EvidenceSelection = {
  readonly suiteId: string;
  readonly runId: string;
  readonly caseId: string;
  readonly attempt: number;
  readonly assertionId?: string;
};

export type SelectedEvidence = {
  readonly safeMetadata: {
    readonly suiteId: string;
    readonly runId: string;
    readonly caseId: string;
    readonly attempt: number;
    readonly outcome: Attempt['outcome'];
    readonly failedCheckCount: number;
  };
  readonly selectedCheck: AssertionEvidence | null;
  readonly checks: Attempt['assertions'];
  readonly actual: string | null;
  readonly expected: string | null;
  readonly score: number | null;
  readonly threshold: number | null;
  readonly diagnostics: Attempt['diagnostics'];
  readonly turns: Attempt['turns'];
  readonly tools: Attempt['tools'];
  readonly rawResponse: string | null;
  readonly rawResponseTruncated: boolean;
  readonly analysisScope: (EvidenceSelection & { readonly assertionId: string }) | null;
};

export type SelectedEvidenceResult =
  | { readonly status: 'ready'; readonly value: SelectedEvidence }
  | { readonly status: 'invalid'; readonly reason: 'unavailable' | 'identity-mismatch' | 'invalid-assertion' };

/** Projects only the requested saved attempt; callers decide when to reveal detail. */
export function projectSelectedEvidence(detail: RunDetail, selection: EvidenceSelection): SelectedEvidenceResult {
  const { summary, evidence } = detail;
  if (detail.evidenceStatus !== 'available' || !evidence) return { status: 'invalid', reason: 'unavailable' };
  const caseSummary = summary.cases.find(item => item.caseId === selection.caseId);
  const attemptSummary = caseSummary?.attempts.find(item => item.number === selection.attempt);
  if (summary.suiteId !== selection.suiteId || summary.runId !== selection.runId
    || evidence.suiteId !== selection.suiteId || evidence.runId !== selection.runId
    || evidence.caseId !== selection.caseId || evidence.number !== selection.attempt
    || !summary.caseIds.includes(selection.caseId) || !attemptSummary
    || attemptSummary.outcome !== evidence.outcome) {
    return { status: 'invalid', reason: 'identity-mismatch' };
  }

  const failedChecks = evidence.assertions.filter(check => check.outcome === 'failed');
  const selectedCheck = selection.assertionId === undefined
    ? failedChecks[0] ?? null
    : failedChecks.find(check => check.id === selection.assertionId) ?? null;
  if (selection.assertionId !== undefined && !selectedCheck) return { status: 'invalid', reason: 'invalid-assertion' };

  return { status: 'ready', value: {
    safeMetadata: { suiteId: selection.suiteId, runId: selection.runId, caseId: selection.caseId,
      attempt: selection.attempt, outcome: evidence.outcome, failedCheckCount: failedChecks.length },
    selectedCheck, checks: evidence.assertions,
    actual: selectedCheck?.actual || null,
    expected: selectedCheck?.expected || null,
    score: selectedCheck?.score ?? null,
    threshold: selectedCheck?.threshold ?? null,
    diagnostics: evidence.diagnostics, turns: evidence.turns, tools: evidence.tools,
    rawResponse: evidence.output || null, rawResponseTruncated: evidence.truncated,
    analysisScope: selectedCheck ? { ...selection, assertionId: selectedCheck.id } : null,
  } };
}
