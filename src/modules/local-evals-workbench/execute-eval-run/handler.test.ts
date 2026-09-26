import assert from 'node:assert/strict';
import test from 'node:test';
import { executeEvalRun } from './handler.js';
import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import type { ArtifactStorePort, Manifest, Outcome, Attempt } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';

const testCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'hello' } }], toolMocks: [],
  assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'actual' }], graders: [] };
const selection: ExecutionSelection = { runId: 'run', model: 'synthetic',
  suite: { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: '',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' }, coverage: { categories: [], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: [testCase] }, cases: [testCase] };

function harness(events: readonly ExecutionEvent[], outcome: 'completed' | 'error' | 'interrupted' | 'blocked' = 'completed') {
  const writes: string[] = [];
  const attempts: Attempt[] = [];
  const manifest = queued();
  const ok: Outcome<Manifest> = { status: 'ok', value: manifest };
  const store: ArtifactStorePort = {
    async create() { writes.push('create'); return ok; },
    async start() { writes.push('start'); return ok; },
    async append(_suite, _run, attempt) { writes.push('append:' + attempt.outcome); attempts.push(attempt); return ok; },
    async finalize(_suite, _run, state, diagnostics) { writes.push('finalize:' + state); finalDiagnostics.push(...diagnostics ?? []); return ok; },
  };
  const finalDiagnostics: string[] = [];
  const runner = { async execute(_command: ExecutionSelection, consume: (event: ExecutionEvent) => Promise<void>) {
    writes.push('runner');
    for (const event of events) await consume(event);
    return { status: outcome };
  } };
  const evaluator = { evaluate: (_assertions: unknown, output: string) => [{ id: 'check', kind: 'assertion' as const,
    outcome: output.includes('actual') ? 'passed' as const : 'failed' as const, score: null,
    expected: 'actual', actual: output, diagnostics: [], turnIds: ['t'], toolIds: [] }] };
  return { writes, attempts, finalDiagnostics, store, runner, evaluator };
}

test('starts before runner, checkpoints output, grades actual evidence and finalizes', async () => {
  const h = harness([{ type: 'run-started' }, { type: 'case-started', caseId: 'case' },
    { type: 'turn-completed', caseId: 'case', turnId: 'case-turn-1', output: 'actual response' },
    { type: 'case-completed', caseId: 'case', status: 'completed' }, { type: 'run-completed', status: 'completed' }]);
  const result = await executeEvalRun(selection, { ...h, clock: Date.now });
  assert.equal(result.status, 'completed');
  assert.deepEqual(h.writes, ['start', 'runner', 'append:incomplete', 'append:incomplete', 'append:passed', 'finalize:completed']);
  assert.equal(h.attempts.at(-1)?.output, 'actual response');
  assert.equal(h.attempts.at(-1)?.assertions[0]?.outcome, 'passed');
  assert.equal(h.attempts.at(-1)?.calls, null);
});

test('runner failure retains completed evidence and terminal state is partial', async () => {
  const h = harness([{ type: 'case-started', caseId: 'case' }, { type: 'turn-completed', caseId: 'case', turnId: 't', output: 'wrong' },
    { type: 'case-completed', caseId: 'case', status: 'completed' }], 'error');
  const result = await executeEvalRun(selection, { ...h, clock: Date.now });
  assert.equal(result.status, 'partial');
  assert.equal(h.attempts.at(-1)?.outcome, 'failed');
  assert.equal(h.writes.at(-1), 'finalize:partial');
});

test('duplicate execute delivery never invokes runner', async () => {
  const h = harness([]);
  h.store.start = async () => ({ status: 'blocked', reason: 'invalid-transition' });
  const result = await executeEvalRun(selection, { ...h, clock: Date.now });
  assert.equal(result.status, 'blocked');
  assert.deepEqual(h.writes, []);
});

test('persistence failure stops invocation without fabricating a final save', async () => {
  const h = harness([{ type: 'case-started', caseId: 'case' }]);
  h.store.append = async () => ({ status: 'blocked', reason: 'unavailable' });
  const result = await executeEvalRun(selection, { ...h, clock: Date.now });
  assert.equal(result.status, 'storage-failed');
  assert.deepEqual(h.writes, ['start', 'runner']);
});

test('pre-execution block, empty failure and explicit interruption have honest terminal states', async () => {
  const blocked = harness([], 'blocked');
  assert.equal((await executeEvalRun(selection, { ...blocked, clock: Date.now })).status, 'blocked');
  assert.equal(blocked.writes.at(-1), 'finalize:blocked');
  const empty = harness([], 'error');
  assert.equal((await executeEvalRun(selection, { ...empty, clock: Date.now })).status, 'error');
  const interrupted = harness([{ type: 'run-started' }, { type: 'run-completed', status: 'interrupted' }], 'interrupted');
  assert.equal((await executeEvalRun(selection, { ...interrupted, clock: Date.now })).status, 'interrupted');
});

test('diagnostics are bounded, persisted on partial attempts and finalized for inspection', async () => {
  const events: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case' },
    ...Array.from({ length: 25 }, (_, index): ExecutionEvent => ({ type: 'diagnostic', caseId: 'case', code: `issue-${index}` })),
    { type: 'case-completed', caseId: 'case', status: 'error' }];
  const h = harness(events, 'error');
  const result = await executeEvalRun(selection, { ...h, clock: Date.now });
  assert.equal(result.status, 'error');
  assert.equal(h.attempts.at(-1)?.outcome, 'incomplete');
  assert.equal(h.attempts.at(-1)?.diagnostics.length, 20);
  assert.deepEqual(h.finalDiagnostics, Array.from({ length: 20 }, (_, index) => `issue-${index}`));
});
