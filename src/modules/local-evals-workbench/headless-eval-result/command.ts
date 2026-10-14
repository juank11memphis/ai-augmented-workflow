export type HeadlessEvalResultCommand = {
  readonly suiteId: string;
  readonly runId: string;
  readonly selection?: { readonly caseId: string; readonly attempt: 1; readonly assertionId: string };
};
