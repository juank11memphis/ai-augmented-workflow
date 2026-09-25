export type PreviewEvalRunCommand = {
  readonly suiteId: string;
  readonly scope: { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string };
  readonly model: string;
  readonly judgeModel?: string | null;
  readonly repeats?: number;
};
