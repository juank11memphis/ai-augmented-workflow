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

function harness(events: readonly ExecutionEvent[], outcome: 'completed' | 'error' | 'interrupted' | 'blocked' = 'completed', reason?: string) {
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
    return { status: outcome, ...(reason ? { reason } : {}) };
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
  assert.deepEqual(h.attempts.at(-1)?.review, { runPath: 'evals/artifacts/suite/run/run.json', suitePath: null, targetPath: 'src/target.mjs',
    runnerPath: 'evals/runner.mjs', inputPaths: [], omittedInputPathCount: 0, context: 'current-repo-files' });
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

test('single attempt retains turns, mocked tools, rubric and custom results', async () => {
  const deepCase = { ...testCase, turns: [testCase.turns[0]!, testCase.turns[0]!],
    assertions: [{ id: 'order', type: 'tool-call-sequence' as const, tools: ['lookup', 'verify'] },
      { id: 'turn', type: 'turn-output' as const, turnIndex: 1, operator: 'contains' as const, expected: 'verified' }],
    graders: [{ id: 'custom', type: 'custom' as const, name: 'safe' },
      { id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const events: ExecutionEvent[] = [{ type: 'run-started' }];
  for (const attempt of [1]) events.push(
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
  const result = await executeEvalRun({ ...selection, cases: [deepCase], judgeModel: 'judge' }, { ...h, evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now });
  assert.equal(result.status, 'completed');
  const completed = h.attempts.filter(item => item.outcome !== 'incomplete');
  assert.deepEqual(completed.map(item => [item.number, item.outcome]), [[1, 'passed']]);
  assert.deepEqual(completed[0]?.tools.map(item => item.outcome), ['result', 'error']);
  assert.deepEqual(completed[0]?.assertions.map(item => item.outcome), ['passed', 'passed', 'passed', 'passed']);
  assert.deepEqual(completed.map(item => item.calls), [3]);
});

test('malformed grader and interrupted run cannot publish a passed run', async () => {
  const deepCase = { ...testCase, graders: [{ id: 'custom', type: 'custom' as const, name: 'safe' }] };
  const base: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case', attempt: 1 },
    { type: 'turn-completed', caseId: 'case', attempt: 1, turnId: 'turn-1', output: 'actual' }];
  const malformed = harness([...base, { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed' }]);
  assert.equal((await executeEvalRun({ ...selection, cases: [deepCase] }, { ...malformed, clock: Date.now })).status, 'error');
  const interrupted = harness([...base, { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'custom', grader: 'custom', passed: true, score: null, evidence: 'safe', diagnostics: [] },
    { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed' }], 'interrupted');
  assert.equal((await executeEvalRun({ ...selection, cases: [deepCase] }, { ...interrupted, clock: Date.now })).status, 'interrupted');
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

test('execution terminal states preserve assertion outcomes separately from runner failures', async () => {
  const complete: ExecutionEvent[] = [{ type: 'case-started', caseId: 'case' },
    { type: 'turn-completed', caseId: 'case', turnId: 't', output: 'wrong' },
    { type: 'case-completed', caseId: 'case', status: 'completed' }, { type: 'run-completed', status: 'completed' }];
  for (const [name, events, runnerStatus, reason, expectedState, expectedAttempt] of [
    ['completed with failed assertion', complete, 'completed', undefined, 'completed', 'failed'],
    ['blocked before attempt', [], 'blocked', 'runner-absent', 'blocked', undefined],
    ['partial after completed attempt', complete.slice(0, -1), 'error', 'runner-exited', 'partial', 'failed'],
    ['interrupted before attempt', [], 'interrupted', undefined, 'interrupted', undefined],
    ['runner timeout before attempt', [], 'error', 'runner-timeout', 'error', undefined],
    ['invalid protocol before attempt', [], 'error', 'runner-protocol-invalid', 'error', undefined],
    ['startup failure before attempt', [], 'error', 'runner-start-failed', 'error', undefined],
  ] as const) {
    const h = harness(events, runnerStatus, reason);
    const logs: { event: string; outcome: string; reason?: string }[] = [];
    const result = await executeEvalRun(selection, { ...h, clock: () => 100,
      logger: { record: event => { logs.push(event); } } });
    assert.equal(result.status, expectedState, name);
    assert.equal(result.reason, reason, name);
    assert.equal(h.writes.at(-1), `finalize:${expectedState}`, name);
    assert.equal(h.attempts.at(-1)?.outcome, expectedAttempt, name);
    assert.equal(h.attempts.at(-1)?.version, expectedAttempt ? 1 : undefined, name);
    assert.deepEqual(h.finalDiagnostics, reason ? [reason] : [], name);
    assert.deepEqual(logs.map(event => event.event), ['eval_run_started', 'eval_run_finished'], name);
    assert.equal(logs[1]?.outcome, expectedState === 'error' ? 'failed' : expectedState, name);
    assert.equal(logs[1]?.reason, reason, name);
  }
});

test('safe execution transitions correlate queued reference and run ID without leaking runner evidence', async () => {
  const secret = 'SYNTHETIC_PRIVATE_MARKER';
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  const h = harness([{ type: 'case-started', caseId: 'case' },
    { type: 'turn-completed', caseId: 'case', turnId: 't', output: secret },
    { type: 'tool-recorded', caseId: 'case', attempt: 1, toolId: 'tool', turnId: 't', position: 0,
      name: 'lookup', arguments: secret, result: secret, outcome: 'error' }], 'error', 'runner-timeout');
  const logs: unknown[] = [];
  const result = await executeEvalRun({ ...selection, reference }, { ...h, clock: () => 100,
    logger: { record: event => { logs.push(event); } } });
  assert.deepEqual(result, { status: 'error', runId: 'run', reason: 'runner-timeout' });
  assert.equal(h.attempts.at(-1)?.version, 1);
  assert.equal(h.attempts.at(-1)?.outcome, 'incomplete');
  assert.equal(h.attempts.at(-1)?.output, secret);
  assert.equal(h.attempts.at(-1)?.tools[0]?.result, secret);
  assert.deepEqual(logs, [
    { event: 'eval_run_started', stage: 'execution', outcome: 'started', reference, runId: 'run', durationMs: 0 },
    { event: 'eval_run_finished', stage: 'execution', outcome: 'failed', reason: 'runner-timeout', reference, runId: 'run', durationMs: 0 },
  ]);
  assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_PRIVATE_MARKER|stderr|output|tools/);
  const throwing = harness([], 'error', 'runner-protocol-invalid');
  const persisted = await executeEvalRun({ ...selection, reference }, { ...throwing, clock: () => 100,
    logger: { record() { throw new Error(secret); } } });
  assert.deepEqual(persisted, { status: 'error', runId: 'run', reason: 'runner-protocol-invalid' });
  assert.deepEqual(throwing.finalDiagnostics, ['runner-protocol-invalid']);
});

test('private stderr-like reasons and thrown errors never enter execution events', async () => {
  const secret = 'SYNTHETIC_STDERR_SECRET';
  const logs: unknown[] = [];
  const logger = { record: (event: unknown) => { logs.push(event); } };
  const failed = harness([], 'error', secret);
  assert.deepEqual(await executeEvalRun(selection, { ...failed, clock: () => 100, logger }),
    { status: 'error', runId: 'run', reason: 'unavailable' });
  assert.deepEqual(failed.finalDiagnostics, ['unavailable']);
  assert.deepEqual(logs.at(-1), { event: 'eval_run_finished', stage: 'execution', outcome: 'failed',
    reason: 'unavailable', runId: 'run', durationMs: 0 });
  assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_STDERR_SECRET/);
  const thrown = harness([]);
  thrown.runner.execute = async () => { throw new Error(secret); };
  const result = await executeEvalRun(selection, { ...thrown, clock: () => 100, logger });
  assert.deepEqual(result, { status: 'error', runId: 'run', reason: 'runner-protocol-invalid' });
  assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_STDERR_SECRET/);
});

test('version-one summary and saved attempt evidence remain unchanged across finalization', async () => {
  const h = harness([{ type: 'case-started', caseId: 'case' },
    { type: 'turn-completed', caseId: 'case', turnId: 't', output: 'actual' },
    { type: 'case-completed', caseId: 'case', status: 'completed' },
    { type: 'run-completed', status: 'completed' }]);
  const summary = queued();
  let savedBefore = '';
  h.store.finalize = async (_suite, _run, state, diagnostics) => {
    savedBefore = JSON.stringify(h.attempts);
    assert.equal(summary.version, 1);
    assert.deepEqual(Object.keys(summary).includes('diagnosticIssue'), false);
    assert.equal(state, 'completed');
    assert.deepEqual(diagnostics, []);
    return { status: 'ok', value: { ...summary, state, diagnostics: [], finishedAt: 100 } };
  };
  const result = await executeEvalRun(selection, { ...h, clock: () => 100 });
  assert.equal(result.status, 'completed');
  assert.equal(JSON.stringify(h.attempts), savedBefore);
  assert.deepEqual(h.attempts.map(attempt => attempt.version), [1, 1, 1]);
  assert.equal(h.attempts.at(-1)?.assertions[0]?.outcome, 'passed');
});
