import type { RuntimeBlockReason } from '../runtime-description.js';
import type { Reason } from '../run-history/contracts.js';
import type { SelectionBlockReason, ModelRole } from '../resolve-eval-run-selection/result.js';

export type StartEvalRunResult =
  | { readonly status: 'queued'; readonly suiteId: string; readonly runId: string }
  | { readonly status: 'blocked'; readonly reason: RuntimeBlockReason | SelectionBlockReason | Reason | 'schedule-failed' | 'suite-changed'; readonly caseId?: string; readonly role?: ModelRole };
