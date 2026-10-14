import type { CheckOutcome, RunState } from '../run-history/index.js';

export type HeadlessEvalSummary = {
  readonly suiteId: string;
  readonly runId: string;
  readonly state: RunState;
  readonly outcome: CheckOutcome;
  readonly scope: 'all' | 'selected';
  readonly testedModel: string;
  readonly judgeModel: string | null;
  readonly cases: readonly { readonly caseId: string; readonly state: 'not-run' | 'incomplete' | 'completed'; readonly attempts: readonly { readonly number: number; readonly outcome: CheckOutcome }[] }[];
};

export type HeadlessEvalResult =
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly artifactPath?: string }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly failure: {
      readonly caseId: string; readonly attempt: 1; readonly assertionId: string;
      readonly kind: 'assertion' | 'grader'; readonly actual: string; readonly expected: string;
      readonly diagnostics: readonly string[]; readonly artifactPath?: string; readonly truncated: boolean;
    } }
  | { readonly status: 'blocked'; readonly reason: 'invalid-input' | 'unavailable' | 'unsafe-artifact' | 'missing-artifact' | 'corrupt-artifact' | 'selection-mismatch' | 'non-failed-assertion' };
