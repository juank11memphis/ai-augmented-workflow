import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

export type RawEvalSuiteDefinition = {
  readonly source: string;
  readonly payload: unknown;
  readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[];
};

export type EvalSuiteDiscoveryReaderPort = {
  readConventionalEvalSuites(projectRoot: string): Promise<readonly RawEvalSuiteDefinition[]>;
};

export type EvalSuiteDiscoveryLogEvent =
  | { readonly event: 'eval_suite_discovery_started' }
  | {
      readonly event: 'eval_suite_discovery_completed';
      readonly outcome: 'ready' | 'blocked';
      readonly suiteCount: number;
      readonly diagnosticCount: number;
      readonly unsupportedCount: number;
      readonly durationMs: number;
    };

export type EvalSuiteDiscoveryLoggerPort = {
  info(event: EvalSuiteDiscoveryLogEvent): void;
  warn(event: EvalSuiteDiscoveryLogEvent): void;
};
