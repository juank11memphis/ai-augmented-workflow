import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { LIMITS } from './limits.js';
import { manifest } from './validation.js';
import { orderedRunPlan } from '../run-execution/contracts.js';
import type { SourceRecordWrite } from './contracts.js';
import { executeEvalRun } from '../execute-eval-run/handler.js';
import type { ExecutionEvent } from '../run-execution/contracts.js';
import { FileArtifactReader } from './file-artifact-reader.js';

it('records a complete source-ordered immutable per-case plan with explicit deterministic Judge null', async () => {
  const p = await project(); try {
    const a = fixture(p.root);
    const caseIds = ['deterministic', 'rubric'];
    const selections = orderedRunPlan(caseIds, [
      { caseId: 'deterministic', testedModel: 'tested-A', judgeModel: null },
      { caseId: 'rubric', testedModel: 'tested-B', judgeModel: 'judge-B' },
    ]);
    assert.ok(selections); assert.ok(Object.isFrozen(selections)); assert.ok(Object.isFrozen(selections[0]));
    const created = await a.store.create({ ...config, caseIds, caseSelections: selections });
    assert.equal(created.status, 'ok'); if (created.status !== 'ok') return;
    assert.deepEqual(created.value.cases.map(({ caseId, testedModel, judgeModel }) => ({ caseId, testedModel, judgeModel })), selections);
    const disk = JSON.parse(await readFile(path.join(a.paths.artifactRoot, a.paths.run('suite', created.value.runId)), 'utf8'));
    assert.deepEqual(disk.cases.map(({ caseId, testedModel, judgeModel }: { caseId: string; testedModel: string; judgeModel: string | null }) => ({ caseId, testedModel, judgeModel })), selections);
    assert.equal('caseSelections' in disk, false);
  } finally { await p.cleanup(); }
});

it('durably publishes a complete linked source record before an interrupted later capture gap', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await a.store.create(config);
    if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
    const runId = created.value.runId; await a.store.start('suite', runId);
    const raw = '☃'.repeat(9_000);
    const source: SourceRecordWrite = { version: 1, suiteId: 'suite', runId, caseId: 'case', attempt: 1, sequence: 0,
      record: { kind: 'model-call', id: 'first', turnId: 'turn', checkId: 'assertion', modelId: 'model', phase: 'initial',
        elapsedMs: 1, inputMessages: [{ role: 'user', content: 'hello' }], rawText: raw, rawToolCalls: [], normalizedOutput: 'short' } };
    const saved = await a.store.saveSourceRecord(source); assert.equal(saved.status, 'ok');
    if (saved.status !== 'ok') return;
    const attempt = { ...evidence(runId), outcome: 'incomplete' as const, turns: [{ id: 'turn', role: 'assistant' as const, content: 'short' }],
      sourceCapture: { records: [saved.value], gaps: [{ reason: 'incomplete' as const, recordId: 'later' }] } };
    assert.equal((await a.store.append('suite', runId, attempt)).status, 'ok');
    assert.equal((await a.store.finalize('suite', runId, 'interrupted')).status, 'ok');
    const b = fixture(p.root);
    const savedAttempt = await b.reader.read(b.paths.attempt('suite', runId, 'case', 1), LIMITS.attemptBytes, value =>
      typeof value === 'object' && value !== null && 'sourceCapture' in value);
    assert.equal(savedAttempt.status, 'ok');
    const manifestBytes = await readFile(path.join(p.root, 'evals/artifacts', b.paths.run('suite', runId)), 'utf8');
    assert.ok(!manifestBytes.includes(raw));
    assert.ok(!JSON.stringify(savedAttempt).includes(raw));
    const records = await readdir(path.join(p.root, 'evals/artifacts', b.paths.source('suite', runId, 'case', 1, 'first'), '..'));
    assert.deepEqual(records, ['first.json']);
  } finally { await p.cleanup(); }
});
it('run slice reopens earlier raw bytes after a later source gap and interruption', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await a.store.create(config);
    if (created.status !== 'ok') return assert.fail();
    const runId = created.value.runId; const raw = 'exact-☃'.repeat(2_000);
    const selectedCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'hello' } }],
      toolMocks: [], assertions: [{ id: 'assertion', type: 'output-contains' as const, expected: 'ok' }], graders: [] };
    const selection = { runId, model: 'model', suite: { version: 2 as const, kind: 'sibu-eval-suite' as const,
      id: 'suite', name: 'Suite', description: '', target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' },
      coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'runner.mjs'], requiredEnvironment: [] }, testCases: [selectedCase] },
      cases: [selectedCase] };
    const events: ExecutionEvent[] = [
      { type: 'case-started', caseId: 'case', attempt: 1 },
      { type: 'turn-completed', caseId: 'case', attempt: 1, turnId: 'turn', output: 'ok' },
      { type: 'source-record', caseId: 'case', attempt: 1, sequence: 0, record: { kind: 'model-call', id: 'first', turnId: 'turn',
        checkId: 'assertion', modelId: 'model', phase: 'initial', elapsedMs: 1, inputMessages: [], rawText: raw,
        rawToolCalls: [], normalizedOutput: 'ok' } },
      { type: 'source-gap', caseId: 'case', attempt: 1, reason: 'incomplete', recordId: 'later' },
    ];
    const result = await executeEvalRun(selection, { store: a.store, clock: Date.now,
      evaluator: { evaluate() { return []; } },
      runner: { async execute(_selection, consume) { for (const event of events) await consume(event); return { status: 'interrupted' as const }; } } });
    assert.equal(result.status, 'interrupted');
    const reopened = new FileArtifactReader(fixture(p.root).paths, fixture(p.root).reader);
    const selected = { caseId: 'case', attempt: 1, assertionId: 'assertion' };
    const attempt = await reopened.get('suite', runId, { caseId: 'case', attempt: 1 });
    assert.equal(attempt.status, 'ok');
    if (attempt.status === 'ok') assert.deepEqual(attempt.value.evidence?.sourceCapture?.gaps, [{ reason: 'incomplete', recordId: 'later' }]);
    const linked = await reopened.sourceRecord('suite', runId, selected, 'first');
    assert.equal(linked.status === 'ok' && linked.value.record.kind === 'model-call' && linked.value.record.rawText, raw);
    assert.deepEqual(await reopened.sourceRecord('suite', runId, selected, 'later'), { status: 'blocked', reason: 'not-found' });
    const onDisk = await readFile(path.join(p.root, 'evals/artifacts', a.paths.source('suite', runId, 'case', 1, 'first')), 'utf8');
    assert.ok(onDisk.includes(raw));
    assert.ok(!JSON.stringify(attempt).includes(raw));
  } finally { await p.cleanup(); }
});

it('rejects missing, duplicate, reordered and malformed per-case plans before artifact creation', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const caseIds = ['first', 'second'];
    const valid = [{ caseId: 'first', testedModel: 'A', judgeModel: null }, { caseId: 'second', testedModel: 'B', judgeModel: 'J' }];
    for (const choices of [valid.slice(0, 1), [valid[0], valid[0]], [...valid].reverse(),
      [{ ...valid[0], judgeModel: '' }, valid[1]], [{ ...valid[0], testedModel: '' }, valid[1]]]) {
      assert.equal(orderedRunPlan(caseIds, choices), undefined);
      assert.deepEqual(await a.store.create({ ...config, caseIds, caseSelections: choices }), { status: 'blocked', reason: 'invalid-input' });
    }
    await assert.rejects(readdir(path.join(p.root, 'evals/artifacts')), { code: 'ENOENT' });
  } finally { await p.cleanup(); }
});
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
it('allows independent concurrent creates, retains raw output, detects missing evidence and rechecks Git', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await Promise.all([a.store.create(config), fixture(p.root).store.create(config)]);
    assert.equal(created.filter(v => v.status === 'ok').length, 2);
    assert.equal(new Set(created.map(v => v.status === 'ok' && v.value.runId)).size, 2);
    const run = created.find(v => v.status === 'ok'); if (run?.status !== 'ok') return;
    await a.store.start('suite', run.value.runId);
    assert.equal((await a.store.append('suite', run.value.runId, { ...evidence(run.value.runId), output: 'SYNTHETIC_SECRET_SENTINEL' })).status, 'ok');
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
