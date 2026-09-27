import assert from 'node:assert/strict';
import test from 'node:test';
import { executeEvalRun } from './handler.js';
import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import type { ArtifactStorePort, Manifest, Outcome, Attempt } from '../run-history/contracts.js';
import { queued } from '../run-history/test-fixtures.js';
import { evaluateOutputAssertions } from '../run-execution/output-assertions.js';

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
  const evaluator = { evaluate: (_assertions: unknown, snapshot: { output: string; turns: readonly { id: string }[] }) => [{ id: 'check', kind: 'assertion' as const,
    outcome: snapshot.output.includes('actual') ? 'passed' as const : 'failed' as const, score: null,
    expected: 'actual', actual: snapshot.output, diagnostics: [], turnIds: [snapshot.turns[0]!.id], toolIds: [] }] };
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

test('sequential repeats retain turns, mocked success/error/unexpected tools, rubric and custom results', async () => {
  const deepCase = { ...testCase, turns: [testCase.turns[0]!, testCase.turns[0]!],
    assertions: [{ id: 'order', type: 'tool-call-sequence' as const, tools: ['lookup', 'verify'] },
      { id: 'turn', type: 'turn-output' as const, turnIndex: 1, operator: 'contains' as const, expected: 'verified' }],
    graders: [{ id: 'custom', type: 'custom' as const, name: 'safe' },
      { id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const events: ExecutionEvent[] = [{ type: 'run-started' }];
  for (const attempt of [1, 2]) events.push(
    { type: 'case-started', caseId: 'case', attempt },
    { type: 'turn-completed', caseId: 'case', attempt, turnId: `turn-${attempt}-1`, turnIndex: 0, output: 'checking' },
    { type: 'tool-recorded', caseId: 'case', attempt, toolId: `tool-${attempt}-1`, turnId: `turn-${attempt}-1`, position: 0, name: 'lookup', arguments: '{}', outcome: 'result', result: '{}' },
    { type: 'turn-completed', caseId: 'case', attempt, turnId: `turn-${attempt}-2`, turnIndex: 1, output: 'verified' },
    { type: 'tool-recorded', caseId: 'case', attempt, toolId: `tool-${attempt}-2`, turnId: `turn-${attempt}-2`, position: 1, name: 'verify', arguments: '{}', outcome: attempt === 1 ? 'error' : 'unexpected-response', result: '{}' },
    { type: 'grader-completed', caseId: 'case', attempt, checkId: 'custom', grader: 'custom', passed: true, score: null, evidence: 'safe', diagnostics: [] },
    { type: 'grader-completed', caseId: 'case', attempt, checkId: 'quality', grader: 'rubric', passed: attempt === 1, score: attempt === 1 ? 0.9 : 0.7, threshold: 0.8, judgeModel: 'judge', evidence: 'concise', diagnostics: [] },
    { type: 'case-completed', caseId: 'case', attempt, status: 'completed', calls: 3, cost: 0.01 },
  );
  events.push({ type: 'run-completed', status: 'completed' });
  const h = harness(events);
  const result = await executeEvalRun({ ...selection, cases: [deepCase], judgeModel: 'judge', repeats: 2 }, { ...h, evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now });
  assert.equal(result.status, 'completed');
  const completed = h.attempts.filter(item => item.outcome !== 'incomplete');
  assert.deepEqual(completed.map(item => [item.number, item.outcome]), [[1, 'passed'], [2, 'failed']]);
  assert.deepEqual(completed[1]?.tools.map(item => item.outcome), ['result', 'unexpected-response']);
  assert.deepEqual(completed[1]?.assertions.map(item => item.outcome), ['passed', 'passed', 'passed', 'failed']);
  assert.deepEqual(completed.map(item => item.calls), [3, 3]);
});

test('malformed grader and interrupted repeat cannot publish a passed run', async () => {
  const deepCase = { ...testCase, graders: [{ id: 'custom', type: 'custom' as const, name: 'safe' }] };
  const base: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case', attempt: 1 },
    { type: 'turn-completed', caseId: 'case', attempt: 1, turnId: 'turn-1', output: 'actual' }];
  const malformed = harness([...base, { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed' }]);
  assert.equal((await executeEvalRun({ ...selection, cases: [deepCase] }, { ...malformed, clock: Date.now })).status, 'error');
  const interrupted = harness([...base, { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'custom', grader: 'custom', passed: true, score: null, evidence: 'safe', diagnostics: [] },
    { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed' }], 'interrupted');
  assert.equal((await executeEvalRun({ ...selection, cases: [deepCase], repeats: 2 }, { ...interrupted, clock: Date.now })).status, 'interrupted');
});

test('event-count and byte limits finalize honestly while retaining the last bounded checkpoint', async () => {
  const start: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case' },
    { type: 'turn-completed', caseId: 'case', turnId: 't', output: 'actual' }];
  const tools: ExecutionEvent[] = Array.from({ length: 101 }, (_, position) => ({ type: 'tool-recorded', caseId: 'case',
    attempt: 1, toolId: `tool-${position}`, turnId: 't', position, name: 'lookup', arguments: '{}', result: '{}', outcome: 'result' }));
  const count = harness([...start, ...tools]);
  const countResult = await executeEvalRun(selection, { ...count, clock: Date.now });
  assert.equal(countResult.status, 'error');
  assert.equal(countResult.reason, 'evidence-limit-exceeded');
  assert.equal(count.attempts.at(-1)?.tools.length, 100);
  assert.equal(count.writes.at(-1), 'finalize:error');

  const largeTools: ExecutionEvent[] = Array.from({ length: 50 }, (_, position) => ({ type: 'tool-recorded', caseId: 'case',
    attempt: 1, toolId: `large-${position}`, turnId: 't', position, name: 'lookup', arguments: 'x'.repeat(7000),
    result: '{}', outcome: 'result' }));
  const bytes = harness([...start, ...largeTools]);
  const bytesResult = await executeEvalRun(selection, { ...bytes, clock: Date.now });
  assert.equal(bytesResult.status, 'error');
  assert.equal(bytesResult.reason, 'evidence-limit-exceeded');
  assert.ok(bytes.attempts.at(-1)!.tools.length < largeTools.length);
  assert.equal(bytes.writes.at(-1), 'finalize:error');
});

test('validated grader progress survives a later invalid or missing result', async () => {
  const deepCase = { ...testCase, graders: [{ id: 'first', type: 'custom' as const, name: 'first' },
    { id: 'second', type: 'custom' as const, name: 'second' }] };
  const first: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case', attempt: 1 },
    { type: 'turn-completed', caseId: 'case', attempt: 1, turnId: 't', output: 'actual' },
    { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'first', grader: 'custom', passed: true, score: null, evidence: 'safe', diagnostics: [] }];
  for (const later of [
    { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed' } as ExecutionEvent,
    { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'second', grader: 'custom', passed: true, score: null, evidence: '', diagnostics: [] } as ExecutionEvent,
  ]) {
    const h = harness([...first, later]);
    const result = await executeEvalRun({ ...selection, cases: [deepCase] }, { ...h, clock: Date.now });
    assert.equal(result.status, 'error');
    assert.equal(h.attempts.at(-1)?.outcome, 'incomplete');
    assert.deepEqual(h.attempts.at(-1)?.assertions.map(item => item.id), ['first']);
  }
});
