import type { Outcome, RunDetail, Selection } from '../run-history/index.js';

export type HeadlessEvalResultReaderPort = {
  get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>>;
};

export type HeadlessEvalResultDependencies = { readonly reader: HeadlessEvalResultReaderPort };
