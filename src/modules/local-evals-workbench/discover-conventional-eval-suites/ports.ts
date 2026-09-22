import type { EvalSuiteDiscoveryDiagnostic } from './result.js';
import type { NormalizedEvalSuite } from './suite-contract.js';

export type RawEvalSuiteDefinition = {
  readonly source: string;
  readonly payload: unknown;
  readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[];
};

export type DeclaredInputInspectionResult =
  | { readonly status: 'safe' }
  | { readonly status: 'blocked'; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] };

export type EvalSuiteDiscoveryReaderPort = {
  readConventionalEvalSuites(projectRoot: string): Promise<readonly RawEvalSuiteDefinition[]>;
  inspectDeclaredInputs(projectRoot: string, source: string, suite: NormalizedEvalSuite): Promise<DeclaredInputInspectionResult>;
};

export type EvalSuiteDiscoveryLogEvent =
  | { readonly event: 'eval_suite_discovery_started' }
  | {
      readonly event: 'eval_suite_discovery_completed';
      readonly outcome: 'ready' | 'blocked';
      readonly suiteCount: number;
      readonly diagnosticCount: number;
      readonly unsupportedCount: number;
      readonly reasonCodes: readonly string[];
      readonly durationMs: number;
    };

export type EvalSuiteDiscoveryLoggerPort = {
  info(event: EvalSuiteDiscoveryLogEvent): void;
  warn(event: EvalSuiteDiscoveryLogEvent): void;
};
