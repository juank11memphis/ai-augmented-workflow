import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
import type { SourceRecordWrite } from './contracts.js';
export function historyReader(a: ReturnType<typeof fixture>) { return new FileArtifactReader(a.paths, a.reader, new InterruptedRunRecovery(a.owner, Date.now, a.store)); }
it('reopens exact linked UTF-8 field ranges and rejects wrong assertions, gaps, and corrupt identity', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await a.store.create(config);
    if (created.status !== 'ok') return assert.fail();
    const runId = created.value.runId; await a.store.start('suite', runId);
    const raw = 'ü☃'.repeat(8_000);
    const source: SourceRecordWrite = { version: 1, suiteId: 'suite', runId, caseId: 'case', attempt: 1, sequence: 0,
      record: { kind: 'model-call', id: 'first', turnId: 'turn', checkId: 'assertion', modelId: 'model', phase: 'initial',
        elapsedMs: 1, inputMessages: [{ role: 'user', content: 'input' }], rawText: raw, rawToolCalls: [], normalizedOutput: 'short' } };
    const saved = await a.store.saveSourceRecord(source); if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
    const base = evidence(runId);
    await a.store.append('suite', runId, { ...base, outcome: 'failed', turns: [{ id: 'turn', role: 'assistant', content: 'short' }],
      assertions: [{ ...base.assertions[0]!, outcome: 'failed', turnIds: ['turn'] }, { ...base.assertions[0]!, id: 'other', outcome: 'failed' }],
      sourceCapture: { records: [saved.value], gaps: [{ reason: 'incomplete', recordId: 'later' }] } });
    await a.store.finalize('suite', runId, 'partial');
    const reader = historyReader(fixture(p.root)); const selection = { caseId: 'case', attempt: 1, assertionId: 'assertion' };
    const parts: Buffer[] = []; let offset = 0;
    while (true) {
      const range = await reader.sourceFieldRange('suite', runId, selection, 'first~rawText', offset);
      if (range.status !== 'ok') return assert.fail(JSON.stringify(range));
      parts.push(Buffer.from(range.value.bytes));
      if (range.value.nextOffset === null) break;
      offset = range.value.nextOffset;
    }
    assert.equal(Buffer.concat(parts).toString('utf8'), raw);
    assert.deepEqual(await reader.sourceRecord('suite', runId, { ...selection, assertionId: 'other' }, 'first'), { status: 'blocked', reason: 'not-found' });
    assert.deepEqual(await reader.sourceRecord('suite', runId, selection, 'later'), { status: 'blocked', reason: 'not-found' });
    await writeFile(path.join(p.root, 'evals/artifacts', a.paths.source('suite', runId, 'case', 1, 'first')),
      JSON.stringify({ ...source, caseId: 'different' }));
    assert.deepEqual(await reader.sourceRecord('suite', runId, selection, 'first'), { status: 'blocked', reason: 'corrupt' });
  } finally { await p.cleanup(); }
});
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
it('reports unreadable History candidates as blocked instead of empty success', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail();
    await writeFile(path.join(p.root, 'evals/artifacts', a.paths.run('suite', run.value.runId)), '{broken');
    const listed = await historyReader(a).list('suite', 10);
    assert.deepEqual(listed, { status: 'blocked', reason: 'corrupt' });
    assert.deepEqual(await historyReader(a).get('suite', run.value.runId), { status: 'blocked', reason: 'corrupt' });
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
it('returns a repo-relative review artifact path only for review-ready attempts', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail();
    const id = run.value.runId; await a.store.start('suite', id);
    assert.equal((await a.store.append('suite', id, { ...evidence(id), review: {
      runPath: `evals/artifacts/suite/${id}/run.json`, suitePath: 'evals/suite.json', targetPath: 'src/target.ts', runnerPath: 'evals/runner.mjs',
      inputPaths: ['evals/fixtures/case.json'], omittedInputPathCount: 0, context: 'current-repo-files',
    } })).status, 'ok');
    const selected = await historyReader(a).get('suite', id, { caseId: 'case', attempt: 1, assertionId: 'assertion' });
    assert.equal(selected.status, 'ok');
    if (selected.status === 'ok') {
      assert.equal(selected.value.reviewArtifactPath, `evals/artifacts/suite/${id}/cases/case/1.json`);
      assert.equal(selected.value.evidence?.review?.suitePath, 'evals/suite.json');
    }
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

it('reads legacy run-wide model labels and opens failed-case attempt evidence', async () => {
  const p = await project(); try {
    const a = fixture(p.root);
    const created = await a.store.create({ ...config, testedModel: 'historic-tested', judgeModel: 'historic-judge' });
    if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
    const id = created.value.runId;
    assert.equal((await a.store.start('suite', id)).status, 'ok');
    const failed = evidence(id);
    assert.equal((await a.store.append('suite', id, { ...failed, outcome: 'failed', assertions: [
      { ...failed.assertions[0]!, outcome: 'failed' },
    ] })).status, 'ok');
    assert.equal((await a.store.finalize('suite', id, 'completed')).status, 'ok');
    const detail = await historyReader(fixture(p.root)).get('suite', id, { caseId: 'case', attempt: 1 });
    assert.equal(detail.status, 'ok');
    if (detail.status !== 'ok') return;
    assert.deepEqual([detail.value.summary.testedModel, detail.value.summary.judgeModel], ['historic-tested', 'historic-judge']);
    assert.deepEqual([detail.value.summary.cases[0]?.testedModel, detail.value.summary.cases[0]?.judgeModel], ['historic-tested', 'historic-judge']);
    assert.equal(detail.value.summary.cases[0]?.state, 'completed');
    assert.equal(detail.value.evidenceStatus, 'available');
    assert.equal(detail.value.evidence?.outcome, 'failed');
    assert.equal(detail.value.evidence?.caseId, 'case');
  } finally { await p.cleanup(); }
});

it('keeps historical bytes unchanged and never relabels saved cases from later suite defaults', async () => {
  const p = await project(); try {
    const a = fixture(p.root);
    const old = await a.store.create({ ...config, testedModel: 'historical', judgeModel: null });
    const fresh = await a.store.create({ ...config, testedModel: 'compatibility-only', judgeModel: null,
      caseSelections: [{ caseId: 'case', testedModel: 'saved-case', judgeModel: 'saved-judge' }] });
    if (old.status !== 'ok' || fresh.status !== 'ok') return assert.fail('run creation failed');
    const oldPath = path.join(a.paths.artifactRoot, a.paths.run('suite', old.value.runId));
    const before = await readFile(oldPath);
    await writeFile(path.join(p.root, 'evals/suite.json'), JSON.stringify({ defaultTestedModel: 'changed-later' }));
    const reader = historyReader(fixture(p.root));
    const historical = await reader.get('suite', old.value.runId);
    const saved = await reader.get('suite', fresh.value.runId);
    assert.equal(historical.status, 'ok'); assert.equal(saved.status, 'ok');
    if (historical.status === 'ok' && saved.status === 'ok') {
      assert.deepEqual([historical.value.summary.cases[0]?.testedModel, historical.value.summary.cases[0]?.judgeModel], ['historical', null]);
      assert.deepEqual([saved.value.summary.cases[0]?.testedModel, saved.value.summary.cases[0]?.judgeModel], ['saved-case', 'saved-judge']);
    }
    assert.deepEqual(await readFile(oldPath), before);
  } finally { await p.cleanup(); }
});
