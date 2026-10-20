import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import type { ProviderResponseWrite } from './contracts.js';

async function running(a: ReturnType<typeof fixture>) {
  const created = await a.store.create(config);
  if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
  assert.equal((await a.store.start('suite', created.value.runId)).status, 'ok');
  return created.value.runId;
}
function response(runId: string, bytes: Uint8Array, callId = 'judge-call'): ProviderResponseWrite {
  return { suiteId: 'suite', runId, caseId: 'case', attempt: 1, callId,
    provisionalTurnId: 'turn-1', role: 'judge', checkId: 'approximate-price',
    bytes, completeness: 'complete', contentType: 'application/octet-stream' };
}
function reader(a: ReturnType<typeof fixture>) { return new FileArtifactReader(a.paths, a.reader); }

it('durably links judge role and check to incomplete attempt, exact binary ranges, and Git-excluded path', async () => {
  const p = await project(); try {
    const logs: string[] = [];
    const a = fixture(p.root, { logger: { emit(event) { logs.push(JSON.stringify(event)); } } });
    const runId = await running(a);
    const bytes = Buffer.concat([Buffer.from([0, 255]), Buffer.from('judge-☃')]);
    const saved = await a.store.saveProviderResponse(response(runId, bytes));
    if (saved.status !== 'ok') return assert.fail(JSON.stringify(saved));
    assert.equal(saved.value.role, 'judge'); assert.equal(saved.value.checkId, 'approximate-price');
    assert.equal(saved.value.byteLength, bytes.length);
    assert.equal(p.git('check-ignore', 'evals/artifacts/' + saved.value.locator).trim(), 'evals/artifacts/' + saved.value.locator);
    assert.deepEqual(await readFile(path.join(p.root, 'evals/artifacts', saved.value.locator)), bytes);
    const checkpoint = { ...evidence(runId), outcome: 'incomplete' as const, assertions: [], turns: [],
      providerResponses: { records: [saved.value], gaps: [{ callId: 'judge-missing', provisionalTurnId: 'turn-2',
        role: 'judge' as const, checkId: 'approximate-price', reason: 'not-observed' as const }] } };
    assert.equal((await a.store.append('suite', runId, checkpoint)).status, 'ok');
    const opened = reader(fixture(p.root));
    const detail = await opened.get('suite', runId, { caseId: 'case', attempt: 1 });
    if (detail.status !== 'ok') return assert.fail(JSON.stringify(detail));
    assert.equal(detail.value.evidence?.outcome, 'incomplete');
    assert.deepEqual(detail.value.evidence?.assertions, []);
    assert.deepEqual(detail.value.evidence?.providerResponses, checkpoint.providerResponses);
    const compact = await readFile(path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', runId, 'case', 1)), 'utf8');
    const manifest = await readFile(path.join(p.root, 'evals/artifacts', a.paths.run('suite', runId)), 'utf8');
    for (const ordinary of [compact, manifest, ...logs]) assert.equal(ordinary.includes('judge-☃'), false);
    const selection = { caseId: 'case', attempt: 1, providerResponse: { role: 'judge' as const, checkId: 'approximate-price' } };
    const first = await opened.providerResponseRange('suite', runId, selection, saved.value.locator, 7, 1);
    if (first.status !== 'ok') return assert.fail(JSON.stringify(first));
    assert.deepEqual(Buffer.from(first.value.bytes), bytes.subarray(7, 8));
    assert.equal(first.value.nextOffset, 8);
    const last = await opened.providerResponseRange('suite', runId, selection, saved.value.locator, 8, 4);
    if (last.status !== 'ok') return assert.fail(JSON.stringify(last));
    assert.deepEqual(Buffer.from(last.value.bytes), bytes.subarray(8));
    assert.equal(last.value.nextOffset, null);
    assert.deepEqual(await opened.providerResponseRange('suite', runId,
      { ...selection, providerResponse: { role: 'judge', checkId: 'other' } }, saved.value.locator, 0),
    { status: 'blocked', reason: 'not-found' });
    assert.deepEqual(await opened.providerResponseRange('suite', runId, selection, '../outside', 0),
      { status: 'blocked', reason: 'not-found' });
  } finally { await p.cleanup(); }
});

it('rejects invalid judge identity, unsafe paths and non-excluded artifact roots', async () => {
  const p = await project(false); try {
    const a = fixture(p.root);
    assert.deepEqual(await a.store.create(config),
      { status: 'blocked', reason: 'not-ignored' });
  } finally { await p.cleanup(); }
  const q = await project(); try {
    const a = fixture(q.root); const runId = await running(a);
    assert.deepEqual(await a.store.saveProviderResponse({ ...response(runId, Buffer.from('x')), checkId: undefined }),
      { status: 'blocked', reason: 'invalid-input' });
    assert.deepEqual(await a.store.saveProviderResponse({ ...response(runId, Buffer.from('x')), caseId: '../outside' }),
      { status: 'blocked', reason: 'invalid-input' });
    assert.deepEqual(await a.store.append('suite', runId, { ...evidence(runId), outcome: 'incomplete', assertions: [],
      providerResponses: { records: [{ callId: 'judge-call', provisionalTurnId: 'turn-1', role: 'judge',
        checkId: 'approximate-price', status: 'complete', locator: '../outside', byteLength: 1 }], gaps: [] } }),
      { status: 'blocked', reason: 'corrupt' });
  } finally { await q.cleanup(); }
});

it('retains every judge byte beyond the former response and run ceilings', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const runId = await running(a);
    const first = await a.store.saveProviderResponse(response(runId, Buffer.alloc(129_000, 3), 'judge-1'));
    if (first.status !== 'ok') return assert.fail(JSON.stringify(first));
    assert.deepEqual([first.value.status, first.value.byteLength, first.value.originalByteLength], ['complete', 129_000, undefined]);
    for (let n = 2; n <= 4; n++) assert.equal((await a.store.saveProviderResponse(response(runId, Buffer.alloc(128_000), `judge-${n}`))).status, 'ok');
    const last = await a.store.saveProviderResponse(response(runId, Buffer.alloc(17), 'judge-5'));
    if (last.status !== 'ok') return assert.fail(JSON.stringify(last));
    assert.deepEqual([last.value.status, last.value.byteLength, last.value.originalByteLength], ['complete', 17, undefined]);
  } finally { await p.cleanup(); }
});

it('does not publish judge locator on zero or partial write; checkpointed Sibu failure keeps not-persisted gap', async () => {
  for (const failingStage of ['create', 'flush'] as const) {
    const p = await project(); try {
      const a = fixture(p.root, { fault(stage, relative) { if (stage === failingStage && relative.endsWith('.bin')) throw Error('synthetic'); } });
      const runId = await running(a);
      assert.deepEqual(await a.store.saveProviderResponse(response(runId, Buffer.from('private'))),
        { status: 'blocked', reason: 'unavailable' });
      const checkpoint = { ...evidence(runId), outcome: 'incomplete' as const, assertions: [],
        providerResponses: { records: [], gaps: [{ callId: 'judge-call', provisionalTurnId: 'turn-1',
          role: 'judge' as const, checkId: 'approximate-price', reason: 'not-persisted' as const }] } };
      assert.equal((await a.store.append('suite', runId, checkpoint)).status, 'ok');
      const detail = await reader(fixture(p.root)).get('suite', runId, { caseId: 'case', attempt: 1 });
      if (detail.status !== 'ok') return assert.fail(JSON.stringify(detail));
      assert.deepEqual(detail.value.evidence?.providerResponses, checkpoint.providerResponses);
    } finally { await p.cleanup(); }
  }
});
