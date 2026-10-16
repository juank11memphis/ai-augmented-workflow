import type { CheckOutcome, RunState } from '../run-history/contracts.js';
import type { LocatedAttempt } from '../run-history/failed-assertion-locators.js';

export type HeadlessRunCase = {
  readonly caseId: string;
  readonly state: 'not-run' | 'incomplete' | 'completed';
  readonly attempts: readonly LocatedAttempt[];
};

export type HeadlessEvalRunResult = {
  readonly status: RunState;
  readonly runId?: string;
  readonly reason?: string;
  readonly caseId?: string;
  readonly role?: 'tested' | 'judge';
  readonly outcome?: CheckOutcome;
  readonly cases?: readonly HeadlessRunCase[];
  readonly diagnostics?: readonly string[];
};
