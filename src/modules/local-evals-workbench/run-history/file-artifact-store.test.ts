import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { LIMITS } from './limits.js';
import { manifest } from './validation.js';
it('persists queued/attempt/terminal state across stores and refuses duplicate finalization', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await a.store.create(config); assert.equal(created.status, 'ok'); if (created.status !== 'ok') return;
    const id = created.value.runId;
    assert.equal((await a.store.start('suite', id)).status, 'ok'); assert.equal((await a.store.append('suite', id, evidence(id))).status, 'ok');
    const b = fixture(p.root); const finished = await b.store.finalize('suite', id, 'completed'); assert.equal(finished.status, 'ok');
    assert.equal((await b.store.finalize('suite', id, 'completed')).status, 'blocked');
    const disk = await b.reader.read(b.paths.run('suite', id), LIMITS.manifestBytes, manifest); assert.equal(disk.status === 'ok' && disk.value.outcome, 'passed');
    assert.equal(JSON.parse(await readFile(path.join(p.root, 'evals/artifacts/suite/index.json'), 'utf8')).entries.length, 1);
  } finally { await p.cleanup(); }
});
it('allows independent concurrent creates, rejects uncertain policy, missing attempt completion and rechecks Git', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await Promise.all([a.store.create(config), fixture(p.root).store.create(config)]);
    assert.equal(created.filter(v => v.status === 'ok').length, 2);
    assert.equal(new Set(created.map(v => v.status === 'ok' && v.value.runId)).size, 2);
    const run = created.find(v => v.status === 'ok'); if (run?.status !== 'ok') return;
    await a.store.start('suite', run.value.runId);
    assert.equal((await a.store.append('suite', run.value.runId, { ...evidence(run.value.runId), output: 'SECRET' })).status, 'blocked');
    await a.store.append('suite', run.value.runId, evidence(run.value.runId));
    await unlink(path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', run.value.runId, 'case', 1)));
    assert.deepEqual(await a.store.finalize('suite', run.value.runId, 'completed'), { status: 'blocked', reason: 'corrupt' });
    await writeFile(path.join(p.root, '.gitignore'), '');
    assert.deepEqual(await a.store.finalize('suite', run.value.runId, 'partial'), { status: 'blocked', reason: 'not-ignored' });
  } finally { await p.cleanup(); }
});
it('shared in-process queue preserves progress/index updates across adapters and releases after a write failure', async () => {
  const p = await project(); let failOnce = true; try {
    const a = fixture(p.root, { fault(stage, relative) {
      if (failOnce && stage === 'rename' && relative.includes('/cases/')) { failOnce = false; throw new Error('synthetic write failure'); }
    } });
    const b = fixture(`${p.root}/.`);
    const [first, second] = await Promise.all([a.store.create({ ...config, caseIds: ['case', 'other'] }), b.store.create(config)]);
    assert.equal(first.status, 'ok'); if (first.status !== 'ok') return;
    const id = first.value.runId;
    assert.equal(second.status, 'ok'); if (second.status !== 'ok') return;
    const otherId = second.value.runId; assert.notEqual(otherId, id);
    const started = await Promise.all([b.store.start('suite', id), a.store.start('suite', otherId)]);
    assert.ok(started.every(result => result.status === 'ok'));
    const results = await Promise.all([
      a.store.append('suite', id, evidence(id)),
      b.store.append('suite', id, evidence(id)),
      a.store.append('suite', id, { ...evidence(id), caseId: 'other' }),
      b.store.append('suite', otherId, evidence(otherId)),
    ]);
    assert.deepEqual(results.map(result => result.status), ['blocked', 'ok', 'ok', 'ok']);
    const final = await Promise.all([a.store.finalize('suite', id, 'completed'), b.store.finalize('suite', id, 'partial'), b.store.finalize('suite', otherId, 'completed')]);
    assert.equal(final[0]?.status, 'ok'); assert.equal(final[1]?.status, 'blocked'); assert.equal(final[2]?.status, 'ok');
    const run = await b.reader.read(b.paths.run('suite', id), LIMITS.manifestBytes, manifest);
    assert.equal(run.status, 'ok'); if (run.status === 'ok') {
      assert.deepEqual(run.value.cases.map(item => item.attempts.length), [1, 1]);
      assert.equal(run.value.calls, 2); assert.equal(run.value.state, 'completed');
    }
    const next = await b.store.create(config); assert.equal(next.status, 'ok'); if (next.status !== 'ok') return;
    assert.equal((await a.store.finalize('suite', next.value.runId, 'partial')).status, 'ok');
    const index = JSON.parse(await readFile(path.join(a.paths.artifactRoot, a.paths.index('suite')), 'utf8'));
    assert.deepEqual(new Set(index.entries.map((entry: { runId: string }) => entry.runId)), new Set([id, otherId, next.value.runId]));
  } finally { await p.cleanup(); }
});
