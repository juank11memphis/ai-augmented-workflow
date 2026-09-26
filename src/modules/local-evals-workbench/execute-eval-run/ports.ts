import type { ArtifactStorePort } from '../run-history/contracts.js';
import type { ExecutionEvent, ExecutionSelection, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { PreviewLoggerPort } from '../runtime-ports.js';
import type { DeterministicAssertion } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence } from '../run-history/contracts.js';

export interface OutputAssertionEvaluatorPort {
  evaluate(assertions: readonly DeterministicAssertion[], output: string, turnId: string): readonly AssertionEvidence[];
}

export interface RunnerExecutorPort {
  execute(selection: ExecutionSelection, consume: (event: ExecutionEvent) => Promise<void>): Promise<RunnerExecutionOutcome>;
}
export type ExecuteEvalRunDependencies = {
  readonly runner: RunnerExecutorPort;
  readonly store: ArtifactStorePort;
  readonly evaluator: OutputAssertionEvaluatorPort;
  readonly clock: () => number;
  readonly logger?: PreviewLoggerPort;
};
