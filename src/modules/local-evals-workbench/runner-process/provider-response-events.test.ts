import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderResponseEvents, RESPONSE_BYTES, RUN_RESPONSE_BYTES } from './provider-response-events.js';

const link = { callId: 'call-1', provisionalTurnId: 'turn-1', modelId: 'fake', contentType: 'application/json' };
function started(events: ProviderResponseEvents, extras: Record<string, unknown> = {}) {
  return events.accept('provider-response-started', { ...link, ...extras }, 'case', 1, 'fake');
}
function chunk(events: ProviderResponseEvents, index: number, bytes: Buffer) {
  return events.accept('provider-response-chunk', { callId: 'call-1', index, base64: bytes.toString('base64') }, 'case', 1, 'fake');
}
function completed(events: ProviderResponseEvents, completeness = 'complete') {
  return events.accept('provider-response-completed', { callId: 'call-1', completeness }, 'case', 1, 'fake');
}

test('v3 response retains byte-exact non-success body before a completed turn exists', () => {
  const events = new ProviderResponseEvents();
  const body = Buffer.from([0, 255, 10, 195, 169]);
  started(events, { originalByteLength: body.length }); chunk(events, 0, body);
  const result = completed(events);
  assert.equal(result.type, 'provider-response-observed');
  if (result.type === 'provider-response-observed') {
    assert.deepEqual(result.bytes, body);
    assert.equal(result.contentType, 'application/json');
    assert.equal(result.originalByteLength, body.length);
    assert.equal(result.completeness, 'complete');
  }
});

test('v3 response rejects duplicate, reordered, invalid-size, and cross-model observations', () => {
  const events = new ProviderResponseEvents();
  assert.throws(() => started(events, { modelId: 'judge' }), /invalid-response-start/);
  started(events, { originalByteLength: 2 });
  assert.throws(() => started(events), /invalid-response-start/);
  assert.throws(() => chunk(events, 1, Buffer.from('a')), /invalid-response-chunk/);
  assert.throws(() => chunk(events, 0, Buffer.from('abc')), /invalid-response-size/);
  chunk(events, 0, Buffer.from('a'));
  assert.throws(() => completed(events), /invalid-response-end/);
  assert.deepEqual(events.incomplete, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
    callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'incomplete' });
});

test('v3 response bounds retained prefix and reports known original size', () => {
  const events = new ProviderResponseEvents();
  const piece = Buffer.alloc(30_000, 65);
  started(events, { originalByteLength: 150_000 });
  for (let index = 0; index < 5; index++) chunk(events, index, piece);
  const result = completed(events);
  assert.equal(result.type, 'provider-response-observed');
  if (result.type === 'provider-response-observed') {
    assert.equal(result.bytes.length, RESPONSE_BYTES);
    assert.equal(result.originalByteLength, 150_000);
    assert.equal(result.completeness, 'truncated');
    assert.deepEqual(result.bytes.subarray(0, 5), Buffer.alloc(5, 65));
  }
  assert.ok(RUN_RESPONSE_BYTES > RESPONSE_BYTES);
});

test('v3 response applies the run-wide retained-byte ceiling across distinct calls', () => {
  const events = new ProviderResponseEvents();
  const part = Buffer.alloc(25_000, 66);
  let last: ReturnType<typeof completed> | undefined;
  for (let call = 0; call < 6; call++) {
    const callId = `call-${call}`;
    events.accept('provider-response-started', { ...link, callId, originalByteLength: 100_000 }, 'case', 1, 'fake');
    for (let index = 0; index < 4; index++) events.accept('provider-response-chunk',
      { callId, index, base64: part.toString('base64') }, 'case', 1, 'fake');
    last = events.accept('provider-response-completed', { callId, completeness: 'complete' }, 'case', 1, 'fake');
  }
  assert.equal(last?.type, 'provider-response-observed');
  if (last?.type === 'provider-response-observed') {
    assert.equal(last.bytes.length, RUN_RESPONSE_BYTES - 5 * 100_000);
    assert.equal(last.originalByteLength, 100_000);
    assert.equal(last.completeness, 'truncated');
  }
});

test('v3 gap records unavailable response without fabricating bytes', () => {
  const events = new ProviderResponseEvents();
  const gap = events.accept('provider-response-gap', { callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'not-observed' }, 'case', 1, 'fake');
  assert.deepEqual(gap, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
    callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'not-observed' });
  assert.throws(() => started(events), /invalid-response-start/);
});
