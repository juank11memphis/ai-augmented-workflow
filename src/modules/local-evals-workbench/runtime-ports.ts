import type { NormalizedEvalSuite } from './discover-conventional-eval-suites/index.js';
import type { RuntimeDescription, RuntimeOutcome } from './runtime-description.js';

export interface SuiteRuntimeRegistryPort {
  load(suiteId: string): Promise<NormalizedEvalSuite | undefined>;
}

export interface RunnerDescriptorPort {
  describe(suite: NormalizedEvalSuite): Promise<RuntimeOutcome<RuntimeDescription>>;
}

export interface PreviewLoggerPort {
  record(event: { readonly event: string; readonly suiteId?: string; readonly reason?: string; readonly durationMs?: number }): void;
}
