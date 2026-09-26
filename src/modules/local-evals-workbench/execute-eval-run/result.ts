import type { RunState } from '../run-history/contracts.js';
export type ExecuteEvalRunResult = { readonly status: RunState | 'storage-failed'; readonly runId: string; readonly reason?: string };
