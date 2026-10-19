import type { ArtifactReaderPort, Attempt, EvidenceFieldRange, HistoryEntry, Manifest, Outcome, Reason, RunDetail, Selection, SourceEvidence, StoredSourceRecord } from './contracts.js';
import { ArtifactPaths, failure } from './artifact-paths.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
import { attempt, integer, logicalId, manifest } from './validation.js';
import { LIMITS } from './limits.js';
import { compact, indexFrom, manifestCandidates } from './history-index.js';
import { boundedArtifact } from './bounded-artifact.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { judgeMatchesAssertion, sourceField, storedSourceRecord } from './source-artifact.js';
import { selectedSourceEvidence } from './selected-source-evidence.js';
import { ProviderResponseArtifact } from './provider-response-artifact.js';
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
      return selected ? { status: 'ok', value: { summary: summary.value, evidence: selected, evidenceStatus: 'available',
        ...(evidence.review ? { reviewArtifactPath: `evals/artifacts/${this.paths.attempt(suiteId, runId, selection.caseId, selection.attempt)}` } : {}) }, warnings: summary.warnings } : unavailable('not-found');
    } catch (error) { return failure(error); }
  }
  async sourceRecord(suiteId: string, runId: string, selection: Required<Selection>, recordId: string): Promise<Outcome<StoredSourceRecord>> {
    if (![suiteId, runId, selection.caseId, selection.assertionId, recordId].every(logicalId) || selection.attempt !== 1)
      return { status: 'blocked', reason: 'invalid-input' };
    const detail = await this.get(suiteId, runId, { caseId: selection.caseId, attempt: selection.attempt });
    if (detail.status !== 'ok') return detail;
    if (detail.value.evidenceStatus !== 'available') return { status: 'blocked', reason: 'not-found' };
    const reference = detail.value.evidence?.sourceCapture?.records.find(item => item.id === recordId && item.checkId === selection.assertionId);
    if (!reference) return { status: 'blocked', reason: 'not-found' };
    if (detail.value.evidence?.outcome !== 'incomplete'
      && !detail.value.evidence?.assertions.some(item => item.id === selection.assertionId)) return { status: 'blocked', reason: 'not-found' };
    const relative = this.paths.source(suiteId, runId, selection.caseId, selection.attempt, recordId);
    const safety = await new ArtifactSafetyAdapter(this.paths).check([relative]);
    if (safety.status !== 'ok') return safety;
    const stored = await this.reader.read(relative, LIMITS.sourceRecordBytes, storedSourceRecord, true);
    if (stored.status !== 'ok') return stored;
    const value = stored.value;
    if (value.suiteId !== suiteId || value.runId !== runId || value.caseId !== selection.caseId || value.attempt !== selection.attempt
      || value.record.id !== reference.id || value.record.checkId !== reference.checkId || value.record.turnId !== reference.turnId
      || value.record.kind !== reference.kind || value.status !== reference.status || value.sequence !== reference.sequence
      || Buffer.byteLength(JSON.stringify(value.record)) !== reference.byteLength) return { status: 'blocked', reason: 'corrupt' };
    if (!judgeMatchesAssertion(value.record, detail.value.evidence?.assertions ?? [])) return { status: 'blocked', reason: 'corrupt' };
    return stored;
  }
  async providerResponseRange(suiteId: string, runId: string, selection: Selection, locator: string, offset: number,
    limit = LIMITS.providerResponseRangeBytes): Promise<Outcome<EvidenceFieldRange>> {
    if (selection.assertionId !== undefined || !logicalId(selection.caseId) || selection.attempt !== 1 || typeof locator !== 'string')
      return { status: 'blocked', reason: 'invalid-input' };
    const detail = await this.get(suiteId, runId, selection);
    if (detail.status !== 'ok') return detail;
    const reference = detail.value.evidence?.providerResponses?.records.find(item => item.locator === locator);
    if (!reference) return { status: 'blocked', reason: 'not-found' };
    return new ProviderResponseArtifact(this.paths).range(suiteId, runId, selection.caseId, selection.attempt, reference, offset, limit);
  }
  async selectedSource(suiteId: string, runId: string, selection: Required<Selection>): Promise<Outcome<SourceEvidence | undefined>> {
    const selected = await this.get(suiteId, runId, { caseId: selection.caseId, attempt: selection.attempt });
    if (selected.status !== 'ok') return selected;
    const attempt = selected.value.evidence;
    if (!attempt || !attempt.assertions.some(item => item.id === selection.assertionId
      && (item.outcome === 'failed' || item.gradingError !== undefined)))
      return { status: 'blocked', reason: 'not-found' };
    const references = attempt.sourceCapture?.records.filter(item => item.checkId === selection.assertionId) ?? [];
    const records: StoredSourceRecord[] = [];
    for (const reference of references) {
      const read = await this.sourceRecord(suiteId, runId, selection, reference.id);
      if (read.status !== 'ok') return read;
      records.push(read.value);
    }
    const source = selectedSourceEvidence(attempt, selection.assertionId, records);
    return references.length > 0 && !source ? { status: 'blocked', reason: 'corrupt' } : { status: 'ok', value: source };
  }
  async sourceFieldRange(suiteId: string, runId: string, selection: Required<Selection>, locator: string, offset: number,
    limit = LIMITS.sourceFieldRangeBytes): Promise<Outcome<EvidenceFieldRange>> {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > LIMITS.sourceFieldRangeBytes ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}~[A-Za-z][A-Za-z0-9-]{0,40}$/.test(locator))
      return { status: 'blocked', reason: 'invalid-input' };
    const split = locator.indexOf('~');
    const stored = await this.sourceRecord(suiteId, runId, selection, locator.slice(0, split));
    if (stored.status !== 'ok') return stored;
    const record = stored.value.record;
    const key = locator.slice(split + 1);
    if (record.redactedFields?.some(field => key === field || key.startsWith(`${field}-`))) return { status: 'blocked', reason: 'unavailable' };
    const field = sourceField(record, key);
    if (field === undefined) return { status: 'blocked', reason: 'not-found' };
    const bytes = Buffer.from(field, 'utf8');
    if (offset > bytes.length) return { status: 'blocked', reason: 'invalid-input' };
    const end = Math.min(bytes.length, offset + limit);
    return { status: 'ok', value: { locator, offset, byteLength: bytes.length, bytes: bytes.subarray(offset, end),
      nextOffset: end < bytes.length ? end : null } };
  }
  private async summary(suiteId: string, runId: string): Promise<Outcome<Manifest>> {
    const result = await this.reader.read(this.paths.run(suiteId, runId), LIMITS.manifestBytes, manifest); if (result.status !== 'ok') return result;
    if (result.value.runId !== runId || result.value.suiteId !== suiteId) return { status: 'blocked', reason: 'corrupt' };
    const safe = boundedArtifact(result.value, LIMITS.manifestBytes, manifest); if (safe.status !== 'ok') return safe;
    const classified = this.recovery ? await this.recovery.classify(safe.value) : safe;
    if (classified.status !== 'ok') return classified;
    return { ...classified, value: { ...classified.value, cases: classified.value.cases.map(item => ({
      ...item, testedModel: item.testedModel ?? classified.value.testedModel,
      judgeModel: item.judgeModel === undefined ? classified.value.judgeModel : item.judgeModel,
    })) } };
  }
}
function selectEvidence(evidence: Attempt, assertionId?: string): Attempt | undefined {
  if (!assertionId) return evidence;
  const assertion = evidence.assertions.find(a => a.id === assertionId); if (!assertion) return undefined;
  return { ...evidence, output: '', diagnostics: [], assertions: [assertion],
    turns: evidence.turns.filter(t => assertion.turnIds.includes(t.id)), tools: evidence.tools.filter(t => assertion.toolIds.includes(t.id)) };
}
