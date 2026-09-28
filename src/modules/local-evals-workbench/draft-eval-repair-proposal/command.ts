export type DraftEvalRepairProposalCommand = {
  readonly projectRoot: string;
  readonly suiteId: string;
  readonly runId: string;
  readonly attempt: number;
  readonly testCaseId: string;
  readonly evalRunModelId: string;
  readonly runScope: DraftEvalRepairProposalRunScope;
  readonly assertionId: string;
  readonly analysisId: string;
  readonly repairDirection: RepairDirection;
};

export type DraftEvalRepairProposalRunScope =
  | { readonly type: 'all' }
  | { readonly type: 'test_case'; readonly testCaseId: string };

export type RepairDirection =
  | { readonly type: 'prompt_issue' }
  | { readonly type: 'eval_assertion_issue' }
  | { readonly type: 'fixture_input_issue' }
  | { readonly type: 'regression_case' }
  | { readonly type: 'custom'; readonly instruction: string };

export type DraftProposalPriorAnalysis = {
  readonly summary: string;
  readonly likelyCause?: 'prompt_issue' | 'eval_assertion_issue' | 'fixture_input_issue' | 'model_nondeterminism' | 'unclear_needs_human_judgment';
};
