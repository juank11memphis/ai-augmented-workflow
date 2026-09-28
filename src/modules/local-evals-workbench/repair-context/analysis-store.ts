import { randomUUID } from 'node:crypto';
import type { FailureSelection } from './selected-evidence.js';
import type { FailureAnalysis } from './contracts.js';

export type StoredFailureAnalysis = { readonly selection: FailureSelection; readonly analysis: FailureAnalysis };

export class InMemoryFailureAnalysisStore {
  private readonly analyses = new Map<string, StoredFailureAnalysis>();

  save(selection: FailureSelection, analysis: FailureAnalysis): string {
    const id = `analysis_${randomUUID()}`;
    this.analyses.set(id, { selection: { ...selection }, analysis: { ...analysis } });
    return id;
  }

  get(id: string, selection: FailureSelection): FailureAnalysis | null {
    const stored = this.analyses.get(id);
    if (!stored) return null;
    const same = stored.selection.suiteId === selection.suiteId && stored.selection.runId === selection.runId
      && stored.selection.testCaseId === selection.testCaseId && stored.selection.attempt === selection.attempt
      && stored.selection.assertionId === selection.assertionId;
    return same ? stored.analysis : null;
  }
}
