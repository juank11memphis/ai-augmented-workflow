export type AnalyzeFailedAssertionCommand = {
  readonly projectRoot: string;
  readonly suiteId: string;
  readonly runId: string;
  readonly attempt: number;
  readonly testCaseId: string;
  readonly evalRunModelId: string;
  readonly runScope: AnalyzeFailedAssertionRunScope;
  readonly assertionId: string;
};

export type AnalyzeFailedAssertionRunScope =
  | { readonly type: 'all' }
  | { readonly type: 'test_case'; readonly testCaseId: string };
