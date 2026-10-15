import type { RunnerDescriptorPort, SuiteRuntimeRegistryPort } from '../runtime-ports.js';

export type ResolveEvalRunSelectionPorts = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort;
};
