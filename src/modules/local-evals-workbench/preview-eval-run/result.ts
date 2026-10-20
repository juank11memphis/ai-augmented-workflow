import type { SelectionBlockReason, ModelRole, ModelChoiceSource, ResolvedCaseSelection } from '../resolve-eval-run-selection/result.js';
export type PreviewStage = 'selection' | 'description' | 'artifact-readiness' | 'resolved-inputs';
export type PreviewEvalRunResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly selectedCaseIds: readonly string[]; readonly caseSelections: readonly ResolvedCaseSelection[]; readonly expectedOutcomes: readonly { readonly caseId: string; readonly type: 'assistant-reply' | 'operational-error' }[]; readonly model: string; readonly judgeModel: string | null; readonly previewToken: string }
  | { readonly status: 'blocked'; readonly stage: PreviewStage; readonly reason: SelectionBlockReason; readonly caseId?: string; readonly role?: ModelRole; readonly source?: ModelChoiceSource }
  | { readonly status: 'error'; readonly stage: PreviewStage; readonly reason: 'unknown-cause' };
