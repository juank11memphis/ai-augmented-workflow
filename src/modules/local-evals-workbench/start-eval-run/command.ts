import type { RunSetupCommand } from '../run-configuration.js';

export type StartEvalRunCommand = RunSetupCommand & {
  /** Accepted opaque diagnostic reference; never persisted with run evidence. */
  readonly reference?: string;
};
