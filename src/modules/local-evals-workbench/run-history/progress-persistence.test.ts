import assert from 'node:assert/strict';
import test from 'node:test';
import { project } from './test-project.js';
import { createRunHistory } from './composition.js';
import { config, evidence } from './test-fixtures.js';

test('running checkpoint is replaced by final attempt and summary polling does not recover it', async () => {
  const p = await project();
  try {
    const history = createRunHistory(p.root, { log() {} });
    const queued = await history.store.create(config);
    assert.equal(queued.status, 'ok');
    if (queued.status !== 'ok') return;
    const id = queued.value.runId;
    assert.equal((await history.store.start('suite', id)).status, 'ok');
    const checkpoint = { ...evidence(id), outcome: 'incomplete' as const, output: 'SYNTHETIC_SECRET_SENTINEL', assertions: [] };
    assert.equal((await history.store.append('suite', id, checkpoint)).status, 'ok');
    const fresh = createRunHistory(p.root, { log() {} });
    const summary = await fresh.get({ suiteId: 'suite', runId: id });
    assert.equal(summary.status === 'ok' && summary.value.summary.state, 'running');
    assert.equal(summary.status === 'ok' && summary.value.summary.cases[0]?.state, 'incomplete');
    assert.equal(summary.status === 'ok' && summary.value.evidenceStatus, 'not-requested');
    const detail = await fresh.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1 } });
    assert.equal(detail.status === 'ok' && detail.value.evidence?.output, checkpoint.output);
    assert.equal((await history.store.append('suite', id, { ...evidence(id), output: 'actual final' })).status, 'ok');
    const terminal = await history.store.finalize('suite', id, 'completed');
    assert.equal(terminal.status === 'ok' && terminal.value.cases[0]?.attempts.length, 1);
    const final = await fresh.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1 } });
    assert.equal(final.status === 'ok' && final.value.evidence?.output, 'actual final');
  } finally { await p.cleanup(); }
});
