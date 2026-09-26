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
    { type: 'diagnostic', code: 'case-warning', caseId: 'case' });
});
