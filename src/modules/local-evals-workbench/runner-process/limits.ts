/** Finite per-invocation ceilings; execute will need its own policy. */
export const PREVIEW_PROCESS_LIMITS = {
  requestBytes: 256_000,
  eventLineBytes: 64_000,
  stdoutBytes: 70_000,
  stderrBytes: 16_000,
  startupMs: 5_000,
  idleMs: 5_000,
  overallMs: 15_000,
  cleanupMs: 1_000,
} as const;
export type PreviewProcessLimits = { readonly [K in keyof typeof PREVIEW_PROCESS_LIMITS]: number };
