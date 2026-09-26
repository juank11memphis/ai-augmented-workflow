import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { ArtifactStorePort } from '../run-history/contracts.js';
import type { ArtifactReadinessPort, CaseInputResolverPort, RunnerEstimatorPort } from '../run-configuration.js';
import type { PreviewLoggerPort, RunnerDescriptorPort, SuiteRuntimeRegistryPort } from '../runtime-ports.js';

export interface RunSchedulerPort {
  schedule(selection: {
    readonly runId: string;
    readonly suite: NormalizedEvalSuite;
    readonly cases: readonly NormalizedEvalTestCase[];
    readonly model: string;
  }): void;
}

export type StartEvalRunDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort & RunnerEstimatorPort;
  readonly inputs: CaseInputResolverPort;
  readonly artifacts: ArtifactReadinessPort;
  readonly store: ArtifactStorePort;
  readonly scheduler: RunSchedulerPort;
  readonly logger?: PreviewLoggerPort;
};
