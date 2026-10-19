import assert from 'node:assert/strict';
import test from 'node:test';
import { executeEvalRun } from './handler.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { ExecutionEvent, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { Attempt, ProviderResponseWrite } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';

const body = new TextEncoder().encode('PRIVATE_RESPONSE_SENTINEL');
const testCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'hi' } }],
  toolMocks: [], assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'yes' }], graders: [] };
const command = { runId: 'run', model: 'synthetic', suite: { version: 2 as const, kind: 'sibu-eval-suite' as const,
  id: 'suite', name: 'Suite', description: '', target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' },
  coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [testCase] }, cases: [testCase] };
const start: ExecutionEvent = { type: 'case-started', caseId: 'case', attempt: 1 };
const observed: ExecutionEvent = { type: 'provider-response-observed', caseId: 'case', attempt: 1,
  callId: 'call-1', provisionalTurnId: 'turn-1', bytes: body, contentType: 'application/json',
  originalByteLength: body.byteLength, completeness: 'complete' };

function fixture(events: readonly ExecutionEvent[], outcome: RunnerExecutionOutcome,
  options: { rejectBody?: boolean; rejectCheckpoint?: boolean; partialWrite?: boolean; throwBody?: boolean } = {}) {
  const snapshots: Attempt[] = [];
  const writes: ProviderResponseWrite[] = [];
  const order: string[] = [];
  const logs: unknown[] = [];
  let finalized = false;
  const manifest = queued();
  const ports: ExecuteEvalRunDependencies = {
    clock: () => 100,
    logger: { record: event => { logs.push(event); } },
    runner: { async execute(_selection, consume) { for (const event of events) await consume(event); return outcome; } },
    evaluator: { evaluate: () => { throw new Error('incomplete attempt must not be evaluated'); } },
    store: {
      async create() { return { status: 'ok', value: manifest }; },
      async start() { return { status: 'ok', value: manifest }; },
      async append(_suite, _run, attempt) {
        if (options.rejectCheckpoint && attempt.providerResponses) return { status: 'blocked', reason: 'unavailable' };
        order.push('checkpoint');
        snapshots.push(structuredClone(attempt));
        return { status: 'ok', value: manifest };
      },
      async saveProviderResponse(response) {
        order.push('body-write');
        writes.push(response);
        if (options.throwBody) throw new Error('write interrupted');
        if (options.rejectBody || options.partialWrite) return { status: 'blocked', reason: 'unavailable' };
        return { status: 'ok', value: { callId: response.callId, provisionalTurnId: response.provisionalTurnId,
          status: response.completeness, locator: 'private/response-1', byteLength: response.bytes.byteLength,
          contentType: response.contentType, originalByteLength: response.originalByteLength } };
      },
      async finalize() { finalized = true; order.push('finalize'); return { status: 'ok', value: manifest }; },
    },
  };
  return { snapshots, writes, order, logs, ports, get finalized() { return finalized; } };
}

function assertIncomplete(snapshot: Attempt | undefined) {
  assert.equal(snapshot?.outcome, 'incomplete');
  assert.deepEqual(snapshot?.turns, []);
  assert.deepEqual(snapshot?.assertions, []);
  assert.equal(snapshot?.output, '');
}

test('observed response checkpoints before malformed-output runner report without invented completion', async () => {
  const h = fixture([start, observed, { type: 'diagnostic', caseId: 'case', attempt: 1,
    code: 'malformed-output', turnId: 'turn-1', callId: 'call-1' }, { type: 'run-completed', status: 'error' }],
  { status: 'error', failureProvenance: { stage: 'runner-report', runnerReport: { status: 'error' } } });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
  assert.deepEqual(h.order.slice(0, 3), ['checkpoint', 'body-write', 'checkpoint']);
  assert.deepEqual(h.writes[0], { suiteId: 'suite', runId: 'run', caseId: 'case', attempt: 1,
    callId: 'call-1', provisionalTurnId: 'turn-1', bytes: body, contentType: 'application/json',
    originalByteLength: body.byteLength, completeness: 'complete' });
  assert.deepEqual(h.snapshots[1]?.providerResponses?.records, [{ callId: 'call-1', provisionalTurnId: 'turn-1',
    status: 'complete', locator: 'private/response-1', byteLength: body.byteLength,
    contentType: 'application/json', originalByteLength: body.byteLength }]);
  assertIncomplete(h.snapshots.at(-1));
  assert.doesNotMatch(JSON.stringify(h.logs), /PRIVATE_RESPONSE_SENTINEL/);
  assert.doesNotMatch(JSON.stringify(h.snapshots), /PRIVATE_RESPONSE_SENTINEL/);
});

test('observed response survives unexpected process exit before turn completion', async () => {
  const h = fixture([start, observed], { status: 'error', reason: 'runner-exited',
    failureProvenance: { stage: 'unexpected-process-exit', processExit: { code: 3 } } });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
  assert.equal(h.snapshots.at(-1)?.providerResponses?.records[0]?.callId, 'call-1');
  assert.deepEqual(h.snapshots.at(-1)?.failureProvenance, { stage: 'unexpected-process-exit', processExit: { code: 3 } });
  assertIncomplete(h.snapshots.at(-1));
});

test('pre-turn response is durable before malformed trailing event is rejected', async () => {
  const h = fixture([start, observed, { type: 'turn-completed', caseId: 'wrong', turnId: 'invented', output: 'bad' }],
    { status: 'error' });
  assert.equal((await executeEvalRun(command, h.ports)).reason, 'runner-protocol-invalid');
  assert.equal(h.snapshots.at(-1)?.providerResponses?.records[0]?.provisionalTurnId, 'turn-1');
  assertIncomplete(h.snapshots.at(-1));
});

test('rejected or partial body write yields capture-failed gap, never complete locator', async () => {
  for (const options of [{ rejectBody: true }, { partialWrite: true }, { throwBody: true }]) {
    const h = fixture([start, observed], { status: 'error', reason: 'runner-exited' }, options);
    assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
    assert.deepEqual(h.snapshots.at(-1)?.providerResponses, { records: [], gaps: [
      { callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'capture-failed' }] });
    assertIncomplete(h.snapshots.at(-1));
  }
});

test('failed response checkpoint reports storage failure and does not finalize', async () => {
  const h = fixture([start, observed], { status: 'error' }, { rejectCheckpoint: true });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'storage-failed');
  assert.equal(h.finalized, false);
  assert.equal(h.snapshots.at(-1)?.providerResponses, undefined);
});

test('explicit source gaps stay distinct; legacy absence remains not-captured', async () => {
  for (const reason of ['not-observed', 'not-emitted', 'capture-failed', 'incomplete'] as const) {
    const h = fixture([start, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
      callId: 'call-1', provisionalTurnId: 'turn-1', reason }], { status: 'error', reason: 'runner-exited' });
    assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
    assert.deepEqual(h.snapshots.at(-1)?.providerResponses, { records: [], gaps: [
      { callId: 'call-1', provisionalTurnId: 'turn-1', reason }] });
  }
  const legacy = fixture([start], { status: 'error', reason: 'runner-exited' });
  assert.equal((await executeEvalRun(command, legacy.ports)).status, 'error');
  assert.equal(legacy.snapshots.at(-1)?.providerResponses, undefined);
  assertIncomplete(legacy.snapshots.at(-1));
});
