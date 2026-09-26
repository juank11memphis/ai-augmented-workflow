import assert from 'node:assert/strict';
import { it } from 'node:test';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRunHistory } from '../index.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { AtomicArtifactFile } from './atomic-artifact-file.js';
it('public composition exposes readiness and durable stores without legacy rewiring', async () => {
  const p = await project(); try {
    const history = createRunHistory(p.root, { log() {} });
    assert.equal((await history.checkReadiness()).status, 'ok'); const run = await history.store.create(config); assert.equal(run.status, 'ok'); if (run.status !== 'ok') return;
    const id = run.value.runId; await history.store.start('suite', id); await history.store.append('suite', id, evidence(id)); await history.store.finalize('suite', id, 'completed');
    const fresh = createRunHistory(p.root, { log() {} }); const list = await fresh.list({ suiteId: 'suite' }); assert.equal(list.status === 'ok' && list.value[0]?.state, 'completed');
    const selected = await fresh.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1 } }); assert.equal(selected.status === 'ok' && selected.value.evidence?.output, 'synthetic output');
  } finally { await p.cleanup(); }
});
it('retains bounded raw evidence without a policy prerequisite', async () => {
  const p = await project(); try {
    const history = createRunHistory(p.root, { log() {} });
    const readiness = await history.checkReadiness();
    assert.equal(readiness.status, 'ok');
    const run = await history.store.create(config); assert.equal(run.status, 'ok');
    if (run.status !== 'ok') return;
    const raw = { ...evidence(run.value.runId), output: 'SYNTHETIC_SECRET_SENTINEL' };
    await history.store.start('suite', run.value.runId);
    assert.equal((await history.store.append('suite', run.value.runId, raw)).status, 'ok');
    const read = await history.get({ suiteId: 'suite', runId: run.value.runId, selection: { caseId: 'case', attempt: 1 } });
    assert.equal(read.status === 'ok' && read.value.evidence?.output, raw.output);
  } finally { await p.cleanup(); }
});
it('public composition recovers from first manifest publication failure without restart or cleanup', async t => {
  const p = await project(); let failOnce = true;
  const original = AtomicArtifactFile.prototype.write;
  t.mock.method(AtomicArtifactFile.prototype, 'write', async function(this: AtomicArtifactFile, relative: string, value: unknown) {
    if (failOnce && relative.endsWith('/run.json')) { failOnce = false; throw new Error('transient initial publication failure'); }
    return original.call(this, relative, value);
  });
  try {
    const dependencies = { log() {} };
    const first = createRunHistory(p.root, dependencies);
    const second = createRunHistory(`${p.root}/.`, dependencies);
    assert.deepEqual(await first.store.create(config), { status: 'blocked', reason: 'unavailable' });
    const root = path.join(p.root, 'evals/artifacts');
    const [failedId] = await readdir(path.join(root, 'suite')); assert.ok(failedId);
    await assert.rejects(readFile(path.join(root, 'suite', failedId, 'run.json')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(root, 'suite/index.json')), { code: 'ENOENT' });
    const [a, b] = await Promise.all([first.store.create(config), second.store.create(config)]);
    assert.equal(a.status, 'ok'); assert.equal(b.status, 'ok');
    assert.notEqual(a.value.runId, b.value.runId);
    assert.notEqual(a.value.runId, failedId); assert.notEqual(b.value.runId, failedId);
    assert.equal((await first.store.start('suite', a.value.runId)).status, 'ok');
    const fresh = createRunHistory(p.root, dependencies);
    const list = await fresh.list({ suiteId: 'suite' }); assert.equal(list.status, 'ok');
    assert.deepEqual(new Map(list.value.map(run => [run.runId, run.state])), new Map([[a.value.runId, 'running'], [b.value.runId, 'queued']]));
    assert.equal((await fresh.get({ suiteId: 'suite', runId: failedId })).status, 'blocked');
    await assert.rejects(readFile(path.join(root, 'active.json')), { code: 'ENOENT' });
  } finally { t.mock.restoreAll(); await p.cleanup(); }
});
it('obsolete regular active pointer content is ignored and left untouched', async () => {
  const p = await project(); try {
    const dependencies = { log() {} };
    const history = createRunHistory(p.root, dependencies);
    const first = await history.store.create(config); assert.equal(first.status, 'ok');
    const obsolete = path.join(p.root, 'evals/artifacts/active.json');
    await writeFile(obsolete, 'obsolete malformed content');
    const second = await createRunHistory(p.root, dependencies).store.create(config); assert.equal(second.status, 'ok');
    assert.notEqual(first.value.runId, second.value.runId);
    assert.equal(await readFile(obsolete, 'utf8'), 'obsolete malformed content');
  } finally { await p.cleanup(); }
});
