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
test('declared operational error needs observed error and a matching custom assertion before zero-turn completion', () => {
  const errorCase = { ...singleCase, expectedOutcome: { type: 'operational-error' as const },
    graders: [{ id: 'checks-error', type: 'custom' as const, name: 'Checks error' }] };
  const chosen = { ...selection, cases: [errorCase], suite: { ...selection.suite, testCases: [errorCase] } };
  const started = () => {
    const validator = new ExecuteEventValidator('request', chosen);
    validator.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
    validator.accept(event(1, 'case-attempt-started', 'case', {}));
    return validator;
  };
  const actualError = { code: 'invalid-input', message: 'Input rejected.' };
  const custom = (passed: boolean, error = actualError) => ({ checkId: 'checks-error', passed, score: null,
    evidence: 'Checked actual code and message', diagnostics: [], actualError: error });
  assert.throws(() => started().accept(event(2, 'case-attempt-completed', 'case', { status: 'completed' })), /invalid-case-end/);
  assert.throws(() => started().accept(event(2, 'custom-assertion-completed', 'case', custom(true))), /invalid-custom/);
  const mismatched = started();
  mismatched.accept(event(2, 'operational-error-observed', 'case', actualError));
  assert.throws(() => mismatched.accept(event(3, 'custom-assertion-completed', 'case', custom(true,
    { code: 'different', message: actualError.message }))), /invalid-custom/);
  for (const passed of [true, false]) {
    const validator = started();
    assert.equal(validator.accept(event(2, 'operational-error-observed', 'case', actualError)).type, 'operational-error-observed');
    assert.equal(validator.accept(event(3, 'custom-assertion-completed', 'case', custom(passed))).type, 'grader-completed');
    assert.equal(validator.accept(event(4, 'case-attempt-completed', 'case', { status: 'completed' })).type, 'case-completed');
    assert.equal(validator.accept(event(5, 'run-completed', null, { status: 'completed' })).type, 'run-completed');
  }
  const ordinary = new ExecuteEventValidator('request', selection);
  ordinary.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  ordinary.accept(event(1, 'case-attempt-started', 'case', {}));
  assert.throws(() => ordinary.accept(event(2, 'operational-error-observed', 'case', actualError)), /invalid-operational-error/);
  const missingReply = new ExecuteEventValidator('request', selection);
  missingReply.accept(event(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  missingReply.accept(event(1, 'case-attempt-started', 'case', {}));
  assert.throws(() => missingReply.accept(event(2, 'case-attempt-completed', 'case', { status: 'completed' })), /invalid-case-end/);
});
test('v3 accepts a provisional response before turn completion and rejects v2 opt-in events', () => {
  const e = (sequence: number, type: string, caseId: string | null, data: unknown, version = 3) =>
    ({ ...event(sequence, type, caseId, data), protocolVersion: version });
  const validator = new ExecuteEventValidator('request', selection);
  validator.accept(e(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  validator.accept(e(1, 'case-attempt-started', 'case', {}));
  validator.accept(e(2, 'provider-response-started', 'case', { callId: 'call-1', provisionalTurnId: 'turn-1', modelId: 'fake', originalByteLength: 3 }));
  validator.accept(e(3, 'provider-response-chunk', 'case', { callId: 'call-1', index: 0, base64: Buffer.from('bad').toString('base64') }));
  const observed = validator.accept(e(4, 'provider-response-completed', 'case', { callId: 'call-1', completeness: 'complete' }));
  assert.equal(observed.type, 'provider-response-observed');
  if (observed.type === 'provider-response-observed') assert.deepEqual(observed.bytes, Buffer.from('bad'));
  validator.accept(e(5, 'case-attempt-completed', 'case', { status: 'error', sourceEvidenceComplete: false }));
  validator.accept(e(6, 'run-completed', null, { status: 'error', code: 'malformed-output' }));
  const old = new ExecuteEventValidator('request', selection);
  old.accept(e(0, 'run-started', null, { model: 'fake', judgeModel: null }, 2));
  old.accept(e(1, 'case-attempt-started', 'case', {}, 2));
  assert.throws(() => old.accept(e(2, 'provider-response-gap', 'case',
    { callId: 'call-1', provisionalTurnId: 'turn-1', reason: 'not-observed' }, 2)), /unsupported-event/);
});

test('v4 records call lifecycle before any response and rejects a fabricated completion', () => {
  const e = (sequence: number, type: string, caseId: string | null, data: unknown) =>
    ({ ...event(sequence, type, caseId, data), protocolVersion: 4 });
  const validator = new ExecuteEventValidator('request', selection);
  validator.accept(e(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  validator.accept(e(1, 'case-attempt-started', 'case', {}));
  assert.deepEqual(validator.accept(e(2, 'model-call-started', 'case', { callId: 'call-1',
    provisionalTurnId: 'turn-1', role: 'tested-model', modelId: 'fake', phase: 'initial' })),
  { type: 'model-call-started', caseId: 'case', attempt: 1, callId: 'call-1',
    provisionalTurnId: 'turn-1', role: 'tested-model', modelId: 'fake', phase: 'initial' });
  assert.deepEqual(validator.missingCallResponses, [{ type: 'provider-response-gap', caseId: 'case',
    attempt: 1, callId: 'call-1', provisionalTurnId: 'turn-1', role: 'tested-model', reason: 'incomplete' }]);
  assert.throws(() => validator.accept(e(3, 'case-attempt-completed', 'case',
    { status: 'completed', sourceEvidenceComplete: false })), /invalid-case-end/);
});
test('v3 accepts a 40,000-byte response chunk through a completed execute sequence', () => {
  const validator = new ExecuteEventValidator('request', selection);
  const body = Buffer.alloc(40_000, 65);
  const e = (sequence: number, type: string, caseId: string | null, data: unknown) =>
    ({ ...event(sequence, type, caseId, data), protocolVersion: 3 });
  validator.accept(e(0, 'run-started', null, { model: 'fake', judgeModel: null }));
  validator.accept(e(1, 'case-attempt-started', 'case', {}));
  validator.accept(e(2, 'provider-response-started', 'case',
    { callId: 'call-1', provisionalTurnId: 'turn-1', modelId: 'fake', originalByteLength: body.length }));
  assert.equal(validator.accept(e(3, 'provider-response-chunk', 'case',
    { callId: 'call-1', index: 0, base64: body.toString('base64') })).type, 'source-chunk-accepted');
  const observed = validator.accept(e(4, 'provider-response-completed', 'case',
    { callId: 'call-1', completeness: 'complete' }));
  assert.equal(observed.type, 'provider-response-observed');
  if (observed.type === 'provider-response-observed') assert.deepEqual(observed.bytes, body);
  validator.accept(e(5, 'conversation-turn-completed', 'case', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'done' }));
  validator.accept(e(6, 'case-attempt-completed', 'case', { status: 'completed', sourceEvidenceComplete: false }));
  assert.equal(validator.accept(e(7, 'run-completed', null, { status: 'completed' })).type, 'run-completed');
  assert.equal(validator.completion, 'completed');
});
test('v3 rejects oversized or malformed chunks without exposing response bodies', () => {
  const e = (sequence: number, type: string, data: unknown) =>
    ({ ...event(sequence, type, 'case', data), protocolVersion: 3 });
  const ready = () => {
    const validator = new ExecuteEventValidator('request', selection);
    validator.accept({ ...e(0, 'run-started', { model: 'fake', judgeModel: null }), caseId: null, attempt: null });
    validator.accept(e(1, 'case-attempt-started', {}));
    validator.accept(e(2, 'provider-response-started',
      { callId: 'call-1', provisionalTurnId: 'turn-1', modelId: 'fake' }));
    return validator;
  };
  const chunk = (base64: string) => e(3, 'provider-response-chunk', { callId: 'call-1', index: 0, base64 });
  assert.throws(() => ready().accept(chunk(Buffer.alloc(40_001, 65).toString('base64'))), /invalid-response-size/);
  assert.throws(() => ready().accept(chunk('secret-body%%%')), /invalid-response-chunk/);
  const overLine = { ...chunk(Buffer.alloc(40_000, 65).toString('base64')), padding: 'x'.repeat(11_000) };
  assert.ok(Buffer.byteLength(JSON.stringify(overLine)) > 64_000);
  assert.throws(() => ready().accept(overLine), /invalid-envelope/);
});
test('v3 rejects a response event from another attempt without losing an earlier accepted response', () => {
  const e = (sequence: number, type: string, data: unknown, attempt = 1) =>
    ({ ...event(sequence, type, 'case', data), protocolVersion: 3, attempt });
  const validator = new ExecuteEventValidator('request', selection);
  validator.accept({ ...e(0, 'run-started', { model: 'fake', judgeModel: null }), caseId: null, attempt: null });
  validator.accept(e(1, 'case-attempt-started', {}));
  validator.accept(e(2, 'provider-response-started', { callId: 'call-1', provisionalTurnId: 'turn-1', modelId: 'fake' }));
  validator.accept(e(3, 'provider-response-chunk', { callId: 'call-1', index: 0, base64: Buffer.from('valid').toString('base64') }));
  assert.equal(validator.accept(e(4, 'provider-response-completed', { callId: 'call-1', completeness: 'complete' })).type,
    'provider-response-observed');
  assert.throws(() => validator.accept(e(5, 'provider-response-gap',
    { callId: 'call-2', provisionalTurnId: 'turn-2', reason: 'not-observed' }, 2)), /invalid-case/);
});
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

test('version-two judge exchange links exact scored event, and rejects wrong identity, comparison, order and false completion', () => {
  const deep = { ...singleCase, graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const selected: ExecutionSelection = { ...selection, cases: [deep], judgeModel: 'judge' };
  const e = (sequence: number, type: string, data: unknown, caseId: string | null = 'case') =>
    ({ protocolVersion: 2, requestId: 'request', runId: 'run', sequence, type, caseId, attempt: caseId ? 1 : null, data });
  const begin = [e(0, 'run-started', { model: 'fake', judgeModel: 'judge' }, null), e(1, 'case-attempt-started', {}),
    e(2, 'conversation-turn-completed', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'answer' }),
    e(3, 'rubric-judgment-completed', { checkId: 'quality', passed: false, score: 0.7, threshold: 0.8,
      judgeModel: 'judge', evidence: 'safe', diagnostics: [] })];
  const source = { kind: 'judge-exchange', id: 'judge-1', turnId: 'turn-1', checkId: 'quality',
    judgeModel: 'judge', eventSequence: 3, elapsedMs: 8, evaluatedRubric: 'quality >= 0.8',
    request: 'instructions\nanswer\nreference', response: '{"score":0.7}', rationale: 'Missing caveat',
    result: { status: 'completed', score: 0.7, threshold: 0.8, passed: false }, redactedFields: ['request'] };
  const chunk = (sequence: number, value: unknown) => { const bytes = Buffer.from(JSON.stringify(value));
    return e(sequence, 'source-record-chunk', { recordId: 'judge-1', index: 0, count: 1,
      byteLength: bytes.length, base64: bytes.toString('base64') }); };
  const ready = () => { const validator = new ExecuteEventValidator('request', selected);
    for (const item of begin) validator.accept(item); return validator; };
  const valid = ready();
  const accepted = valid.accept(chunk(4, source));
  assert.equal(accepted.type, 'source-record');
  if (accepted.type === 'source-record') assert.deepEqual(accepted.record, source);
  assert.equal(valid.accept(e(5, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: false,
    judgeEvidenceComplete: true })).type, 'case-completed');
  for (const bad of [{ ...source, judgeModel: 'other' }, { ...source, checkId: 'other' },
    { ...source, turnId: 'other' }, { ...source, eventSequence: 2 },
    { ...source, result: { ...source.result, score: 0.9, passed: true } }]) {
    assert.throws(() => ready().accept(chunk(4, bad)));
  }
  assert.throws(() => ready().accept(e(4, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: false,
    judgeEvidenceComplete: true })));
  assert.throws(() => valid.accept(chunk(6, source)));
});

test('scoreless judge error retains malformed source and interrupted or over-limit chunks report gaps', () => {
  const deep = { ...singleCase, graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const selected: ExecutionSelection = { ...selection, cases: [deep], judgeModel: 'judge' };
  const e = (sequence: number, type: string, data: unknown, caseId: string | null = 'case') =>
    ({ protocolVersion: 2, requestId: 'request', runId: 'run', sequence, type, caseId, attempt: caseId ? 1 : null, data });
  const ready = () => { const validator = new ExecuteEventValidator('request', selected);
    validator.accept(e(0, 'run-started', { model: 'fake', judgeModel: 'judge' }, null));
    validator.accept(e(1, 'case-attempt-started', {}));
    validator.accept(e(2, 'conversation-turn-completed', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'answer' }));
    validator.accept(e(3, 'rubric-judgment-error', { checkId: 'quality', judgeModel: 'judge', code: 'malformed-score' }));
    return validator; };
  const source = { kind: 'judge-exchange', id: 'judge-1', turnId: 'turn-1', checkId: 'quality',
    judgeModel: 'judge', eventSequence: 3, elapsedMs: 8, evaluatedRubric: 'quality >= 0.8',
    request: 'exact instructions\nanswer\nrefs', response: '{bad', rationale: 'bad score',
    result: { status: 'grading-error', code: 'malformed-score' } };
  const bytes = Buffer.from(JSON.stringify(source));
  const chunk = (index: number, count: number, base64: string, byteLength = bytes.length) =>
    e(4 + index, 'source-record-chunk', { recordId: 'judge-1', index, count, byteLength, base64 });
  const completed = ready().accept(chunk(0, 1, bytes.toString('base64')));
  assert.equal(completed.type, 'source-record');
  if (completed.type === 'source-record') assert.deepEqual(completed.record, source);
  const interrupted = ready();
  interrupted.accept(chunk(0, 2, bytes.subarray(0, 10).toString('base64')));
  assert.deepEqual(interrupted.incompleteSource, { type: 'source-gap', caseId: 'case', attempt: 1,
    reason: 'incomplete', recordId: 'judge-1' });
  const overLimit = ready();
  assert.throws(() => overLimit.accept(chunk(0, 1, bytes.subarray(0, 10).toString('base64'), 256001)));
  assert.deepEqual(overLimit.incompleteSource, { type: 'source-gap', caseId: 'case', attempt: 1,
    reason: 'capture-failed', recordId: 'judge-1' });
});

test('version-two chunks preserve exact model source and reject false completion, links and duplicate records', () => {
  const selected: ExecutionSelection = { ...selection, cases: [{ ...singleCase,
    assertions: [{ id: 'exact', type: 'output-equals', expected: { type: 'inline', text: 'raw é' } }] }] };
  const source = { kind: 'model-call', id: 'call-1', turnId: 'turn-1', checkId: 'exact', modelId: 'fake',
    phase: 'initial', elapsedMs: 12, inputMessages: [{ role: 'user', content: 'prompt é' }],
    rawText: 'raw é', rawToolCalls: [{ id: 'provider-tool', name: 'lookup', arguments: { key: 'é' } }],
    normalizedOutput: 'normalized' };
  const bytes = Buffer.from(JSON.stringify(source));
  const chunks = [bytes.subarray(0, 17), bytes.subarray(17)];
  const e = (sequence: number, type: string, data: unknown, caseId: string | null = 'case') =>
    ({ protocolVersion: 2, requestId: 'request', runId: 'run', sequence, type, caseId, attempt: caseId ? 1 : null, data });
  const start = [e(0, 'run-started', { model: 'fake', judgeModel: null }, null),
    e(1, 'case-attempt-started', {}),
    e(2, 'conversation-turn-completed', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'normalized' })];
  const chunk = (sequence: number, index: number) => e(sequence, 'source-record-chunk', {
    recordId: 'call-1', index, count: 2, byteLength: bytes.length, base64: chunks[index]!.toString('base64') });
  const valid = new ExecuteEventValidator('request', selected);
  for (const item of start) valid.accept(item);
  assert.equal(valid.accept(chunk(3, 0)).type, 'source-chunk-accepted');
  assert.equal(valid.incompleteSource?.reason, 'incomplete');
  const complete = valid.accept(chunk(4, 1));
  assert.equal(complete.type, 'source-record');
  if (complete.type === 'source-record') assert.deepEqual(complete.record, source);
  assert.equal(valid.incompleteSource, undefined);
  assert.equal(valid.accept(e(5, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: true })).type, 'case-completed');
  assert.equal(valid.accept(e(6, 'run-completed', { status: 'completed' }, null)).type, 'run-completed');

  const prefix = () => { const validator = new ExecuteEventValidator('request', selected); for (const item of start) validator.accept(item); return validator; };
  assert.throws(() => prefix().accept(chunk(3, 1)), /invalid-source-order/);
  assert.throws(() => prefix().accept(e(3, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: true })), /invalid-case-end/);
  const unfinished = prefix(); unfinished.accept(chunk(3, 0));
  assert.throws(() => unfinished.accept(e(4, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: true })), /invalid-case-end/);
  const badLink = { ...source, checkId: 'other' };
  const linkBytes = Buffer.from(JSON.stringify(badLink));
  assert.throws(() => prefix().accept(e(3, 'source-record-chunk', { recordId: 'call-1', index: 0, count: 1,
    byteLength: linkBytes.length, base64: linkBytes.toString('base64') })), /invalid-source-link/);
  const duplicate = prefix(); duplicate.accept(chunk(3, 0)); duplicate.accept(chunk(4, 1));
  assert.throws(() => duplicate.accept(e(5, 'source-record-chunk', { recordId: 'call-1', index: 0, count: 1,
    byteLength: bytes.length, base64: bytes.toString('base64') })), /invalid-source-order/);
  const long = Buffer.from(JSON.stringify({ ...source, rawText: 'é'.repeat(5000) }));
  const large = prefix();
  const retained = large.accept(e(3, 'source-record-chunk', { recordId: 'call-1', index: 0, count: 1,
    byteLength: long.length, base64: long.toString('base64') }));
  assert.equal(retained.type, 'source-record');
  if (retained.type === 'source-record' && retained.record.kind === 'model-call') assert.equal(retained.record.rawText, 'é'.repeat(5000));
  assert.throws(() => prefix().accept({ ...chunk(3, 0), attempt: 2 }), /invalid-case/);
});

test('version-two source links delivered tool results and post-tool continuation to the selected check', () => {
  const selected: ExecutionSelection = { ...selection, cases: [{ ...singleCase,
    assertions: [{ id: 'exact', type: 'output-equals', expected: { type: 'inline', text: 'done' } }] }] };
  const validator = new ExecuteEventValidator('request', selected);
  const e = (sequence: number, type: string, data: unknown, caseId: string | null = 'case') =>
    ({ protocolVersion: 2, requestId: 'request', runId: 'run', sequence, type, caseId,
      attempt: caseId ? 1 : null, data });
  const source = (sequence: number, record: object) => {
    const bytes = Buffer.from(JSON.stringify(record));
    return e(sequence, 'source-record-chunk', { recordId: (record as { id: string }).id,
      index: 0, count: 1, byteLength: bytes.length, base64: bytes.toString('base64') });
  };
  validator.accept(e(0, 'run-started', { model: 'fake', judgeModel: null }, null));
  validator.accept(e(1, 'case-attempt-started', {}));
  validator.accept(e(2, 'conversation-turn-completed', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'done' }));
  const call = { kind: 'model-call', id: 'call-1', turnId: 'turn-1', checkId: 'exact', modelId: 'fake',
    phase: 'initial', elapsedMs: 2, inputMessages: [{ role: 'user', content: 'input é' }], rawText: 'raw é',
    rawToolCalls: [{ id: 'tool-1', name: 'lookup', arguments: { term: 'é' } }], normalizedOutput: 'done' };
  assert.deepEqual(validator.accept(source(3, call)), { type: 'source-record', caseId: 'case',
    attempt: 1, sequence: 3, record: call });
  validator.accept(e(4, 'tool-interaction-recorded', { toolId: 'tool-1', turnId: 'turn-1', position: 0,
    name: 'lookup', arguments: { term: 'é' }, outcome: 'result', result: { found: true } }));
  const delivery = { kind: 'tool-delivery', id: 'tool-1', turnId: 'turn-1', checkId: 'exact',
    modelCallId: 'call-1', name: 'lookup', request: { term: 'é' }, result: { found: true },
    outcome: 'result', elapsedMs: 4 };
  assert.deepEqual(validator.accept(source(5, delivery)), { type: 'source-record', caseId: 'case',
    attempt: 1, sequence: 5, record: delivery });
  const continuation = { ...call, id: 'call-2', phase: 'post-tool', rawText: 'continued é', rawToolCalls: [] };
  assert.deepEqual(validator.accept(source(6, continuation)), { type: 'source-record', caseId: 'case',
    attempt: 1, sequence: 6, record: continuation });
  assert.equal(validator.accept(e(7, 'case-attempt-completed', { status: 'completed', sourceEvidenceComplete: true })).type, 'case-completed');
});
