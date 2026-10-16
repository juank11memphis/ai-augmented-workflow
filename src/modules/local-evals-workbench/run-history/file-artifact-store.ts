import { mkdir } from 'node:fs/promises';
import type { ArtifactStorePort, ArtifactLogger, Attempt, Manifest, Outcome, OwnerPort, RunConfiguration, RunState, SourceReference, SourceRecordWrite } from './contracts.js';
import { ArtifactFault, component, failure } from './artifact-paths.js';
import { AtomicArtifactFile, SafetyFault } from './atomic-artifact-file.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { active, attempt, configuration, logicalId, manifest, historyIndex } from './validation.js';
import { LIMITS } from './limits.js';
import { boundedArtifact } from './bounded-artifact.js';
import { runIdentity } from './run-identity.js';
import { serialized } from './active-run-owner.js';
import { appendAttempt, transition } from './lifecycle.js';
import { collectHistory, compact, indexFrom } from './history-index.js';
import { storedSourceRecord } from './source-artifact.js';
export type StoreDependencies = {
  readonly files: AtomicArtifactFile; readonly reader: BoundedArtifactReader; readonly owner: OwnerPort;
  readonly clock: () => number; readonly logger: ArtifactLogger;
  readonly generateId?: (now: number) => string;
};
export class FileArtifactStore implements ArtifactStorePort {
  constructor(private readonly dependencies: StoreDependencies) {}
  private get paths() { return this.dependencies.files.paths; }
  async create(input: RunConfiguration): Promise<Outcome<Manifest>> {
    const config = boundedArtifact(input, LIMITS.manifestBytes, configuration);
    if (config.status !== 'ok') return this.report(config);
    return this.mutate(async () => {
      const now = this.dependencies.clock();
      const runId = await this.reserve(config.value.suiteId, now);
      const { caseSelections, ...storedConfig } = config.value;
      const run: Manifest = { ...storedConfig, version: 1, runId, state: 'queued', owner: this.dependencies.owner.identity,
        createdAt: now, updatedAt: now, finishedAt: null, outcome: 'incomplete', calls: null, cost: null, diagnostics: [],
        cases: config.value.caseIds.map((caseId, index) => ({ caseId, state: 'not-run', attempts: [],
          ...(caseSelections ? { testedModel: caseSelections[index]!.testedModel, judgeModel: caseSelections[index]!.judgeModel } : {}) })) };
      const safe = this.safeManifest(run); if (safe.status !== 'ok') return safe;
      return this.persist(safe.value);
    });
  }
  async start(suiteId: string, runId: string): Promise<Outcome<Manifest>> {
    return this.update(suiteId, runId, run => transition(run, 'running', this.dependencies.clock()));
  }
  async append(suiteId: string, runId: string, input: Attempt): Promise<Outcome<Manifest>> {
    const safe = boundedArtifact(input, LIMITS.attemptBytes, attempt); if (safe.status !== 'ok') return this.report(safe);
    return this.update(suiteId, runId, async run => {
      const updated = appendAttempt(run, safe.value, this.dependencies.clock()); if (updated.status !== 'ok') return updated;
      for (const reference of safe.value.sourceCapture?.records ?? []) {
        const path = this.paths.source(suiteId, runId, safe.value.caseId, safe.value.number, reference.id);
        await this.dependencies.files.ready(path);
        const stored = await this.dependencies.reader.read(path, LIMITS.sourceRecordBytes, storedSourceRecord, true);
        if (stored.status !== 'ok' || stored.value.suiteId !== suiteId || stored.value.runId !== runId
          || stored.value.caseId !== safe.value.caseId || stored.value.attempt !== safe.value.number
          || stored.value.record.id !== reference.id || stored.value.record.kind !== reference.kind || stored.value.status !== reference.status
          || stored.value.record.checkId !== reference.checkId || stored.value.record.turnId !== reference.turnId
          || stored.value.sequence !== reference.sequence || Buffer.byteLength(JSON.stringify(stored.value.record)) !== reference.byteLength)
          return { status: 'blocked', reason: 'corrupt' };
      }
      const valid = this.safeManifest(updated.value); if (valid.status !== 'ok') return valid;
      await this.dependencies.files.write(this.paths.attempt(suiteId, runId, safe.value.caseId, safe.value.number), safe.value);
      return valid;
    });
  }
  async saveSourceRecord(value: SourceRecordWrite): Promise<Outcome<SourceReference>> {
    let bytes: number;
    try { bytes = Buffer.byteLength(JSON.stringify(value.record)); }
    catch { return { status: 'blocked', reason: 'invalid-input' }; }
    const complete = { ...value, status: 'complete' as const, byteLength: bytes };
    if (!storedSourceRecord(complete)) return { status: 'blocked', reason: 'invalid-input' };
    const { suiteId, runId, caseId, attempt: number, record } = value;
    try {
      return await serialized(this.paths.root, async () => {
        const loaded = await this.load(suiteId, runId);
        if (loaded.status !== 'ok') return loaded;
        if (loaded.value.state !== 'running' || !loaded.value.cases.some(item => item.caseId === caseId)
          || loaded.value.owner.pid !== this.dependencies.owner.identity.pid
          || loaded.value.owner.token !== this.dependencies.owner.identity.token) return { status: 'blocked', reason: 'invalid-transition' };
        const path = this.paths.source(suiteId, runId, caseId, number, record.id);
        await this.dependencies.files.ready(path);
        const existing = await this.dependencies.reader.read(path, LIMITS.sourceRecordBytes, storedSourceRecord, true);
        if (existing.status === 'blocked' && existing.reason !== 'not-found') return existing;
        if (existing.status === 'ok') return { status: 'blocked', reason: 'corrupt' };
        await this.dependencies.files.write(path, complete);
        return { status: 'ok', value: { id: record.id, kind: record.kind, status: 'complete', checkId: record.checkId,
          turnId: record.turnId, sequence: value.sequence, byteLength: bytes } };
      });
    } catch (error) { return error instanceof SafetyFault ? { status: 'blocked', reason: error.reason } : failure(error); }
  }
  async finalize(suiteId: string, runId: string, state: Exclude<RunState, 'queued' | 'running'>, diagnostics?: readonly string[]): Promise<Outcome<Manifest>> {
    if (!['completed', 'partial', 'blocked', 'error', 'interrupted'].includes(state)) return { status: 'blocked', reason: 'invalid-transition' };
    return this.update(suiteId, runId, async run => {
      const integrity = await this.attemptIntegrity(run); if (!integrity) return { status: 'blocked', reason: 'corrupt' };
      return transition(run, state, this.dependencies.clock(), diagnostics);
    });
  }
  async recover(suiteId: string, runId: string): Promise<Outcome<Manifest>> {
    return this.mutate(async () => {
      const result = await this.load(suiteId, runId); if (result.status !== 'ok' || !active(result.value.state)) return result;
      if (await this.dependencies.owner.check(result.value.owner) !== 'stopped') return { status: 'blocked', reason: 'owner-unknown' };
      const interrupted = transition(result.value, 'interrupted', Math.max(result.value.updatedAt, this.dependencies.clock()));
      if (interrupted.status !== 'ok') return interrupted;
      const persisted = await this.persist(interrupted.value);
      if (persisted.status === 'ok') this.dependencies.logger.emit({ event: 'artifact-recovered', state: 'interrupted' });
      return persisted;
    });
  }
  private async update(suiteId: string, runId: string, change: (run: Manifest) => Outcome<Manifest> | Promise<Outcome<Manifest>>): Promise<Outcome<Manifest>> {
    if (![suiteId, runId].every(logicalId)) return { status: 'blocked', reason: 'invalid-input' };
    return this.mutate(async () => {
      const result = await this.load(suiteId, runId); if (result.status !== 'ok') return result;
      const run = result.value;
      if (run.owner.pid !== this.dependencies.owner.identity.pid || run.owner.token !== this.dependencies.owner.identity.token) return { status: 'blocked', reason: 'owner-unknown' };
      const next = await change(run); return next.status === 'ok' ? this.persist(next.value) : next;
    });
  }
  private async reserve(suiteId: string, now: number): Promise<string> {
    await this.dependencies.files.directory(component(suiteId));
    for (let tries = 0; tries < 5; tries++) {
      const id = (this.dependencies.generateId ?? runIdentity)(now);
      if (!logicalId(id)) throw new ArtifactFault('unsafe-path');
      const target = await this.dependencies.files.ready(`${component(suiteId)}/${component(id)}`);
      try { await mkdir(target, { mode: 0o700 }); return id; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
    throw new ArtifactFault('unavailable');
  }
  private async load(suiteId: string, runId: string): Promise<Outcome<Manifest>> {
    const result = await this.dependencies.reader.read(this.paths.run(suiteId, runId), LIMITS.manifestBytes, manifest);
    return result.status === 'ok' && (result.value.suiteId !== suiteId || result.value.runId !== runId) ? { status: 'blocked', reason: 'corrupt' } : result;
  }
  private safeManifest(run: Manifest) { return boundedArtifact(run, LIMITS.manifestBytes, manifest); }
  private async persist(run: Manifest): Promise<Outcome<Manifest>> {
    const safe = this.safeManifest(run); if (safe.status !== 'ok') return safe;
    await this.dependencies.files.write(this.paths.run(run.suiteId, run.runId), safe.value);
    const history = await collectHistory(this.paths, run.suiteId, this.dependencies.reader);
    if (history.status !== 'ok') return history;
    const index = indexFrom([...history.value.entries, compact(safe.value)]);
    const safeIndex = boundedArtifact(index, LIMITS.indexBytes, historyIndex); if (safeIndex.status !== 'ok') return safeIndex;
    await this.dependencies.files.write(this.paths.index(run.suiteId), safeIndex.value);
    this.dependencies.logger.emit({ event: 'artifact-persisted', state: run.state, count: run.cases.length });
    return { status: 'ok', value: safe.value, warnings: history.warnings };
  }
  private async attemptIntegrity(run: Manifest): Promise<boolean> {
    for (const item of run.cases) for (const summary of item.attempts) {
      const read = await this.dependencies.reader.read(this.paths.attempt(run.suiteId, run.runId, item.caseId, summary.number), LIMITS.attemptBytes, attempt);
      if (read.status !== 'ok' || read.value.runId !== run.runId || read.value.suiteId !== run.suiteId || read.value.caseId !== item.caseId || read.value.number !== summary.number
        || read.value.outcome !== summary.outcome || read.value.durationMs !== summary.durationMs || read.value.calls !== summary.calls || read.value.cost !== summary.cost
        || JSON.stringify(read.value.assertions.filter(item => item.judgeModel !== undefined && item.score !== null).map(item => item.score)) !== JSON.stringify(summary.rubricScores ?? [])) return false;
    }
    return true;
  }
  private async mutate(action: () => Promise<Outcome<Manifest>>): Promise<Outcome<Manifest>> {
    try { return this.report(await serialized(this.paths.root, async () => {
      await this.dependencies.files.ready('');
      return action();
    })); }
    catch (error) { return this.report(error instanceof SafetyFault ? { status: 'blocked', reason: error.reason } : failure(error)); }
  }
  private report(result: Outcome<Manifest>): Outcome<Manifest> {
    if (result.status === 'blocked') this.dependencies.logger.emit({ event: 'artifact-blocked', reason: result.reason });
    return result;
  }
}
