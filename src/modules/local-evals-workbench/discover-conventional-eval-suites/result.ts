import type { NormalizedEvalSuite } from './suite-contract.js';

export type EvalSuiteDiscoveryResult = EvalSuiteDiscoveryReadyResult | EvalSuiteDiscoveryBlockedResult;
export type InternalEvalSuiteDiscoveryResult =
  | (EvalSuiteDiscoveryReadyResult & { readonly definitions: readonly NormalizedEvalSuite[] })
  | (EvalSuiteDiscoveryBlockedResult & { readonly definitions: readonly NormalizedEvalSuite[] });

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
  readonly testCases: readonly EvalSuiteTestCaseSummary[];
  /** Model discovery belongs to the future runner describe slice. */
  readonly modelOptions: readonly EvalSuiteModelOption[];
};

export type EvalSuiteTestCaseSummary = { readonly id: string; readonly name: string };

export type EvalSuiteModelOption = {
  readonly id: string;
  readonly label: string;
  readonly family?: string;
  readonly priceEstimate?: string;
};

export type EvalSuiteDiscoveryDiagnosticCode =
  | 'evals-folder-missing'
  | 'suite-file-read-failed'
  | 'suite-definition-malformed'
  | 'suite-definition-unsupported'
  | 'suite-id-duplicate'
  | 'declared-path-invalid'
  | 'declared-path-unsafe'
  | 'declared-file-missing'
  | 'declared-file-unreadable'
  | 'sensitive-content-detected';

export type EvalSuiteDiscoveryDiagnostic = {
  readonly code: EvalSuiteDiscoveryDiagnosticCode;
  readonly reason?: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly location: string;
  readonly message: string;
  readonly guidance?: readonly string[];
};

export function toPublicEvalSuiteDiscoveryResult(result: InternalEvalSuiteDiscoveryResult): EvalSuiteDiscoveryResult {
  const { definitions: _definitions, ...publicResult } = result;
  return publicResult;
}
