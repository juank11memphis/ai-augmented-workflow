import type { EvalRunScope } from './command.js';
import type { EvalArtifact, EvalDiagnostic, EvalMetric, EvalRunStatus, EvalMatrix } from './result.js';

export type RunnableEvalSuite = {
  readonly version: 2;
  readonly id: string;
  readonly name: string;
  readonly testCases: readonly RunnableEvalTestCase[];
  readonly modelOptions: readonly RunnableEvalModelOption[];
};

export type RunnableEvalModelOption = {
  readonly id: string;
  readonly label: string;
  readonly family?: string;
  readonly priceEstimate?: string;
};

export type RunnableEvalTestCase = {
  readonly id: string;
  readonly name: string;
};

export type RawEvalAssertionOutcome = {
  readonly id: string;
  readonly label: string;
  readonly kind?: 'assertion' | 'grader';
  readonly status: EvalRunStatus;
  readonly message?: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly metrics?: readonly EvalMetric[];
  readonly diagnostics?: readonly EvalDiagnostic[];
  readonly artifacts?: readonly EvalArtifact[];
};

export type RawEvalCellOutcome = {
  readonly testCaseId: string;
  readonly status: EvalRunStatus;
  readonly output?: string;
  readonly assertions?: readonly RawEvalAssertionOutcome[];
  readonly diagnostics?: readonly EvalDiagnostic[];
  readonly metrics?: readonly EvalMetric[];
  readonly artifacts?: readonly EvalArtifact[];
  readonly durationMs?: number;
};

export type EvalRunnerCompletedOutcome = {
  readonly status: 'completed';
  readonly cells: readonly RawEvalCellOutcome[];
  readonly diagnostics?: readonly EvalDiagnostic[];
};

export type EvalRunnerBlockedOutcome = {
  readonly status: 'blocked';
  readonly message: string;
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly cells?: readonly RawEvalCellOutcome[];
};

export type EvalRunnerOutcome = EvalRunnerCompletedOutcome | EvalRunnerBlockedOutcome;

export type EvalSuiteRegistryPort = {
  findSuite(projectRoot: string, suiteId: string): Promise<RunnableEvalSuite | null>;
};

export type EvalRunnerPort = {
  runSuite(request: {
    readonly projectRoot: string;
    readonly suite: RunnableEvalSuite;
    readonly evalRunModel: RunnableEvalModelOption;
    readonly scope: EvalRunScope;
    readonly testCases: readonly RunnableEvalTestCase[];
  }): Promise<EvalRunnerOutcome>;
};

export type RunArtifactStorePort = {
  storeRunArtifact(request: {
    readonly projectRoot: string;
    readonly suiteId: string;
    readonly scope: EvalRunScope;
    readonly evalRunModel: RunnableEvalModelOption;
    readonly matrix: EvalMatrix;
  }): Promise<void>;
};

export type RunLocalEvalSuiteLogEvent =
  | { readonly event: 'local_eval_run_requested'; readonly suiteId: string; readonly scope: 'all' | 'test_case'; readonly testCaseId?: string; readonly modelId: string; readonly modelLabel: string }
  | { readonly event: 'local_eval_run_completed'; readonly suiteId: string; readonly scope: 'all' | 'test_case'; readonly testCaseId?: string; readonly modelId: string; readonly modelLabel: string; readonly rowCount: number; readonly durationMs: number; readonly outcome: EvalRunStatus }
  | { readonly event: 'local_eval_run_blocked'; readonly suiteId: string; readonly scope: 'all' | 'test_case'; readonly testCaseId?: string; readonly modelId: string; readonly reason: string; readonly durationMs: number }
  | { readonly event: 'local_eval_run_error'; readonly suiteId: string; readonly scope: 'all' | 'test_case'; readonly testCaseId?: string; readonly modelId: string; readonly reason: string; readonly durationMs: number };

export type RunLocalEvalSuiteLoggerPort = {
  info(event: RunLocalEvalSuiteLogEvent): void;
  warn(event: RunLocalEvalSuiteLogEvent): void;
  error(event: RunLocalEvalSuiteLogEvent): void;
};
