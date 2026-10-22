import type { CheckOutcome, RunState } from '../run-history/contracts.js';
import type { LocatedAttempt } from '../run-history/failed-assertion-locators.js';

export type HeadlessRunCase = {
  readonly caseId: string;
  readonly testedModel: string;
  readonly judgeModel: string | null;
  readonly state: 'not-run' | 'incomplete' | 'completed';
  readonly attempts: readonly LocatedAttempt[];
};

export type HeadlessEvalRunResult = {
  readonly status: RunState;
  readonly runId?: string;
  readonly reason?: string;
  readonly caseId?: string;
  readonly role?: 'tested' | 'judge';
  readonly source?: 'suite-default' | 'case-override' | 'run-only';
  readonly outcome?: CheckOutcome;
  readonly cases?: readonly HeadlessRunCase[];
  readonly nextLocatorOffset?: number;
  readonly nextCaseOffset?: number;
  readonly diagnostics?: readonly string[];
};
