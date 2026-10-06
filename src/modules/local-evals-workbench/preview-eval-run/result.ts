import type { ConsumptionEstimate } from '../runtime-estimate.js';
import type { RuntimeBlockReason } from '../runtime-description.js';
export type PreviewStage = 'selection' | 'description' | 'artifact-readiness' | 'resolved-inputs' | 'estimation';
export type PreviewEvalRunResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly selectedCaseIds: readonly string[]; readonly model: string; readonly judgeModel: string | null; readonly targetCalls: number; readonly judgeCalls: number; readonly totalCalls: number; readonly cost: ConsumptionEstimate['cost']; readonly requiresConfirmation: true }
  | { readonly status: 'blocked'; readonly stage: PreviewStage; readonly reason: RuntimeBlockReason }
  | { readonly status: 'error'; readonly stage: PreviewStage; readonly reason: 'unknown-cause' };
