import type { RunSelectionCommand } from '../run-configuration.js';

/** The review snapshot is compared with a fresh server-side estimate before queuing. */
export type StartEvalRunCommand = RunSelectionCommand & {
  /** Accepted opaque diagnostic reference; never persisted with run evidence. */
  readonly reference?: string;
  readonly review: {
    readonly selectedCaseIds: readonly string[];
    readonly targetCalls: number;
    readonly judgeCalls: number;
    readonly totalCalls: number;
    readonly cost: { readonly status: 'available'; readonly amount: number; readonly currency: string }
      | { readonly status: 'unavailable'; readonly reason: string };
  };
};
