export type EvalRunScope =
  | { readonly type: 'all' }
  | { readonly type: 'test_case'; readonly testCaseId: string };

export type RunLocalEvalSuiteCommand = {
  readonly type: 'run-local-eval-suite';
  readonly projectRoot: string;
  readonly suiteId: string;
  readonly evalRunModel: string;
  readonly scope: EvalRunScope;
};
