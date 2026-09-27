import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';

export type ExecutionSelection = {
  readonly runId: string;
  readonly suite: NormalizedEvalSuite;
  readonly cases: readonly NormalizedEvalTestCase[];
  readonly model: string;
  readonly judgeModel?: string | null;
  readonly repeats?: number;
};
export type ExecutionEvent =
  | { readonly type: 'run-started' }
  | { readonly type: 'case-started'; readonly caseId: string; readonly attempt?: number }
  | { readonly type: 'turn-completed'; readonly caseId: string; readonly attempt?: number; readonly turnId: string; readonly turnIndex?: number; readonly output: string }
  | { readonly type: 'tool-recorded'; readonly caseId: string; readonly attempt: number; readonly toolId: string; readonly turnId: string; readonly position: number; readonly name: string; readonly arguments: string; readonly outcome: 'result' | 'error' | 'unexpected-response'; readonly result: string }
  | { readonly type: 'grader-completed'; readonly caseId: string; readonly attempt: number; readonly checkId: string; readonly grader: 'custom' | 'rubric'; readonly passed: boolean; readonly score: number | null; readonly threshold?: number; readonly judgeModel?: string; readonly evidence: string; readonly diagnostics: readonly string[] }
  | { readonly type: 'case-completed'; readonly caseId: string; readonly attempt?: number; readonly status: 'completed' | 'error'; readonly calls?: number | null; readonly cost?: number | null }
  | { readonly type: 'run-completed'; readonly status: 'completed' | 'error' | 'interrupted' }
  | { readonly type: 'diagnostic'; readonly code: string; readonly caseId: string | null; readonly attempt?: number | null };
export type RunnerExecutionOutcome = { readonly status: 'completed' | 'error' | 'interrupted' | 'blocked'; readonly reason?: string };
