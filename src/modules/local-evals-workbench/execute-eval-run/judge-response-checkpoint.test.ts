import assert from 'node:assert/strict';
import test from 'node:test';
import { executeEvalRun } from './handler.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { ExecutionEvent, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { Attempt, ProviderResponseWrite } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';

const bytes = new TextEncoder().encode('PRIVATE_JUDGE_RESPONSE_SENTINEL');
const selectedCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const,
  content: { type: 'inline' as const, text: 'hi' } }], toolMocks: [], assertions: [],
  graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'Quality' }, threshold: 0.8 }] };
const command = { runId: 'run', model: 'synthetic', judgeModel: 'judge',
  suite: { version: 2 as const, kind: 'sibu-eval-suite' as const, id: 'suite', name: 'Suite', description: '',
    target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' },
    coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [selectedCase] }, cases: [selectedCase] };
const start: ExecutionEvent = { type: 'case-started', caseId: 'case', attempt: 1 };
const observed: ExecutionEvent = { type: 'provider-response-observed', caseId: 'case', attempt: 1,
  role: 'judge', checkId: 'quality', callId: 'judge-call', provisionalTurnId: 'provisional-turn',
  bytes, completeness: 'complete' };

function fixture(events: readonly ExecutionEvent[], outcome: RunnerExecutionOutcome,
  options: { rejectBody?: boolean; rejectCheckpoint?: boolean } = {}) {
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
    evaluator: { evaluate: () => { throw new Error('incomplete case must not be evaluated'); } },
    store: {
      async create() { return { status: 'ok', value: manifest }; },
      async start() { return { status: 'ok', value: manifest }; },
      async append(_suite, _run, attempt) {
        if (options.rejectCheckpoint && attempt.providerResponses) return { status: 'blocked', reason: 'unavailable' };
        order.push('checkpoint'); snapshots.push(structuredClone(attempt));
        return { status: 'ok', value: manifest };
      },
      async saveProviderResponse(write) {
        order.push('body-write'); writes.push(write);
        if (options.rejectBody) return { status: 'blocked', reason: 'unavailable' };
        return { status: 'ok', value: { callId: write.callId, provisionalTurnId: write.provisionalTurnId,
          status: write.completeness, locator: 'private/judge', byteLength: write.bytes.byteLength } };
      },
      async finalize() { finalized = true; order.push('finalize'); return { status: 'ok', value: manifest }; },
    },
  };
  return { snapshots, writes, order, logs, ports, get finalized() { return finalized; } };
}

function assertUnfinished(attempt: Attempt | undefined) {
  assert.equal(attempt?.outcome, 'incomplete');
  assert.deepEqual(attempt?.turns, []);
  assert.equal(attempt?.calls, null);
  assert.equal(attempt?.cost, null);
  assert.equal(attempt?.assertions.some(item => item.outcome === 'passed' || item.outcome === 'failed'), false);
  assert.equal(attempt?.assertions.some(item => item.score !== null), false);
}

test('judge bytes are saved and checkpointed before rubric grading error', async () => {
  const h = fixture([start, observed, { type: 'grading-error', caseId: 'case', attempt: 1,
    checkId: 'quality', judgeModel: 'judge', code: 'malformed-output', sequence: 1 },
  { type: 'run-completed', status: 'error' }], { status: 'error', failureProvenance: {
    stage: 'runner-report', runnerReport: { status: 'error' } } });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
  assert.deepEqual(h.order.slice(0, 4), ['checkpoint', 'body-write', 'checkpoint', 'checkpoint']);
  assert.deepEqual(h.writes[0], { suiteId: 'suite', runId: 'run', caseId: 'case', attempt: 1,
    callId: 'judge-call', provisionalTurnId: 'provisional-turn', role: 'judge', checkId: 'quality',
    bytes, completeness: 'complete' });
  assert.deepEqual(h.snapshots[1]?.providerResponses?.records, [{ callId: 'judge-call',
    provisionalTurnId: 'provisional-turn', role: 'judge', checkId: 'quality', status: 'complete',
    locator: 'private/judge', byteLength: bytes.byteLength }]);
  assert.deepEqual(h.snapshots[1]?.assertions, []);
  assert.deepEqual(h.snapshots.at(-1)?.assertions, [{ id: 'quality', kind: 'grader', outcome: 'incomplete',
    score: null, expected: 'rubric judgment', actual: '', diagnostics: ['malformed-output'],
    turnIds: [], toolIds: [], gradingError: { code: 'malformed-output' } }]);
  assertUnfinished(h.snapshots.at(-1));
  assert.doesNotMatch(JSON.stringify(h.snapshots), /PRIVATE_JUDGE_RESPONSE_SENTINEL/);
  assert.doesNotMatch(JSON.stringify(h.logs), /PRIVATE_JUDGE_RESPONSE_SENTINEL/);
});

test('judge bytes survive unexpected exit and interrupted runner without a completed judgment', async () => {
  for (const outcome of [{ status: 'error' as const, reason: 'runner-exited' },
    { status: 'interrupted' as const, reason: 'runner-timeout' }]) {
    const h = fixture([start, observed], outcome);
    assert.equal((await executeEvalRun(command, h.ports)).status, outcome.status === 'error' ? 'error' : 'interrupted');
    assert.equal(h.snapshots.at(-1)?.providerResponses?.records[0]?.callId, 'judge-call');
    assertUnfinished(h.snapshots.at(-1));
  }
});

test('judge gap reasons remain distinct from Sibu body persistence failure', async () => {
  for (const reason of ['not-observed', 'not-emitted', 'capture-failed', 'incomplete'] as const) {
    const h = fixture([start, { type: 'provider-response-gap', caseId: 'case', attempt: 1,
      role: 'judge', checkId: 'quality', callId: 'judge-call', provisionalTurnId: 'provisional-turn', reason }],
    { status: 'error', reason: 'runner-exited' });
    assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
    assert.deepEqual(h.snapshots.at(-1)?.providerResponses?.gaps, [{ role: 'judge', checkId: 'quality',
      callId: 'judge-call', provisionalTurnId: 'provisional-turn', reason }]);
    assertUnfinished(h.snapshots.at(-1));
  }
  const failed = fixture([start, observed], { status: 'error' }, { rejectBody: true });
  assert.equal((await executeEvalRun(command, failed.ports)).status, 'error');
  assert.deepEqual(failed.snapshots.at(-1)?.providerResponses?.gaps, [{ role: 'judge', checkId: 'quality',
    callId: 'judge-call', provisionalTurnId: 'provisional-turn', reason: 'not-persisted' }]);
  assert.deepEqual(failed.snapshots.at(-1)?.providerResponses?.records, []);
});

test('failed judge gap checkpoint is explicit storage failure without finalization', async () => {
  const h = fixture([start, observed], { status: 'error' }, { rejectBody: true, rejectCheckpoint: true });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'storage-failed');
  assert.equal(h.finalized, false);
  assert.equal(h.snapshots.at(-1)?.providerResponses, undefined);
});

test('judge response identity requires declared rubric and unique call within attempt', async () => {
  for (const invalid of [{ ...observed, checkId: undefined }, { ...observed, checkId: 'unknown' },
    { ...observed, role: undefined, checkId: 'quality' }]) {
    const h = fixture([start, invalid], { status: 'error' });
    assert.equal((await executeEvalRun(command, h.ports)).reason, 'runner-protocol-invalid');
    assert.deepEqual(h.writes, []);
  }
  const h = fixture([start, observed, { ...observed, role: 'tested-model', checkId: undefined }], { status: 'error' });
  assert.equal((await executeEvalRun(command, h.ports)).reason, 'runner-protocol-invalid');
  assert.equal(h.writes.length, 1);
  assert.equal(h.snapshots.at(-1)?.providerResponses?.records.length, 1);
});
