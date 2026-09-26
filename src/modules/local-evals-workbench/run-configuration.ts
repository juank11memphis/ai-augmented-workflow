import type { NormalizedEvalSuite, NormalizedEvalTestCase } from './discover-conventional-eval-suites/index.js';
import type { RuntimeOutcome } from './runtime-description.js';
import type { ConsumptionEstimate } from './runtime-estimate.js';

/** Shared selection boundary for preview and start; neither slice owns the other's internals. */
export type RunSelectionCommand = {
  readonly suiteId: string;
  readonly scope: { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string };
  readonly model: string;
  readonly judgeModel?: string | null;
  readonly repeats?: number;
};
export interface RunnerEstimatorPort {
  estimate(suite: NormalizedEvalSuite, input: { readonly model: string; readonly judgeModel: string | null;
    readonly repeats: number; readonly testCases: readonly NormalizedEvalTestCase[] }): Promise<RuntimeOutcome<ConsumptionEstimate>>;
}
export interface ArtifactReadinessPort { check(): Promise<RuntimeOutcome<null>>; }
export interface CaseInputResolverPort { resolve(cases: readonly NormalizedEvalTestCase[]): Promise<RuntimeOutcome<readonly NormalizedEvalTestCase[]>>; }
