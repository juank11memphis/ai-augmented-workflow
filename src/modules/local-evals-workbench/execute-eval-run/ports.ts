import type { ArtifactStorePort } from '../run-history/contracts.js';
import type { ExecutionEvent, ExecutionSelection, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { DeterministicAssertion } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence, ToolEvidence, TurnEvidence } from '../run-history/contracts.js';

export type AttemptSnapshot = { readonly output: string; readonly turns: readonly TurnEvidence[]; readonly tools: readonly ToolEvidence[] };

export interface OutputAssertionEvaluatorPort {
  evaluate(assertions: readonly DeterministicAssertion[], snapshot: AttemptSnapshot): readonly AssertionEvidence[];
}

export interface RunnerExecutorPort {
  execute(selection: ExecutionSelection, consume: (event: ExecutionEvent) => Promise<void>): Promise<RunnerExecutionOutcome>;
}
export type ExecutionDiagnostic = {
  readonly event: 'eval_run_started' | 'eval_run_finished' | 'eval_run_start_blocked' | 'eval_run_storage_failed';
  readonly stage: 'execution';
  readonly outcome: 'started' | 'completed' | 'blocked' | 'partial' | 'interrupted' | 'failed';
  readonly reason?: string;
  readonly reference?: string;
  readonly runId?: string;
  readonly durationMs: number;
};
export interface ExecutionLoggerPort { record(event: ExecutionDiagnostic): void }
export type ExecuteEvalRunDependencies = {
  readonly runner: RunnerExecutorPort;
  readonly store: ArtifactStorePort;
  readonly evaluator: OutputAssertionEvaluatorPort;
  readonly clock: () => number;
  readonly logger?: ExecutionLoggerPort;
};
