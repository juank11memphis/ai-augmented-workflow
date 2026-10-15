import type { RuntimeBlockReason } from '../runtime-description.js';

export type ModelRole = 'tested' | 'judge';
export type ResolvedCaseSelection = {
  readonly caseId: string;
  readonly testedModel: string;
  readonly judgeModel: string | null;
};

export type SelectionBlockReason =
  | 'suite-unavailable' | 'case-unavailable' | 'missing-suite-default'
  | 'saved-model-unavailable' | 'invalid-run-only-choice'
  | 'run-only-scope-unsupported' | 'run-only-model-unavailable'
  | RuntimeBlockReason;

export type ResolveEvalRunSelectionResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly cases: readonly ResolvedCaseSelection[] }
  | { readonly status: 'blocked'; readonly reason: SelectionBlockReason; readonly suiteId: string;
      readonly caseId?: string; readonly role?: ModelRole };
