import type { ConsumptionEstimate } from '../runtime-estimate.js';
import type { RuntimeBlockReason } from '../runtime-description.js';
export type PreviewEvalRunResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly selectedCaseIds: readonly string[]; readonly model: string; readonly judgeModel: string | null; readonly repeats: number; readonly targetCalls: number; readonly judgeCalls: number; readonly totalCalls: number; readonly cost: ConsumptionEstimate['cost']; readonly requiresConfirmation: true }
  | { readonly status: 'blocked'; readonly reason: RuntimeBlockReason };
