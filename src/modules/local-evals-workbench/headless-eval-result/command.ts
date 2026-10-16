export type HeadlessEvalResultCommand = {
  readonly suiteId: string;
  readonly runId: string;
  readonly selection?: { readonly caseId: string; readonly attempt: number; readonly assertionId: string };
  readonly field?: { readonly locator: string; readonly offset: number };
};
