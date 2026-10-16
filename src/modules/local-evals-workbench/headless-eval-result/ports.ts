import type { Outcome, RunDetail, Selection } from '../run-history/index.js';
import type { EvidenceFieldRange, SourceEvidence } from '../run-history/contracts.js';

export type HeadlessEvalResultReaderPort = {
  get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>>;
  readSource?(suiteId: string, runId: string, selection: Required<Selection>): Promise<Outcome<SourceEvidence | undefined>>;
  readField?(suiteId: string, runId: string, selection: Required<Selection>, locator: string, offset: number, limit: number): Promise<Outcome<EvidenceFieldRange>>;
};

export type HeadlessEvalResultDependencies = { readonly reader: HeadlessEvalResultReaderPort };
