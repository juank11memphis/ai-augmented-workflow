import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import type { WriteStage } from './atomic-artifact-file.js';
import { config, evidence } from './test-fixtures.js';
it('fault injection at create/write/flush/rename publishes no partial JSON', async () => {
  for (const stage of ['create', 'write', 'flush', 'rename'] as WriteStage[]) {
    const p = await project(); try {
      const a = fixture(p.root, { fault(current, relative) { if (current === stage && relative.endsWith('run.json')) throw new Error('SECRET disk failure'); } });
      assert.equal((await a.store.create(config)).status, 'blocked');
      const suite = path.join(p.root, 'evals/artifacts/suite'); const dirs = await readdir(suite);
      for (const dir of dirs) await assert.rejects(readFile(path.join(suite, dir, 'run.json')));
      await assert.rejects(readFile(path.join(suite, 'index.json')));
    } finally { await p.cleanup(); }
  }
});
it('index failure leaves the durable manifest authoritative, never premature completion', async () => {
  const p = await project(); let failIndex = false; try {
    const a = fixture(p.root, { fault(stage, relative) { if (failIndex && stage === 'rename' && relative.endsWith('index.json')) throw new Error('index failure'); } });
    const run = await a.store.create(config); assert.equal(run.status, 'ok'); if (run.status !== 'ok') return;
    await a.store.start('suite', run.value.runId); await a.store.append('suite', run.value.runId, evidence(run.value.runId)); failIndex = true;
    assert.equal((await a.store.finalize('suite', run.value.runId, 'completed')).status, 'blocked');
    const base = path.join(p.root, 'evals/artifacts/suite');
    assert.equal(JSON.parse(await readFile(path.join(base, 'index.json'), 'utf8')).entries[0].state, 'running');
    assert.equal(JSON.parse(await readFile(path.join(base, run.value.runId, 'run.json'), 'utf8')).state, 'completed');
  } finally { await p.cleanup(); }
});
it('failed attempt publication never adds a manifest reference; orphan sanitized temp is ignored', async () => {
  const p = await project(); try {
    const a = fixture(p.root, { fault(stage, relative) { if (stage === 'rename' && relative.includes('/cases/')) throw new Error('synthetic failure'); } });
    const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    const id = run.value.runId; await a.store.start('suite', id);
    assert.equal((await a.store.append('suite', id, evidence(id))).status, 'blocked');
    const manifest = JSON.parse(await readFile(path.join(p.root, 'evals/artifacts', a.paths.run('suite', id)), 'utf8'));
    assert.equal(manifest.cases[0].attempts.length, 0); assert.equal(manifest.state, 'running');
    assert.equal((await a.store.finalize('suite', id, 'completed')).status, 'blocked');
    assert.equal((await a.store.finalize('suite', id, 'partial')).status, 'ok');
  } finally { await p.cleanup(); }
});
it('failed initial manifest publication releases the queue for independent runs in the same process', async () => {
  const p = await project(); let failOnce = true; const reads: string[] = []; try {
    const a = fixture(p.root, { onRead: relative => reads.push(relative), fault(stage, relative) {
      if (failOnce && stage === 'rename' && relative.endsWith('run.json')) { failOnce = false; throw new Error('transient publication failure'); }
    } });
    assert.deepEqual(await a.store.create(config), { status: 'blocked', reason: 'unavailable' });
    const suite = path.join(a.paths.artifactRoot, 'suite');
    const [failedId] = await readdir(suite); assert.ok(failedId);
    await assert.rejects(readFile(path.join(suite, failedId, 'run.json')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(suite, 'index.json')), { code: 'ENOENT' });
    const b = fixture(`${p.root}/.`, { onRead: relative => reads.push(relative) });
    const results = await Promise.all([a.store.create(config), b.store.create(config)]);
    assert.ok(results.every(result => result.status === 'ok'));
    const ids = results.map(result => { assert.equal(result.status, 'ok'); return result.value.runId; });
    assert.equal(new Set(ids).size, 2); assert.ok(!ids.includes(failedId));
    const index = JSON.parse(await readFile(path.join(suite, 'index.json'), 'utf8'));
    assert.deepEqual(new Set(index.entries.map((entry: { runId: string }) => entry.runId)), new Set(ids));
    assert.ok(index.entries.every((entry: { state: string }) => entry.state === 'queued'));
    assert.ok(!reads.includes('active.json'));
    await assert.rejects(readFile(path.join(a.paths.artifactRoot, 'active.json')), { code: 'ENOENT' });
  } finally { await p.cleanup(); }
});
