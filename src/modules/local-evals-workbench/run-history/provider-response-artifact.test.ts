import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
import type { ProviderResponseWrite } from './contracts.js';
function historyReader(a: ReturnType<typeof fixture>) {
  return new FileArtifactReader(a.paths, a.reader, new InterruptedRunRecovery(a.owner, Date.now, a.store));
}

async function running(a: ReturnType<typeof fixture>) {
  const created = await a.store.create(config);
  if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
  const runId = created.value.runId;
  assert.equal((await a.store.start('suite', runId)).status, 'ok');
  return runId;
}
function response(runId: string, bytes: Uint8Array, callId = 'call-1'): ProviderResponseWrite {
  return { suiteId: 'suite', runId, caseId: 'case', attempt: 1, callId, provisionalTurnId: 'turn-1',
    bytes, completeness: 'complete', contentType: 'application/octet-stream' };
}

it('saves a response after its matching incomplete checkpoint without completing the attempt', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const runId = await running(a);
    const checkpoint = { ...evidence(runId), outcome: 'incomplete' as const, output: '', turns: [], assertions: [] };
    assert.equal((await a.store.append('suite', runId, checkpoint)).status, 'ok');
    const raw = Buffer.from([0, 255, 128, 42]);
    assert.deepEqual(await a.store.saveProviderResponse({ ...response(runId, raw), caseId: 'wrong' }),
      { status: 'blocked', reason: 'invalid-transition' });
    assert.deepEqual(await a.store.saveProviderResponse({ ...response(runId, raw), attempt: 2 }),
      { status: 'blocked', reason: 'invalid-input' });
    const saved = await a.store.saveProviderResponse(response(runId, raw));
    if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
    assert.equal((await a.store.append('suite', runId, { ...checkpoint,
      providerResponses: { records: [saved.value], gaps: [] } })).status, 'ok');
    const selected = await historyReader(fixture(p.root)).get('suite', runId, { caseId: 'case', attempt: 1 });
    if (selected.status !== 'ok') return assert.fail(JSON.stringify(selected));
    assert.equal(selected.value.summary.state, 'running');
    assert.equal(selected.value.summary.cases[0]?.state, 'incomplete');
    assert.equal(selected.value.evidence?.outcome, 'incomplete');
    assert.deepEqual(selected.value.evidence?.turns, []);
    assert.deepEqual(selected.value.evidence?.assertions, []);
    assert.deepEqual(selected.value.evidence?.providerResponses?.records, [saved.value]);
    const read = await historyReader(fixture(p.root)).providerResponseRange('suite', runId,
      { caseId: 'case', attempt: 1 }, saved.value.locator, 0);
    if (read.status !== 'ok') return assert.fail(JSON.stringify(read));
    assert.deepEqual(Buffer.from(read.value.bytes), raw);
    assert.equal((await a.store.append('suite', runId, evidence(runId))).status, 'ok');
    assert.deepEqual(await a.store.saveProviderResponse(response(runId, raw, 'call-2')),
      { status: 'blocked', reason: 'invalid-transition' });
  } finally { await p.cleanup(); }
});

it('reopens exact binary and split UTF-8 ranges without leaking bodies into compact artifacts or logs', async () => {
  const p = await project(); try {
    const logs: string[] = [];
    const a = fixture(p.root, { logger: { emit(event) { logs.push(JSON.stringify(event)); } } });
    const runId = await running(a);
    const raw = Buffer.concat([Buffer.from([0, 255, 128]), Buffer.from('sentinel-☃')]);
    const saved = await a.store.saveProviderResponse(response(runId, raw));
    if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
    assert.equal(saved.value.status, 'complete'); assert.equal(saved.value.byteLength, raw.length);
    assert.equal((await a.store.append('suite', runId, { ...evidence(runId), outcome: 'incomplete', assertions: [],
      providerResponses: { records: [saved.value], gaps: [] } })).status, 'ok');
    const reader = historyReader(fixture(p.root));
    const selection = { caseId: 'case', attempt: 1 };
    const pieces: Buffer[] = []; let offset = 0;
    do {
      const read = await reader.providerResponseRange('suite', runId, selection, saved.value.locator, offset, 4);
      if (read.status !== 'ok') return assert.fail(JSON.stringify(read));
      assert.equal(read.value.offset, offset); assert.ok(read.value.byteLength <= 4);
      pieces.push(Buffer.from(read.value.bytes)); offset = read.value.nextOffset ?? -1;
    } while (offset >= 0);
    assert.deepEqual(Buffer.concat(pieces), raw);
    const split = await reader.providerResponseRange('suite', runId, selection, saved.value.locator, 13, 1);
    if (split.status !== 'ok') return assert.fail(JSON.stringify(split));
    assert.deepEqual(Buffer.from(split.value.bytes), Buffer.from([0x98]));
    assert.equal(split.value.nextOffset, 14);
    assert.deepEqual(await reader.providerResponseRange('suite', runId, selection, saved.value.locator, 0, 8193),
      { status: 'blocked', reason: 'invalid-input' });
    assert.deepEqual(await reader.providerResponseRange('suite', runId, { caseId: 'other', attempt: 1 }, saved.value.locator, 0),
      { status: 'blocked', reason: 'not-found' });
    const attempt = await readFile(path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', runId, 'case', 1)), 'utf8');
    const manifest = await readFile(path.join(p.root, 'evals/artifacts', a.paths.run('suite', runId)), 'utf8');
    for (const compact of [attempt, manifest, ...logs]) assert.ok(!compact.includes('sentinel-'));
  } finally { await p.cleanup(); }
});

it('persists every byte beyond the former response and run ceilings', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const runId = await running(a);
    const large = Buffer.alloc(129_000, 7);
    const first = await a.store.saveProviderResponse(response(runId, large, 'call-1'));
    if (first.status !== 'ok') return assert.fail(JSON.stringify(first));
    assert.deepEqual([first.value.status, first.value.byteLength, first.value.originalByteLength], ['complete', 129_000, undefined]);
    for (let index = 2; index <= 4; index++) {
      const saved = await a.store.saveProviderResponse(response(runId, Buffer.alloc(128_000, index), `call-${index}`));
      if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
      assert.equal(saved.value.status, 'complete');
    }
    const last = await a.store.saveProviderResponse(response(runId, Buffer.alloc(128_000, 5), 'call-5'));
    if (last.status !== 'ok') return assert.fail(JSON.stringify(last));
    assert.equal(last.value.byteLength, 128_000); assert.equal(last.value.status, 'complete');
    assert.equal(last.value.originalByteLength, undefined);
    const stored = await readFile(path.join(p.root, 'evals/artifacts', first.value.locator));
    assert.equal(stored.length, 129_000);
  } finally { await p.cleanup(); }
});

it('does not publish a locator after a partial write and rejects corrupt attempt references', async () => {
  const p = await project(); try {
    const a = fixture(p.root, { fault(stage, relative) { if (stage === 'flush' && relative.endsWith('.bin')) throw new Error('synthetic failure'); } });
    const runId = await running(a);
    assert.deepEqual(await a.store.saveProviderResponse(response(runId, Buffer.from('secret'))), { status: 'blocked', reason: 'unavailable' });
    const base = evidence(runId);
    assert.equal((await a.store.append('suite', runId, { ...base, outcome: 'incomplete', assertions: [],
      providerResponses: { records: [], gaps: [{ callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'capture-failed' }] } })).status, 'ok');
    const p2 = await project(); try {
      const b = fixture(p2.root); const id = await running(b);
      assert.deepEqual(await b.store.append('suite', id, { ...evidence(id), outcome: 'incomplete', assertions: [],
        providerResponses: { records: [{ callId: 'call-1', provisionalTurnId: 'turn-1', status: 'complete',
          locator: '../unsafe', byteLength: 6 }], gaps: [] } }), { status: 'blocked', reason: 'corrupt' });
      assert.deepEqual(await b.store.saveProviderResponse({ ...response(id, Buffer.from('x')), caseId: 'wrong' }),
        { status: 'blocked', reason: 'invalid-transition' });
    } finally { await p2.cleanup(); }
  } finally { await p.cleanup(); }
});

it('keeps legacy attempts readable without implying a response record', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const runId = await running(a);
    assert.equal((await a.store.append('suite', runId, evidence(runId))).status, 'ok');
    const selected = await historyReader(fixture(p.root)).get('suite', runId, { caseId: 'case', attempt: 1 });
    assert.equal(selected.status, 'ok'); if (selected.status !== 'ok') return;
    assert.equal(selected.value.evidence?.providerResponses, undefined);
    assert.deepEqual(await historyReader(fixture(p.root)).providerResponseRange('suite', runId,
      { caseId: 'case', attempt: 1 }, 'missing', 0), { status: 'blocked', reason: 'not-found' });
  } finally { await p.cleanup(); }
});
