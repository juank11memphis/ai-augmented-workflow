import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecuteEventValidator } from './execute-events.js';
import { ProviderResponseEvents } from './provider-response-events.js';
import type { ExecutionSelection } from '../run-execution/contracts.js';

const caseSelection = { id: 'case', name: 'Case', turns: [{ role: 'user' as const,
  content: { type: 'inline' as const, text: 'hi' } }], toolMocks: [], assertions: [],
  graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'Quality' }, threshold: 0.8 }] };
const selection: ExecutionSelection = { runId: 'run', model: 'tested', judgeModel: 'judge', cases: [caseSelection],
  suite: { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: '',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [caseSelection] } };
const identity = { role: 'judge', checkId: 'quality', modelId: 'judge', callId: 'judge-1', provisionalTurnId: 'pending-turn' };

function protocol(version: 1 | 2 | 3 = 3) {
  const validator = new ExecuteEventValidator('request', selection);
  let sequence = 0;
  const emit = (type: string, data: Record<string, unknown>, caseId: string | null = 'case') =>
    validator.accept({ protocolVersion: version, requestId: 'request', runId: 'run', sequence: sequence++,
      type, caseId, attempt: caseId === null ? null : 1, data });
  emit('run-started', { model: 'tested', judgeModel: 'judge' }, null);
  emit('case-attempt-started', {});
  return { validator, emit };
}

test('judge response preserves exact binary and split UTF-8 bytes before grading error without a score', () => {
  const { emit } = protocol();
  const first = Buffer.from([0, 255, 195]);
  const second = Buffer.from([169, 10]);
  emit('provider-response-started', { ...identity, contentType: 'application/octet-stream', originalByteLength: 5 });
  emit('provider-response-chunk', { callId: identity.callId, index: 0, base64: first.toString('base64') });
  emit('provider-response-chunk', { callId: identity.callId, index: 1, base64: second.toString('base64') });
  const observed = emit('provider-response-completed', { callId: identity.callId, completeness: 'complete' });
  assert.deepEqual(observed, { type: 'provider-response-observed', caseId: 'case', attempt: 1,
    callId: 'judge-1', provisionalTurnId: 'pending-turn', role: 'judge', checkId: 'quality',
    bytes: Buffer.concat([first, second]), contentType: 'application/octet-stream',
    originalByteLength: 5, completeness: 'complete' });
  assert.deepEqual(emit('rubric-judgment-error', { checkId: 'quality', judgeModel: 'judge', code: 'malformed-output' }),
    { type: 'grading-error', caseId: 'case', attempt: 1, checkId: 'quality', judgeModel: 'judge',
      code: 'malformed-output', sequence: 6 });
  assert.equal(observed.type === 'grader-completed', false);
});

test('judge identity, rubric check, model, and cross-role call reuse are rejected', () => {
  for (const changed of [{ role: null }, { role: 'tested-model' }, { checkId: null },
    { checkId: 'missing' }, { modelId: 'tested' }, { modelId: 'other' }, { provisionalTurnId: '' }]) {
    const { emit } = protocol();
    assert.throws(() => emit('provider-response-started', { ...identity, ...changed }), /invalid-response-start/);
  }
  const { emit } = protocol();
  emit('provider-response-started', { callId: 'shared', provisionalTurnId: 'turn', modelId: 'tested' });
  emit('provider-response-chunk', { callId: 'shared', index: 0, base64: Buffer.from('ok').toString('base64') });
  emit('provider-response-completed', { callId: 'shared', completeness: 'complete' });
  assert.throws(() => emit('provider-response-started', { ...identity, callId: 'shared' }), /invalid-response-start/);
});

test('judge gaps distinguish no response, un-emitted response, and capture failure', () => {
  for (const reason of ['not-observed', 'not-emitted', 'capture-failed']) {
    const { emit } = protocol();
    const gap = emit('provider-response-gap', { ...identity, reason });
    assert.deepEqual(gap, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
      callId: 'judge-1', provisionalTurnId: 'pending-turn', role: 'judge', checkId: 'quality', reason });
    assert.throws(() => emit('provider-response-started', identity), /invalid-response-start/);
  }
  const { emit } = protocol();
  assert.throws(() => emit('provider-response-gap', { ...identity, checkId: 'unknown', reason: 'not-observed' }), /invalid-response-gap/);
});

test('interrupted judge chunk remains an explicit linked incomplete gap', () => {
  const { validator, emit } = protocol();
  emit('provider-response-started', identity);
  emit('provider-response-chunk', { callId: 'judge-1', index: 0, base64: Buffer.from('partial').toString('base64') });
  assert.deepEqual(validator.incompleteResponse, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
    callId: 'judge-1', provisionalTurnId: 'pending-turn', role: 'judge', checkId: 'quality', reason: 'incomplete' });
  assert.throws(() => emit('provider-response-chunk', { callId: 'judge-1', index: 0, base64: 'YQ==' }), /invalid-response-chunk/);
  assert.deepEqual(validator.incompleteResponse?.type, 'provider-response-gap');
});

test('malformed trailing judge event does not erase the last valid observation', () => {
  const { validator, emit } = protocol();
  emit('provider-response-started', identity);
  emit('provider-response-chunk', { callId: 'judge-1', index: 0, base64: Buffer.from('first').toString('base64') });
  const first = emit('provider-response-completed', { callId: 'judge-1', completeness: 'complete' });
  emit('provider-response-started', { ...identity, callId: 'judge-2' });
  assert.throws(() => emit('provider-response-chunk', { callId: 'judge-2', index: 1, base64: 'YQ==' }), /invalid-response-chunk/);
  assert.equal(first.type, 'provider-response-observed');
  if (first.type === 'provider-response-observed') assert.deepEqual(first.bytes, Buffer.from('first'));
  assert.deepEqual(validator.incompleteResponse, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
    callId: 'judge-2', provisionalTurnId: 'pending-turn', role: 'judge', checkId: 'quality', reason: 'incomplete' });
});

test('one large judge response retains every byte', () => {
  const responses = new ProviderResponseEvents();
  const part = Buffer.alloc(30_000, 0xfd);
  responses.accept('provider-response-started', { ...identity, originalByteLength: 150_000 }, 'case', 1,
    'tested', 'judge', ['quality']);
  for (let index = 0; index < 5; index++) responses.accept('provider-response-chunk',
    { callId: 'judge-1', index, base64: part.toString('base64') }, 'case', 1, 'tested', 'judge', ['quality']);
  const observed = responses.accept('provider-response-completed', { callId: 'judge-1', completeness: 'complete' },
    'case', 1, 'tested', 'judge', ['quality']);
  assert.equal(observed.type, 'provider-response-observed');
  if (observed.type === 'provider-response-observed') {
    assert.equal(observed.bytes.length, 150_000);
    assert.deepEqual(observed.bytes, Buffer.alloc(150_000, 0xfd));
    assert.equal(observed.originalByteLength, 150_000);
    assert.equal(observed.completeness, 'complete');
  }
});

test('judge retention keeps every call after the former run-wide limit', () => {
  const responses = new ProviderResponseEvents();
  const piece = Buffer.alloc(25_000, 0xfe);
  let last: ReturnType<ProviderResponseEvents['accept']> | undefined;
  for (let call = 0; call < 6; call++) {
    const callId = `judge-${call}`;
    responses.accept('provider-response-started', { ...identity, callId, originalByteLength: 100_000 }, 'case', 1,
      'tested', 'judge', ['quality']);
    for (let index = 0; index < 4; index++) responses.accept('provider-response-chunk',
      { callId, index, base64: piece.toString('base64') }, 'case', 1, 'tested', 'judge', ['quality']);
    last = responses.accept('provider-response-completed', { callId, completeness: 'complete' }, 'case', 1,
      'tested', 'judge', ['quality']);
    if (call === 0) {
      assert.equal(last.type, 'provider-response-observed');
      if (last.type === 'provider-response-observed') assert.deepEqual(last.bytes, Buffer.alloc(100_000, 0xfe));
    }
  }
  assert.equal(last?.type, 'provider-response-observed');
  if (last?.type === 'provider-response-observed') {
    assert.equal(last.bytes.length, 100_000);
    assert.equal(last.completeness, 'complete');
    assert.equal(last.originalByteLength, 100_000);
  }
});

test('v1 and v2 refuse judge response events without weakening source-record validation', () => {
  for (const version of [1, 2] as const) {
    const { emit } = protocol(version);
    assert.throws(() => emit('provider-response-started', identity), /unsupported-event/);
  }
});
