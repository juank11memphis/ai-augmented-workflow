import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';

export type ExecutionSelection = {
  readonly runId: string;
  readonly suite: NormalizedEvalSuite;
  readonly cases: readonly NormalizedEvalTestCase[];
  readonly model: string;
};
export type ExecutionEvent =
  | { readonly type: 'run-started' }
  | { readonly type: 'case-started'; readonly caseId: string }
  | { readonly type: 'turn-completed'; readonly caseId: string; readonly turnId: string; readonly output: string }
  | { readonly type: 'case-completed'; readonly caseId: string; readonly status: 'completed' | 'error' }
  | { readonly type: 'run-completed'; readonly status: 'completed' | 'error' | 'interrupted' }
  | { readonly type: 'diagnostic'; readonly code: string; readonly caseId: string | null };
export type RunnerExecutionOutcome = { readonly status: 'completed' | 'error' | 'interrupted' | 'blocked'; readonly reason?: string };
