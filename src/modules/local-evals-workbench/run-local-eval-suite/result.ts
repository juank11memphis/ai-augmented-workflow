export type EvalRunStatus = 'passed' | 'failed' | 'blocked' | 'error';

export type EvalDiagnostic = {
  readonly code: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
  readonly location?: string;
};

export type EvalMetric = {
  readonly name: string;
  readonly value: number;
  readonly unit?: string;
};

export type EvalArtifact = {
  readonly id: string;
  readonly label: string;
  readonly kind: 'output-preview' | 'diagnostic' | 'metric' | 'file' | 'trace';
  readonly preview?: string;
  readonly reference?: string;
};

export type EvalAssertionResult = {
  readonly id: string;
  readonly label: string;
  readonly kind: 'assertion' | 'grader';
  readonly status: EvalRunStatus;
  readonly message?: string;
  readonly expectedPreview?: string;
  readonly actualPreview?: string;
  readonly metrics: readonly EvalMetric[];
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly artifacts: readonly EvalArtifact[];
};

export type EvalCell = {
  readonly testCaseId: string;
  readonly modelId: string;
  readonly modelLabel: string;
  readonly status: EvalRunStatus;
  readonly outputPreview: string | null;
  readonly assertions: readonly EvalAssertionResult[];
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly metrics: readonly EvalMetric[];
  readonly artifacts: readonly EvalArtifact[];
  readonly durationMs: number | null;
};

export type EvalMatrixRow = {
  readonly testCaseId: string;
  readonly name: string;
  readonly status: EvalRunStatus;
  readonly cells: readonly EvalCell[];
};

export type EvalRunAggregates = {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly blocked: number;
  readonly error: number;
};

export type EvalMatrix = {
  readonly suiteId: string;
  readonly suiteName: string;
  readonly status: EvalRunStatus;
  readonly rows: readonly EvalMatrixRow[];
  readonly aggregates: EvalRunAggregates;
  readonly diagnostics: readonly EvalDiagnostic[];
};

export type RunLocalEvalSuiteCompletedResult = {
  readonly status: 'completed';
  readonly scope: 'all' | 'test_case';
  readonly matrix: EvalMatrix;
};

export type RunLocalEvalSuiteBlockedResult = {
  readonly status: 'blocked';
  readonly reason: 'invalid-suite-id' | 'invalid-test-case-id' | 'unsupported-model' | 'runner-blocked';
  readonly message: string;
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly matrix?: EvalMatrix;
};

export type RunLocalEvalSuiteErrorResult = {
  readonly status: 'error';
  readonly reason: 'runner-error' | 'artifact-store-error';
  readonly message: string;
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly matrix?: EvalMatrix;
};

export type RunLocalEvalSuiteResult = RunLocalEvalSuiteCompletedResult | RunLocalEvalSuiteBlockedResult | RunLocalEvalSuiteErrorResult;
