import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecuteEventValidator } from './execute-events.js';
import type { ExecutionSelection } from '../run-execution/contracts.js';

const singleCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'input' } }], toolMocks: [], assertions: [], graders: [] };
const selection: ExecutionSelection = { runId: 'run', model: 'fake',
  suite: { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: '',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' }, coverage: { categories: [], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: [singleCase] }, cases: [singleCase] };
const event = (sequence: number, type: string, caseId: string | null, data: unknown) =>
  ({ protocolVersion: 1, requestId: 'request', sequence, type, runId: 'run', caseId, attempt: caseId ? 1 : null, data });
test('valid ordered stream yields one completed case and terminal event', () => {
  const validator = new ExecuteEventValidator('request', selection);
  assert.equal(validator.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null })).type, 'run-started');
  assert.equal(validator.accept(event(1, 'case-attempt-started', 'case', {})).type, 'case-started');
  assert.equal(validator.accept(event(2, 'conversation-turn-completed', 'case', { turnIndex: 0, role: 'assistant', output: 'actual' })).type, 'turn-completed');
  assert.equal(validator.accept(event(3, 'case-attempt-completed', 'case', { status: 'completed' })).type, 'case-completed');
  assert.equal(validator.accept(event(4, 'run-completed', null, { status: 'completed' })).type, 'run-completed');
  assert.equal(validator.completion, 'completed');
  assert.throws(() => validator.accept(event(5, 'run-completed', null, { status: 'completed' })));
});
test('duplicate/skipped identity and unsupported events fail closed', () => {
  const make = () => new ExecuteEventValidator('request', selection);
  assert.throws(() => make().accept(event(1, 'run-started', null, { model: 'fake', judgeModel: null })));
  const validator = make();
  validator.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  assert.throws(() => validator.accept(event(1, 'tool-interaction-recorded', 'case', {})));
});
test('a failed case cannot be retried within the one-attempt protocol', () => {
  const validator = new ExecuteEventValidator('request', selection);
  validator.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  validator.accept(event(1, 'case-attempt-started', 'case', {}));
  validator.accept(event(2, 'case-attempt-completed', 'case', { status: 'error' }));
  assert.throws(() => validator.accept(event(3, 'case-attempt-started', 'case', {})));
});

test('diagnostics retain their validated case identity without exposing payloads', () => {
  const validator = new ExecuteEventValidator('request', selection);
  validator.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  assert.deepEqual(validator.accept(event(1, 'run-diagnostic', null, { code: 'runner-warning' })),
    { type: 'diagnostic', code: 'runner-warning', caseId: null });
  validator.accept(event(2, 'case-attempt-started', 'case', {}));
  assert.deepEqual(validator.accept(event(3, 'run-diagnostic', 'case', { code: 'case-warning' })),
    { type: 'diagnostic', code: 'case-warning', caseId: 'case', attempt: 1 });
});

test('deep protocol validates one ordered attempt, tools, grader IDs, and selected Judge Model', () => {
  const deep = { ...singleCase, turns: [singleCase.turns[0]!, singleCase.turns[0]!],
    graders: [{ id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const selected: ExecutionSelection = { ...selection, cases: [deep], judgeModel: 'judge' };
  const make = () => new ExecuteEventValidator('request', selected);
  const envelope = (sequence: number, type: string, attempt: number | null, data: unknown) => ({ protocolVersion: 1,
    requestId: 'request', sequence, type, runId: 'run', caseId: attempt === null ? null : 'case', attempt, data });
  const start = envelope(0, 'run-started', null, { model: 'fake', judgeModel: 'judge' });
  const begun = envelope(1, 'case-attempt-started', 1, {});
  const turn = envelope(2, 'conversation-turn-completed', 1, { turnIndex: 0, turnId: 't1', role: 'assistant', output: 'checking' });
  const tool = envelope(3, 'tool-interaction-recorded', 1, { toolId: 'tool-1', turnId: 't1', position: 0, name: 'lookup', arguments: { id: 1 }, outcome: 'result', result: { found: true } });
  const turn2 = envelope(4, 'conversation-turn-completed', 1, { turnIndex: 1, turnId: 't2', role: 'assistant', output: 'done' });
  const rubric = envelope(5, 'rubric-judgment-completed', 1, { checkId: 'quality', passed: true, score: 0.9, threshold: 0.8, judgeModel: 'judge', evidence: 'clear', diagnostics: [] });
  const complete = envelope(6, 'case-attempt-completed', 1, { status: 'completed', calls: 3, cost: 0.01 });
  const valid = make();
  for (const item of [start, begun, turn, tool, turn2, rubric, complete]) valid.accept(item);
  assert.throws(() => valid.accept(envelope(7, 'case-attempt-started', 2, {})));
  const prefix = [start, begun, turn];
  for (const bad of [
    { ...tool, data: { ...(tool.data as object), position: 1 } },
    { ...tool, data: { ...(tool.data as object), turnId: 'missing' } },
  ]) { const validator = make(); for (const item of prefix) validator.accept(item); assert.throws(() => validator.accept(bad)); }
  const namedToolFields = { ...tool, data: { ...(tool.data as object),
    arguments: { reasoning: 'ordinary input', nested: { rationale: 'ordinary input' } },
    result: { reasoning: 'ordinary output', nested: { rationale: 'ordinary output' } } } };
  const withNamedToolFields = make();
  for (const item of prefix) withNamedToolFields.accept(item);
  const recorded = withNamedToolFields.accept(namedToolFields);
  assert.equal(recorded.type, 'tool-recorded');
  if (recorded.type === 'tool-recorded') {
    assert.deepEqual(JSON.parse(recorded.arguments), (namedToolFields.data as { arguments: unknown }).arguments);
    assert.deepEqual(JSON.parse(recorded.result), (namedToolFields.data as { result: unknown }).result);
  }
  for (const bad of [
    { ...rubric, data: { ...(rubric.data as object), judgeModel: 'wrong' } },
    { ...rubric, data: { ...(rubric.data as object), checkId: 'undeclared' } },
    { ...rubric, data: { ...(rubric.data as object), passed: false } },
    { ...rubric, data: { ...(rubric.data as object), reasoning: 'hidden judge reasoning' } },
  ]) { const validator = make(); for (const item of [start, begun, turn, tool, turn2]) validator.accept(item); assert.throws(() => validator.accept(bad)); }
  const missing = make(); for (const item of [start, begun, turn, tool, turn2]) missing.accept(item);
  assert.throws(() => missing.accept(complete));
});
