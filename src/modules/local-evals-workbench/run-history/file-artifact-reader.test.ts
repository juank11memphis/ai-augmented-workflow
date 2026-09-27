import assert from 'node:assert/strict';
import { it } from 'node:test';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
export function historyReader(a: ReturnType<typeof fixture>) { return new FileArtifactReader(a.paths, a.reader, new InterruptedRunRecovery(a.owner, Date.now, a.store)); }
it('restores missing/stale index and reads summaries without opening any attempt', async () => {
  const p = await project(); const reads: string[] = []; try {
    const a = fixture(p.root, { onRead: relative => reads.push(relative) }); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    await a.store.start('suite', run.value.runId); await a.store.append('suite', run.value.runId, evidence(run.value.runId)); await a.store.finalize('suite', run.value.runId, 'completed');
    await unlink(path.join(p.root, 'evals/artifacts/suite/index.json')); reads.length = 0;
    const reader = historyReader(a); const list = await reader.list('suite', 1); const summary = await reader.get('suite', run.value.runId);
    assert.equal(list.status === 'ok' && list.value[0]?.state, 'completed'); assert.equal(summary.status, 'ok'); assert.ok(reads.every(v => !v.includes('/cases/')));
    await writeFile(path.join(p.root, 'evals/artifacts/suite/index.json'), '{broken'); assert.equal((await reader.list('suite', 1)).status, 'ok');
  } finally { await p.cleanup(); }
});
it('selected assertion excludes unrelated output, turns and assertions; missing evidence stays unavailable', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    const id = run.value.runId; await a.store.start('suite', id);
    const e = evidence(id); await a.store.append('suite', id, { ...e, turns: [{ id: 'related', role: 'assistant', content: 'useful' }, { id: 'unrelated', role: 'user', content: 'unrelated' }], assertions: [{ ...e.assertions[0]!, turnIds: ['related'] }, { ...e.assertions[0]!, id: 'other' }] });
    const reader = historyReader(fixture(p.root)); const detail = await reader.get('suite', id, { caseId: 'case', attempt: 1, assertionId: 'assertion' });
    assert.equal(detail.status, 'ok'); if (detail.status === 'ok') { assert.equal(detail.value.evidence?.output, ''); assert.equal(detail.value.evidence?.assertions.length, 1); assert.equal(detail.value.evidence?.turns.length, 1); }
    await unlink(path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', id, 'case', 1)));
    const missing = await reader.get('suite', id, { caseId: 'case', attempt: 1 }); assert.equal(missing.status === 'ok' && missing.value.evidenceStatus, 'unavailable');
  } finally { await p.cleanup(); }
});
it('selects historical IDs and restores latest ordering across terminal partial runs with safe mapped IDs', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await a.store.create({ ...config, suiteId: 'Suite.Name' }); if (result.status !== 'ok') return assert.fail(JSON.stringify(result));
      ids.push(result.value.runId); assert.equal((await a.store.finalize('Suite.Name', result.value.runId, 'partial')).status, 'ok');
    }
    const reader = historyReader(fixture(p.root)); const list = await reader.list('Suite.Name', 2);
    assert.equal(list.status, 'ok'); if (list.status === 'ok') { assert.deepEqual(list.value.map(v => v.runId), ids.slice(1).reverse()); assert.ok(list.value.every(v => v.outcome === 'incomplete')); }
    assert.equal((await reader.get('Suite.Name', ids[0]!)).status, 'ok');
  } finally { await p.cleanup(); }
});

it('rejects contradictory Judge evidence at save and reopened read', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail();
    const id = run.value.runId; await a.store.start('suite', id);
    const base = evidence(id);
    const grader = { ...base.assertions[0]!, id: 'quality', kind: 'grader' as const, score: 0.2,
      threshold: 0.8, judgeModel: 'fake-judge', outcome: 'failed' as const };
    const valid = { ...base, outcome: 'failed' as const, assertions: [grader] };
    assert.equal((await a.store.append('suite', id, { ...valid, assertions: [{ ...grader, outcome: 'passed' }] })).status, 'blocked');
    assert.equal((await a.store.append('suite', id, valid)).status, 'ok');
    await writeFile(path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', id, 'case', 1)),
      JSON.stringify({ ...valid, assertions: [{ ...grader, outcome: 'passed' }] }));
    const detail = await historyReader(a).get('suite', id, { caseId: 'case', attempt: 1 });
    assert.equal(detail.status === 'ok' && detail.value.evidenceStatus, 'unavailable');
  } finally { await p.cleanup(); }
});
