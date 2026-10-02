import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { ArtifactStorePort } from '../run-history/contracts.js';
import type { ArtifactReadinessPort, CaseInputResolverPort, RunnerEstimatorPort } from '../run-configuration.js';
import type { RunnerDescriptorPort, SuiteRuntimeRegistryPort } from '../runtime-ports.js';
import type { StartEvalRunResult } from './result.js';

export type StartRunDiagnostic = {
  readonly event: 'eval_run_start_blocked' | 'eval_run_queued';
  readonly stage: 'run-start';
  readonly outcome: 'blocked' | 'queued';
  readonly reason?: Extract<StartEvalRunResult, { status: 'blocked' }>['reason'];
  readonly reference?: string;
  readonly runId?: string;
  readonly durationMs: number;
};

export interface StartRunLoggerPort {
  record(event: StartRunDiagnostic): void;
}

export interface RunSchedulerPort {
  schedule(selection: {
    readonly runId: string;
    readonly suite: NormalizedEvalSuite;
    readonly cases: readonly NormalizedEvalTestCase[];
    readonly model: string;
    readonly judgeModel: string | null;
    readonly repeats: number;
    readonly reference?: string;
  }): void;
}

export type StartEvalRunDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort & RunnerEstimatorPort;
  readonly inputs: CaseInputResolverPort;
  readonly artifacts: ArtifactReadinessPort;
  readonly store: ArtifactStorePort;
  readonly scheduler: RunSchedulerPort;
  readonly logger?: StartRunLoggerPort;
};
