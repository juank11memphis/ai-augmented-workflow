import type { ArtifactReaderPort, Attempt, HistoryEntry, Manifest, Outcome, Reason, RunDetail, Selection } from './contracts.js';
import { ArtifactPaths, failure } from './artifact-paths.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
import { attempt, integer, logicalId, manifest } from './validation.js';
import { LIMITS } from './limits.js';
import { compact, indexFrom, manifestCandidates } from './history-index.js';
import { boundedArtifact } from './bounded-artifact.js';
export class FileArtifactReader implements ArtifactReaderPort {
  constructor(private readonly paths: ArtifactPaths, private readonly reader: BoundedArtifactReader,
    private readonly recovery?: InterruptedRunRecovery) {}
  async list(suiteId: string, limit: number): Promise<Outcome<readonly HistoryEntry[]>> {
    if (!logicalId(suiteId) || !integer(limit, LIMITS.history) || limit < 1) return { status: 'blocked', reason: 'invalid-input' };
    try {
      const candidates = await manifestCandidates(this.paths, suiteId, this.reader); if (candidates.status !== 'ok') return candidates;
      const entries: HistoryEntry[] = []; const warnings: Reason[] = [...(candidates.warnings ?? [])];
      let unreadable: Reason | undefined;
      for (const runId of candidates.value) {
        const run = await this.summary(suiteId, runId);
        if (run.status === 'ok') { entries.push(compact(run.value)); warnings.push(...(run.warnings ?? [])); }
        else { warnings.push(run.reason); unreadable ??= run.reason; }
      }
      if (candidates.value.length > 0 && entries.length === 0) return { status: 'blocked', reason: unreadable ?? 'unavailable' };
      return { status: 'ok', value: indexFrom(entries).entries.slice(0, limit), warnings: [...new Set(warnings)] };
    } catch (error) { return failure(error); }
  }
  async get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>> {
    if (![suiteId, runId].every(logicalId) || selection && (!logicalId(selection.caseId) || selection.attempt !== 1 || selection.assertionId !== undefined && !logicalId(selection.assertionId))) return { status: 'blocked', reason: 'invalid-input' };
    try {
      const summary = await this.summary(suiteId, runId); if (summary.status !== 'ok') return summary;
      if (!selection) return { status: 'ok', value: { summary: summary.value, evidenceStatus: 'not-requested' }, warnings: summary.warnings };
      const referenced = summary.value.cases.find(c => c.caseId === selection.caseId)?.attempts.find(a => a.number === selection.attempt);
      const unavailable = (reason: Reason): Outcome<RunDetail> => ({ status: 'ok', value: { summary: summary.value, evidenceStatus: 'unavailable' }, warnings: [...(summary.warnings ?? []), reason] });
      if (!referenced) return unavailable('not-found');
      const result = await this.reader.read(this.paths.attempt(suiteId, runId, selection.caseId, selection.attempt), LIMITS.attemptBytes, attempt);
      if (result.status !== 'ok') return unavailable(result.reason);
      const safe = boundedArtifact(result.value, LIMITS.attemptBytes, attempt); if (safe.status !== 'ok') return unavailable(safe.reason);
      const evidence = safe.value;
      if (evidence.runId !== runId || evidence.suiteId !== suiteId || evidence.caseId !== selection.caseId || evidence.number !== selection.attempt || evidence.outcome !== referenced.outcome
        || evidence.durationMs !== referenced.durationMs || evidence.calls !== referenced.calls || evidence.cost !== referenced.cost
        || JSON.stringify(evidence.assertions.filter(item => item.judgeModel !== undefined && item.score !== null).map(item => item.score)) !== JSON.stringify(referenced.rubricScores ?? [])) return unavailable('corrupt');
      const selected = selectEvidence(evidence, selection.assertionId);
      return selected ? { status: 'ok', value: { summary: summary.value, evidence: selected, evidenceStatus: 'available' }, warnings: summary.warnings } : unavailable('not-found');
    } catch (error) { return failure(error); }
  }
  private async summary(suiteId: string, runId: string): Promise<Outcome<Manifest>> {
    const result = await this.reader.read(this.paths.run(suiteId, runId), LIMITS.manifestBytes, manifest); if (result.status !== 'ok') return result;
    if (result.value.runId !== runId || result.value.suiteId !== suiteId) return { status: 'blocked', reason: 'corrupt' };
    const safe = boundedArtifact(result.value, LIMITS.manifestBytes, manifest); if (safe.status !== 'ok') return safe;
    return this.recovery ? this.recovery.classify(safe.value) : safe;
  }
}
function selectEvidence(evidence: Attempt, assertionId?: string): Attempt | undefined {
  if (!assertionId) return evidence;
  const assertion = evidence.assertions.find(a => a.id === assertionId); if (!assertion) return undefined;
  return { ...evidence, output: '', diagnostics: [], assertions: [assertion],
    turns: evidence.turns.filter(t => assertion.turnIds.includes(t.id)), tools: evidence.tools.filter(t => assertion.toolIds.includes(t.id)) };
}
