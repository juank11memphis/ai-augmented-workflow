import assert from 'node:assert/strict';
import test from 'node:test';
import { executeEvalRun } from './handler.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { ExecutionEvent, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { Attempt, FailureProvenance, Manifest } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';

const testCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'hi' } }],
  toolMocks: [], assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'yes' }], graders: [] };
const command = { runId: 'run', model: 'synthetic', suite: { version: 2 as const, kind: 'sibu-eval-suite' as const,
  id: 'suite', name: 'Suite', description: '', target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' },
  coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [testCase] }, cases: [testCase] };

function fixture(events: readonly ExecutionEvent[], outcome: RunnerExecutionOutcome, failAppend = false) {
  const snapshots: Attempt[] = [];
  const finals: { state: string; provenance?: FailureProvenance; diagnostics?: readonly string[] }[] = [];
  const logs: unknown[] = [];
  const manifest = queued();
  const ports: ExecuteEvalRunDependencies = {
    clock: () => 100,
    logger: { record: value => { logs.push(value); } },
    runner: { async execute(_selection, consume) { for (const event of events) await consume(event); return outcome; } },
    evaluator: { evaluate: () => { throw new Error('incomplete attempt must not be evaluated'); } },
    store: {
      async create() { return { status: 'ok', value: manifest }; },
      async start() { return { status: 'ok', value: manifest }; },
      async append(_suite, _run, attempt) {
        if (failAppend && attempt.failureProvenance) return { status: 'blocked', reason: 'unavailable' };
        snapshots.push(structuredClone(attempt));
        return { status: 'ok', value: manifest };
      },
      async finalize(_suite, _run, state, diagnostics, provenance) {
        finals.push({ state, diagnostics, provenance });
        return { status: 'ok', value: { ...manifest, state, failureProvenance: provenance } as Manifest };
      },
    },
  };
  return { snapshots, finals, logs, ports };
}

const start: ExecutionEvent = { type: 'case-started', caseId: 'case', attempt: 1 };

test('valid runner report and unexpected process exit retain distinct persisted facts', async () => {
  const reported = fixture([start, { type: 'diagnostic', caseId: 'case', attempt: 1, code: 'provider-malformed',
    turnId: 'turn-1', callId: 'call-1' }, { type: 'run-completed', status: 'error' }],
  { status: 'error', failureProvenance: { stage: 'runner-report', runnerReport: { status: 'error', code: 'provider-malformed' } } });
  assert.equal((await executeEvalRun(command, reported.ports)).status, 'error');
  assert.deepEqual(reported.finals[0]?.provenance, { stage: 'runner-report', runnerReport: { status: 'error', code: 'provider-malformed' } });
  assert.deepEqual(reported.snapshots.at(-1)?.diagnosticLinks, [{ code: 'provider-malformed', turnId: 'turn-1', callId: 'call-1' }]);
  assert.equal(reported.snapshots.at(-1)?.outcome, 'incomplete');
  assert.deepEqual(reported.snapshots.at(-1)?.turns, []);
  assert.deepEqual(reported.snapshots.at(-1)?.assertions, []);

  const exited = fixture([start], { status: 'error', reason: 'runner-exited',
    failureProvenance: { stage: 'unexpected-process-exit', processExit: { code: 3 } } });
  assert.equal((await executeEvalRun(command, exited.ports)).status, 'error');
  assert.deepEqual(exited.finals[0]?.provenance, { stage: 'unexpected-process-exit', processExit: { code: 3 } });
  assert.equal(exited.snapshots.at(-1)?.outcome, 'incomplete');
});

test('runner report and later exit remain separate observed facts without raw log body', async () => {
  const h = fixture([start, { type: 'run-completed', status: 'error' }], { status: 'error', reason: 'runner-exited',
    failureProvenance: { stage: 'runner-report', runnerReport: { status: 'error', code: 'adapter-error' }, processExit: { code: 2 } } });
  assert.equal((await executeEvalRun(command, h.ports)).status, 'error');
  assert.deepEqual(h.snapshots.at(-1)?.failureProvenance, h.finals[0]?.provenance);
  assert.deepEqual(h.snapshots.at(-1)?.failureProvenance?.processExit, { code: 2 });
  assert.doesNotMatch(JSON.stringify(h.logs), /PRIVATE_RESPONSE|adapter-error/);
});

test('malformed trailing event keeps the last incomplete checkpoint and a protocol fact', async () => {
  const h = fixture([start, { type: 'diagnostic', caseId: 'case', attempt: 1, code: 'malformed-output' },
    { type: 'turn-completed', caseId: 'other', turnId: 'invented', output: 'PRIVATE_RESPONSE' }], { status: 'error' });
  assert.equal((await executeEvalRun(command, h.ports)).reason, 'runner-protocol-invalid');
  assert.equal(h.snapshots.at(-1)?.outcome, 'incomplete');
  assert.deepEqual(h.snapshots.at(-1)?.diagnostics, ['malformed-output']);
  assert.deepEqual(h.snapshots.at(-1)?.turns, []);
  assert.deepEqual(h.snapshots.at(-1)?.assertions, []);
  assert.deepEqual(h.finals[0]?.provenance, { stage: 'protocol-rejection' });
  assert.doesNotMatch(JSON.stringify(h.logs), /PRIVATE_RESPONSE/);
});

test('failed provenance persistence returns storage-failed without a saved claim', async () => {
  const h = fixture([start], { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } }, true);
  assert.equal((await executeEvalRun(command, h.ports)).status, 'storage-failed');
  assert.equal(h.finals.length, 0);
  assert.equal(h.snapshots.at(-1)?.failureProvenance, undefined);
});
