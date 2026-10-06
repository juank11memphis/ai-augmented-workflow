import type { RuntimeBlockReason } from '../runtime-description.js';
export type PreviewStage = 'selection' | 'description' | 'artifact-readiness' | 'resolved-inputs';
export type PreviewEvalRunResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly selectedCaseIds: readonly string[]; readonly model: string; readonly judgeModel: string | null }
  | { readonly status: 'blocked'; readonly stage: PreviewStage; readonly reason: RuntimeBlockReason }
  | { readonly status: 'error'; readonly stage: PreviewStage; readonly reason: 'unknown-cause' };
