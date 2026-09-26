import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
it('classifies proven stopped ownership, preserves completed attempts and persists interruption once', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create({ ...config, caseIds: ['case', 'not-run'] }); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    await a.store.start('suite', run.value.runId); await a.store.append('suite', run.value.runId, evidence(run.value.runId));
    const b = fixture(p.root, { owner: { identity: { pid: 456, token: 'new' }, async check() { return 'stopped'; } } });
    const reader = new FileArtifactReader(b.paths, b.reader, new InterruptedRunRecovery(b.owner, Date.now, b.store));
    for (let i = 0; i < 2; i++) { const result = await reader.get('suite', run.value.runId); assert.equal(result.status, 'ok'); if (result.status === 'ok') { assert.equal(result.value.summary.state, 'interrupted'); assert.equal(result.value.summary.outcome, 'incomplete'); assert.equal(result.value.summary.cases[0]?.attempts.length, 1); assert.equal(result.value.summary.cases[1]?.state, 'not-run'); } }
  } finally { await p.cleanup(); }
});
it('does not interrupt unknown/live owners; unsafe recovery returns classification with warning without writes', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    const unknown = new InterruptedRunRecovery({ ...a.owner, async check() { return 'unknown'; } }, Date.now, a.store);
    assert.equal((await unknown.classify(run.value)).status, 'ok');
    const live = await new InterruptedRunRecovery(a.owner, Date.now, a.store).classify(run.value); assert.equal(live.status === 'ok' && live.value.state, 'queued');
    await writeFile(path.join(p.root, '.gitignore'), '');
    const b = fixture(p.root, { owner: { identity: { pid: 456, token: 'new' }, async check() { return 'stopped'; } } });
    const result = await new InterruptedRunRecovery(b.owner, Date.now, b.store).classify(run.value);
    assert.equal(result.status === 'ok' && result.value.state, 'interrupted'); assert.ok(result.status === 'ok' && result.warnings?.includes('not-ignored'));
  } finally { await p.cleanup(); }
});
it('recovery racing finalization re-reads the authoritative terminal manifest', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    const b = fixture(p.root, { owner: { identity: { pid: 456, token: 'new' }, async check() { return 'stopped'; } } });
    const [terminal, recovered] = await Promise.all([a.store.finalize('suite', run.value.runId, 'blocked'), b.store.recover('suite', run.value.runId)]);
    assert.equal(terminal.status, 'ok'); assert.equal(recovered.status === 'ok' && recovered.value.state, 'blocked');
  } finally { await p.cleanup(); }
});
it('recovering a stopped run preserves another live run and concurrent index updates', async () => {
  const p = await project(); try {
    const old = fixture(p.root); const stale = await old.store.create(config); assert.equal(stale.status, 'ok');
    const current = fixture(p.root, { owner: {
      identity: { pid: 456, token: 'new' },
      async check(owner) { return owner.token === 'new' ? 'live' : 'stopped'; },
    } });
    const live = await current.store.create(config); assert.equal(live.status, 'ok');
    const [recovered, started, queued] = await Promise.all([
      current.store.recover('suite', stale.value.runId), current.store.start('suite', live.value.runId), current.store.create(config),
    ]);
    assert.equal(recovered.status, 'ok'); assert.equal(recovered.value.state, 'interrupted');
    assert.equal(started.status, 'ok'); assert.equal(started.value.state, 'running'); assert.equal(queued.status, 'ok');
    const reader = new FileArtifactReader(current.paths, current.reader, new InterruptedRunRecovery(current.owner, Date.now, current.store));
    const list = await reader.list('suite', 10); assert.equal(list.status, 'ok');
    const expected = new Map([[stale.value.runId, 'interrupted'], [live.value.runId, 'running'], [queued.value.runId, 'queued']]);
    assert.deepEqual(new Map(list.value.map(run => [run.runId, run.state])), expected);
    const index = JSON.parse(await readFile(path.join(current.paths.artifactRoot, 'suite/index.json'), 'utf8'));
    assert.deepEqual(new Map(index.entries.map((run: { runId: string; state: string }) => [run.runId, run.state])), expected);
    await assert.rejects(readFile(path.join(current.paths.artifactRoot, 'active.json')), { code: 'ENOENT' });
  } finally { await p.cleanup(); }
});
