import type { RunSelectionCommand } from '../run-configuration.js';

export type StartEvalRunCommand = RunSelectionCommand & {
  /** Accepted opaque diagnostic reference; never persisted with run evidence. */
  readonly reference?: string;
};
