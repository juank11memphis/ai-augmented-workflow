import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, Manifest, ProviderResponseSelection } from '../run-history/contracts.js';
import { headlessEvalResult } from './handler.js';

const body = Buffer.concat([Buffer.from([0, 255, 128, 226, 152, 131]), Buffer.alloc(1024, 65)]);
const locator = 'suite/run/cases/case/1/responses/judge-call.bin';
const summary: Manifest = { version: 1, suiteId: 'suite', runId: 'run', caseIds: ['case'], scope: 'selected',
  testedModel: 'fake', judgeModel: 'judge', state: 'error', outcome: 'incomplete',
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2, calls: 1, cost: null,
  diagnostics: [], cases: [{ caseId: 'case', state: 'incomplete', attempts: [
    { number: 1, outcome: 'incomplete', durationMs: 1, calls: 1, cost: null },
  ] }] };
const attempt: Attempt = { version: 1, suiteId: 'suite', runId: 'run', caseId: 'case', number: 1,
  outcome: 'incomplete', durationMs: 1, calls: 1, cost: null, output: '', truncated: false,
  diagnostics: ['judge-failed'], diagnosticLinks: [{ code: 'judge-failed', callId: 'judge-call', turnId: 'turn-1' }],
  turns: [], tools: [], assertions: [], providerResponses: {
    records: [{ callId: 'judge-call', provisionalTurnId: 'turn-1', role: 'judge', checkId: 'approximate-price',
      locator, status: 'truncated', byteLength: body.length, originalByteLength: body.length + 7 }],
    gaps: [{ callId: 'judge-missing', provisionalTurnId: 'turn-2', role: 'judge', checkId: 'other', reason: 'not-persisted' }],
  } };
const selection = { caseId: 'case', attempt: 1 };
function dependencies(selected: Attempt = attempt) {
  const selections: ProviderResponseSelection[] = [];
  return { selections, reader: {
    get: async (_suite: string, _run: string, requested?: typeof selection) => ({ status: 'ok' as const,
      value: { summary, evidenceStatus: requested ? 'available' as const : 'not-requested' as const,
        ...(requested ? { evidence: selected } : {}) } }),
    readProviderResponse: async (_suite: string, _run: string, requested: ProviderResponseSelection,
      selectedLocator: string, offset: number, limit: number) => {
      selections.push(requested);
      return { status: 'ok' as const, value: { locator: selectedLocator, offset,
        byteLength: Math.min(limit, body.length - offset), bytes: body.subarray(offset, offset + limit),
        nextOffset: offset + limit < body.length ? offset + limit : null } };
    },
  } };
}

test('selected judge overview preserves role, check, bounded missing extent and gap without raw bytes or a score', async () => {
  const deps = dependencies();
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, deps);
  if (selected.status !== 'ready' || !('incompleteAttempt' in selected)) return assert.fail(JSON.stringify(selected));
  assert.deepEqual(selected.incompleteAttempt.source, { status: 'available', records: [{
    callId: 'judge-call', provisionalTurnId: 'turn-1', role: 'judge', checkId: 'approximate-price', locator,
    status: 'truncated', byteLength: body.length, originalByteLength: body.length + 7, missingByteLength: 7,
  }], gaps: [{ callId: 'judge-missing', provisionalTurnId: 'turn-2', role: 'judge',
    checkId: 'other', reason: 'not-persisted' }], truncated: false });
  assert.deepEqual(selected.incompleteAttempt.callIds, ['judge-call']);
  assert.equal(JSON.stringify(selected).includes('bytesBase64'), false);
  assert.equal(JSON.stringify(selected).includes('score'), false);
  assert.ok(JSON.stringify(selected).length <= 4800);
  const ordinary = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, deps);
  assert.equal(JSON.stringify(ordinary).includes(locator), false);
  assert.equal(JSON.stringify(ordinary).includes('bytesBase64'), false);
});

test('explicit field reads preserve judge identity, exact binary and split UTF-8 ranges with continuation', async () => {
  const deps = dependencies();
  const first = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator, offset: 0 } }, deps);
  if (first.status !== 'ready' || !('field' in first)) return assert.fail(JSON.stringify(first));
  assert.deepEqual(Buffer.from(first.field.bytesBase64, 'base64'), body.subarray(0, 1024));
  assert.equal(first.field.nextOffset, 1024);
  assert.deepEqual(deps.selections[0]?.providerResponse, { role: 'judge', checkId: 'approximate-price' });
  const split = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator, offset: 3 } }, deps);
  if (split.status !== 'ready' || !('field' in split)) return assert.fail(JSON.stringify(split));
  assert.deepEqual(Buffer.from(split.field.bytesBase64, 'base64'), body.subarray(3, 1027));
  assert.equal(split.field.nextOffset, 1027);
  const final = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator, offset: 1027 } }, deps);
  if (final.status !== 'ready' || !('field' in final)) return assert.fail(JSON.stringify(final));
  assert.deepEqual(Buffer.from(final.field.bytesBase64, 'base64'), body.subarray(1027));
  assert.equal(final.field.nextOffset, null);
  assert.deepEqual(await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator: '../unsafe', offset: 0 } }, deps), { status: 'blocked', reason: 'selection-mismatch' });
});

test('legacy v1/v2 attempt without response capture reports not-captured instead of synthesizing judge exchange', async () => {
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection },
    dependencies({ ...attempt, providerResponses: undefined }));
  if (selected.status !== 'ready' || !('incompleteAttempt' in selected)) return assert.fail(JSON.stringify(selected));
  assert.deepEqual(selected.incompleteAttempt.source, { status: 'gap', reason: 'not-captured' });
});
