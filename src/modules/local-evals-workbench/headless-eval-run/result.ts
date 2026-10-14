import type { CheckOutcome, RunState } from '../run-history/contracts.js';

export type HeadlessRunCase = {
  readonly caseId: string;
  readonly state: 'not-run' | 'incomplete' | 'completed';
  readonly attempts: readonly { readonly number: number; readonly outcome: CheckOutcome }[];
};

export type HeadlessEvalRunResult = {
  readonly status: RunState;
  readonly runId?: string;
  readonly reason?: string;
  readonly outcome?: CheckOutcome;
  readonly cases?: readonly HeadlessRunCase[];
  readonly diagnostics?: readonly string[];
};
