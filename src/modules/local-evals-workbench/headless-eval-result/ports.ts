import type { Outcome, RunDetail, Selection } from '../run-history/index.js';
import type { EvidenceFieldRange } from '../run-history/contracts.js';

export type HeadlessEvalResultReaderPort = {
  get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>>;
  readField?(suiteId: string, runId: string, selection: Selection, locator: string, offset: number, limit: number): Promise<Outcome<EvidenceFieldRange>>;
};

export type HeadlessEvalResultDependencies = { readonly reader: HeadlessEvalResultReaderPort };
