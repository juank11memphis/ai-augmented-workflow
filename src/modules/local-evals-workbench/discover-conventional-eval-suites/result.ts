export type EvalSuiteDiscoveryResult = EvalSuiteDiscoveryReadyResult | EvalSuiteDiscoveryBlockedResult;

export type EvalSuiteDiscoveryReadyResult = {
  readonly status: 'ready';
  readonly suites: readonly EvalSuiteSummary[];
  readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[];
};

export type EvalSuiteDiscoveryBlockedResult = {
  readonly status: 'blocked';
  readonly reason: 'missing-evals-folder' | 'no-valid-eval-suites';
  readonly message: string;
  readonly guidance: readonly string[];
  readonly suites: readonly EvalSuiteSummary[];
  readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[];
};

export type EvalSuiteSummary = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly readyTestCaseCount: number;
  readonly modelOptions: readonly EvalSuiteModelOption[];
};

export type EvalSuiteModelOption = {
  readonly id: string;
  readonly label: string;
};

export type EvalSuiteDiscoveryDiagnostic = {
  readonly code:
    | 'evals-folder-missing'
    | 'suite-file-read-failed'
    | 'suite-definition-malformed'
    | 'suite-definition-unsupported'
    | 'fixture-reference-invalid'
    | 'fixture-reference-unsafe'
    | 'fixture-read-failed';
  readonly severity: 'info' | 'warning' | 'error';
  readonly location: string;
  readonly message: string;
};
