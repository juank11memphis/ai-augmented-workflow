import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { ArtifactReadinessPort, CaseInputResolverPort } from '../run-configuration.js';
import type { SuiteRuntimeRegistryPort, RunnerDescriptorPort } from '../runtime-ports.js';
import type { ArtifactReaderPort, ArtifactStorePort } from '../run-history/contracts.js';

export interface HeadlessRunExecutorPort {
  execute(selection: {
    readonly runId: string;
    readonly suite: NormalizedEvalSuite;
    readonly cases: readonly NormalizedEvalTestCase[];
    readonly model: string;
    readonly judgeModel: string | null;
  }): Promise<{ readonly status: 'completed' | 'partial' | 'blocked' | 'error' | 'interrupted' | 'storage-failed'; readonly runId: string; readonly reason?: string }>;
}

export type HeadlessRunDiagnostic = {
  readonly event: 'headless_eval_run_finished' | 'headless_eval_run_blocked';
  readonly scope: 'all' | 'selected';
  readonly status: 'completed' | 'partial' | 'blocked' | 'error' | 'interrupted';
  readonly runId?: string;
  readonly reason?: string;
  readonly durationMs: number;
};

export interface HeadlessRunLoggerPort { record(event: HeadlessRunDiagnostic): void }

export type HeadlessEvalRunDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort;
  readonly inputs: CaseInputResolverPort;
  readonly artifacts: ArtifactReadinessPort;
  readonly store: Pick<ArtifactStorePort, 'create'>;
  readonly executor: HeadlessRunExecutorPort;
  readonly reader: Pick<ArtifactReaderPort, 'get'>;
  readonly logger?: HeadlessRunLoggerPort;
  readonly clock?: () => number;
};
