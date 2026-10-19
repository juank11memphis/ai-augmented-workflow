import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, Manifest, Selection } from '../run-history/contracts.js';
import { headlessEvalResult } from './handler.js';

const body = Buffer.from('PRIVATE-RAW-BODY');
const locator = 'suite/run/cases/case/1/responses/call-1.bin';
const summary: Manifest = { version: 1, suiteId: 'suite', runId: 'run', caseIds: ['case'], scope: 'selected',
  testedModel: 'fake', judgeModel: null, state: 'error', outcome: 'incomplete',
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2, calls: 1, cost: null,
  diagnostics: [], cases: [{ caseId: 'case', state: 'incomplete', attempts: [
    { number: 1, outcome: 'incomplete', durationMs: 1, calls: 1, cost: null },
  ] }] };
const attempt: Attempt = { version: 1, suiteId: 'suite', runId: 'run', caseId: 'case', number: 1,
  outcome: 'incomplete', durationMs: 1, calls: 1, cost: null, output: '', truncated: false,
  diagnostics: ['malformed-output'], turns: [], tools: [], assertions: [], providerResponses: {
    records: [{ callId: 'call-1', provisionalTurnId: 'turn-1', locator, status: 'truncated', byteLength: body.length,
      originalByteLength: body.length + 5, contentType: 'application/json' }],
    gaps: [{ callId: 'call-2', provisionalTurnId: 'turn-2', reason: 'not-observed' }],
  } };
const selection = { caseId: 'case', attempt: 1 };
function dependencies(selected: Attempt = attempt) {
  return { reader: {
    get: async (_suite: string, _run: string, requested?: Selection) => ({ status: 'ok' as const, value: {
      summary, evidenceStatus: requested ? 'available' as const : 'not-requested' as const,
      ...(requested ? { evidence: selected } : {}),
    } }),
    readProviderResponse: async (_suite: string, _run: string, _selection: Selection, requested: string,
      offset: number, limit: number) => ({ status: 'ok' as const, value: {
      locator: requested, offset, byteLength: Math.min(limit, body.length - offset),
      bytes: body.subarray(offset, offset + limit), nextOffset: offset + limit < body.length ? offset + limit : null,
    } }),
  } };
}

test('selected incomplete response lists safe locator, truthful missing extent, and distinct gap without body', async () => {
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, dependencies());
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready' || !('incompleteAttempt' in result)) return assert.fail();
  assert.deepEqual(result.incompleteAttempt.source, { status: 'available', records: [{
    callId: 'call-1', provisionalTurnId: 'turn-1', locator, status: 'truncated', byteLength: body.length,
    originalByteLength: body.length + 5, missingByteLength: 5, contentType: 'application/json',
  }], gaps: [{ callId: 'call-2', provisionalTurnId: 'turn-2', reason: 'not-observed' }], truncated: false });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-RAW-BODY/);
  assert.ok(JSON.stringify(result).length <= 4800);
});

test('explicit selected field returns only bounded Base64 bytes and continuation', async () => {
  const first = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator, offset: 0 } }, dependencies());
  assert.equal(first.status, 'ready');
  if (first.status !== 'ready' || !('field' in first)) return assert.fail();
  assert.deepEqual(Buffer.from(first.field.bytesBase64, 'base64'), body);
  assert.equal(first.field.nextOffset, null);
  assert.equal(first.field.byteLength, body.length);
  const other = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator: 'suite/run/cases/other/1/responses/call-1.bin', offset: 0 } }, dependencies());
  assert.deepEqual(other, { status: 'blocked', reason: 'selection-mismatch' });
  const legacy = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, dependencies({ ...attempt, providerResponses: undefined }));
  if (legacy.status !== 'ready' || !('incompleteAttempt' in legacy)) return assert.fail();
  assert.deepEqual(legacy.incompleteAttempt.source, { status: 'gap', reason: 'not-captured' });
});
