import type { RuntimeBlockReason } from '../runtime-description.js';
import type { Reason } from '../run-history/contracts.js';

export type StartEvalRunResult =
  | { readonly status: 'queued'; readonly suiteId: string; readonly runId: string }
  | { readonly status: 'blocked'; readonly reason: RuntimeBlockReason | Reason | 'review-stale' | 'schedule-failed' };
