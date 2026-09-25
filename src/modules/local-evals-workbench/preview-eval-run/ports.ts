import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { RunnerDescriptorPort, SuiteRuntimeRegistryPort, PreviewLoggerPort } from '../runtime-ports.js';
import type { RuntimeOutcome } from '../runtime-description.js';
import type { ConsumptionEstimate } from '../runtime-estimate.js';
export type { RunnerDescriptorPort, SuiteRuntimeRegistryPort, PreviewLoggerPort } from '../runtime-ports.js';
export interface RunnerEstimatorPort {
  estimate(suite: NormalizedEvalSuite, input: { readonly model: string; readonly judgeModel: string | null; readonly repeats: number; readonly testCases: readonly NormalizedEvalTestCase[] }): Promise<RuntimeOutcome<ConsumptionEstimate>>;
}
export interface ArtifactReadinessPort { check(): Promise<RuntimeOutcome<null>>; }
export interface CaseInputResolverPort { resolve(cases: readonly NormalizedEvalTestCase[]): Promise<RuntimeOutcome<readonly NormalizedEvalTestCase[]>>; }
