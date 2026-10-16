import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, Manifest, RunDetail } from '../run-history/index.js';
import { headlessEvalResult } from './handler.js';
import type { SourceEvidence } from '../run-history/contracts.js';

const summary: Manifest = {
  version: 1, suiteId: 'suite', runId: 'run', caseIds: ['case'], scope: 'selected', testedModel: 'model', judgeModel: null,
  state: 'completed', owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2, outcome: 'failed',
  calls: 1, cost: 0, diagnostics: ['full-run-secret'], cases: [{ caseId: 'case', state: 'completed', attempts: [{ number: 1, outcome: 'failed', durationMs: 1, calls: 1, cost: 0 }] }],
};
const evidence: Attempt = {
  version: 1, suiteId: 'suite', runId: 'run', caseId: 'case', number: 1, outcome: 'failed', durationMs: 1, calls: 1, cost: 0,
  output: 'full-run-output-secret', truncated: false, diagnostics: ['full-run-diagnostic-secret'],
  turns: [{ id: 'turn', role: 'assistant', content: 'full-trace-secret' }], tools: [],
  assertions: [{ id: 'check', kind: 'assertion', outcome: 'failed', score: null, expected: 'expected', actual: 'actual', diagnostics: ['selected diagnostic'], turnIds: ['turn'], toolIds: [] }],
};
const selection = { caseId: 'case', attempt: 1 as const, assertionId: 'check' };
const ready = (detail: RunDetail) => ({ reader: { get: async () => ({ status: 'ok' as const, value: detail }) } });

test('summary omits full-run output, diagnostics and attempt traces', async () => {
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, ready({ summary, evidenceStatus: 'not-requested', reviewArtifactPath: 'evals/runs/run.json' }));
  assert.equal(result.status, 'ready');
  assert.doesNotMatch(JSON.stringify(result), /secret|output|turns|tools|owner/);
  if (result.status === 'ready' && 'artifactPath' in result) assert.equal(result.artifactPath, 'evals/runs/run.json');
});

test('one failed assertion has capped selected context and safe artifact reference', async () => {
  const long = 'a'.repeat(2000);
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary, evidenceStatus: 'available',
    evidence: { ...evidence, assertions: [{ ...evidence.assertions[0]!, actual: long, expected: long, diagnostics: [long, long, long, long] }] },
    reviewArtifactPath: 'evals/runs/run.json' }));
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready' || !('failure' in result)) assert.fail('Expected selected failure');
  assert.equal(result.failure.actual.length, 600);
  assert.equal(result.failure.expected.length, 600);
  assert.equal(result.failure.diagnostics.length, 3);
  assert.equal(result.failure.truncated, true);
  assert.equal(result.failure.artifactPath, 'evals/runs/run.json');
  assert.ok(JSON.stringify(result).length <= 4800);
  assert.doesNotMatch(JSON.stringify(result), /full-run|full-trace/);
});

test('unsafe or missing artifacts and runtime reader failures return typed blocks', async () => {
  const unsafe = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, { reader: { get: async () => ({ status: 'blocked', reason: 'unsafe-path' }) } });
  assert.deepEqual(unsafe, { status: 'blocked', reason: 'unsafe-artifact' });
  const missing = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary, evidenceStatus: 'unavailable' }));
  assert.deepEqual(missing, { status: 'blocked', reason: 'missing-artifact' });
  const failed = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, { reader: { get: async () => { throw Error('secret'); } } });
  assert.deepEqual(failed, { status: 'blocked', reason: 'unavailable' });
  const unsafeReference = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, ready({ summary, evidenceStatus: 'not-requested', reviewArtifactPath: '../private/secret.json' }));
  assert.equal(unsafeReference.status, 'ready');
  assert.doesNotMatch(JSON.stringify(unsafeReference), /private|secret/);
});

test('non-failed and mismatched selections never expose evidence', async () => {
  const passed = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary, evidenceStatus: 'available',
    evidence: { ...evidence, assertions: [{ ...evidence.assertions[0]!, outcome: 'passed' }] } }));
  assert.deepEqual(passed, { status: 'blocked', reason: 'non-failed-assertion' });
  const mismatched = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary, evidenceStatus: 'available', evidence: { ...evidence, caseId: 'other' } }));
  assert.deepEqual(mismatched, { status: 'blocked', reason: 'selection-mismatch' });
  const invalid = await headlessEvalResult({ suiteId: '../suite', runId: 'run' }, ready({ summary, evidenceStatus: 'not-requested' }));
  assert.deepEqual(invalid, { status: 'blocked', reason: 'invalid-input' });
});

test('unselected result supplies the same locator and selected result accepts it', async () => {
  const reader = { get: async (_suiteId: string, _runId: string, selected?: { assertionId?: string }) => ({ status: 'ok' as const,
    value: { summary, evidenceStatus: selected ? 'available' as const : 'not-requested' as const,
      ...(selected ? { evidence } : {}) } }) };
  const unselected = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, { reader });
  assert.equal(unselected.status, 'ready');
  if (unselected.status !== 'ready') assert.fail('Expected summary');
  assert.deepEqual(unselected.summary.cases[0]?.attempts[0], { number: 1, outcome: 'failed', failedAssertionIds: ['check'], locatorStatus: 'available' });
  assert.doesNotMatch(JSON.stringify(unselected), /full-run|full-trace|selected diagnostic|expected|actual/);
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, { reader });
  assert.equal(selected.status, 'ready');
  if (selected.status !== 'ready' || !('failure' in selected)) assert.fail('Expected selected failure');
  assert.equal(selected.failure.assertionId, 'check');
});

test('invalid and unavailable attempt evidence never produces a false locator', async () => {
  for (const detail of [
    { summary, evidenceStatus: 'unavailable' as const },
    { summary, evidenceStatus: 'available' as const, evidence: { ...evidence, assertions: [{ ...evidence.assertions[0]!, id: '../unsafe' }] } },
  ]) {
    const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, ready(detail));
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') assert.fail('Expected summary');
    assert.deepEqual(result.summary.cases[0]?.attempts[0], { number: 1, outcome: 'failed', failedAssertionIds: [], locatorStatus: 'unavailable' });
  }
});

test('document cap follows case order and marks later failed attempts truncated', async () => {
  const first = { ...evidence, assertions: Array.from({ length: 32 }, (_, index) => ({ ...evidence.assertions[0]!, id: `id-${index}` })) };
  const secondCase = { caseId: 'later', state: 'completed' as const, attempts: [{ ...summary.cases[0]!.attempts[0]! }] };
  const twoCases: Manifest = { ...summary, caseIds: ['case', 'later'], cases: [...summary.cases, secondCase] };
  let attemptReads = 0;
  const reader = { get: async (_suiteId: string, _runId: string, selected?: { caseId: string }) => {
    if (selected) attemptReads++;
    return { status: 'ok' as const, value: { summary: twoCases, evidenceStatus: selected ? 'available' as const : 'not-requested' as const,
      ...(selected ? { evidence: first } : {}) } };
  } };
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, { reader });
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready') assert.fail('Expected summary');
  assert.deepEqual(result.summary.cases[0]?.attempts[0]?.failedAssertionIds, first.assertions.map(item => item.id));
  assert.deepEqual(result.summary.cases[1]?.attempts[0], { number: 1, outcome: 'failed', failedAssertionIds: [], locatorStatus: 'truncated' });
  assert.equal(attemptReads, 1);
});

const field = (locator: string, value: string) => ({ status: 'available' as const, locator, byteLength: Buffer.byteLength(value), value });
const source: SourceEvidence = {
  version: 2, assertionId: 'check',
  modelCalls: [
    { id: 'call-2', turnId: 'turn-2', sequence: 4, modelId: 'model',
      inputMessages: [{ role: 'tool', content: field('message-2', 'delivered result') }],
      rawText: field('raw-2', 'raw answer'), rawToolCalls: [], normalizedOutput: field('normalized-2', 'normalized answer') },
    { id: 'call-1', turnId: 'turn-1', sequence: 1, modelId: 'model',
      inputMessages: [{ role: 'user', content: field('message-1', 'original question') }],
      rawText: field('raw-1', 'calling tool'),
      rawToolCalls: [{ id: 'tool-1', name: 'lookup', arguments: field('arguments-1', '{"q":"exact"}') }],
      normalizedOutput: field('normalized-1', 'tool requested') },
  ],
  toolEvents: [{ id: 'event-1', modelCallId: 'call-1', sequence: 2, name: 'lookup',
    request: field('request-1', '{"q":"exact"}'), result: field('result-1', 'delivered result'), outcome: 'result' }],
  approvedFacts: [{ modelCallId: 'call-2', factId: 'fact-1', provenance: 'attested-input' }],
};

test('selected source keeps exact raw and normalized values, structured calls, and ordered linked context', async () => {
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, sourceEvidence: source } }));
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready' || !('failure' in result) || !('modelCalls' in result.failure.source)) assert.fail('Expected source');
  assert.deepEqual(result.failure.source.modelCalls.map(call => call.id), ['call-1', 'call-2']);
  assert.deepEqual(result.failure.source.modelCalls[0]?.rawText, { status: 'available', locator: 'raw-1', byteLength: 12, truncated: false, value: 'calling tool' });
  assert.equal(result.failure.source.modelCalls[1]?.normalizedOutput.status, 'available');
  assert.notDeepEqual(result.failure.source.modelCalls[1]?.rawText, result.failure.source.modelCalls[1]?.normalizedOutput);
  assert.equal(result.failure.source.modelCalls[0]?.rawToolCalls[0]?.arguments.status, 'available');
  assert.deepEqual(result.failure.source.toolEvents.map(event => event.sequence), [2]);
  assert.deepEqual(result.failure.source.approvedFacts, source.approvedFacts);
  assert.deepEqual(result.failure.source.sequence, [
    { kind: 'model-call', id: 'call-1', order: 1 },
    { kind: 'tool-delivery', id: 'event-1', order: 2 },
    { kind: 'model-call', id: 'call-2', order: 4 },
  ]);
  assert.equal(result.failure.assertionId, 'check');
});

test('selected identity uses the exact case, attempt, assertion, and case-specific models', async () => {
  const perCase = { ...summary, testedModel: 'default-model', judgeModel: 'default-judge', cases: [
    { ...summary.cases[0]!, testedModel: 'actual-model', judgeModel: 'actual-judge' },
  ] };
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary: perCase,
    evidenceStatus: 'available', evidence: { ...evidence, assertions: [rubricAssertion], sourceEvidence: rubricSource } }));
  if (selected.status !== 'ready' || !('failure' in selected)) assert.fail('Expected exact selected failure');
  assert.deepEqual({ caseId: selected.failure.caseId, attempt: selected.failure.attempt,
    assertionId: selected.failure.assertionId }, selection);
  assert.equal(selected.summary.cases[0]?.testedModel, 'actual-model');
  assert.equal(selected.summary.cases[0]?.judgeModel, 'actual-judge');
  assert.equal(selected.failure.grading.kind, 'rubric');
  if (selected.failure.grading.kind !== 'rubric') assert.fail('Expected rubric');
  assert.deepEqual({ score: selected.failure.grading.score, threshold: selected.failure.grading.threshold,
    comparison: selected.failure.grading.comparison, judgeModel: selected.failure.grading.judgeModel },
  { score: 0.4, threshold: 0.7, comparison: 'failed', judgeModel: 'actual-judge' });
  assert.deepEqual(selected.failure.diagnostics, ['selected diagnostic']);
  if (!('sequence' in selected.failure.source)) assert.fail('Expected source sequence');
  assert.deepEqual(selected.failure.source.sequence.map(item => item.kind), ['model-call', 'tool-delivery', 'model-call', 'judge-exchange']);
  assert.equal(selected.failure.source.sequence[3]?.id, 'check');
  const compact = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, ready({ summary: perCase,
    evidenceStatus: 'not-requested' }));
  assert.doesNotMatch(JSON.stringify(compact), /full-run-secret|full-run-output-secret|full-trace-secret|Missing R/);
});

test('wrong case and attempt never fall back to another selected artifact', async () => {
  for (const wrong of [{ ...selection, caseId: 'other' }, { ...selection, attempt: 2 }]) {
    const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection: wrong }, ready({ summary,
      evidenceStatus: 'available', evidence }));
    assert.deepEqual(result, { status: 'blocked', reason: 'selection-mismatch' });
  }
  const unavailable = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'unavailable' }));
  assert.deepEqual(unavailable, { status: 'blocked', reason: 'missing-artifact' });
  const corrupt = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection },
    { reader: { get: async () => ({ status: 'blocked', reason: 'corrupt' }) } });
  assert.deepEqual(corrupt, { status: 'blocked', reason: 'corrupt-artifact' });
});

test('old, incomplete, and runner-redacted evidence report typed gaps without reconstructed raw text', async () => {
  const old = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary, evidenceStatus: 'available', evidence }));
  assert.equal(old.status, 'ready');
  if (old.status !== 'ready' || !('failure' in old)) assert.fail('Expected failure');
  assert.deepEqual(old.failure.source, { status: 'gap', reason: 'not-captured' });
  const redactedSource: SourceEvidence = { ...source, modelCalls: [{ ...source.modelCalls[0]!, rawText: { status: 'gap', reason: 'redacted' },
    normalizedOutput: { status: 'gap', reason: 'incomplete' } }] };
  const redacted = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, sourceEvidence: redactedSource } }));
  assert.equal(redacted.status, 'ready');
  if (redacted.status !== 'ready' || !('failure' in redacted) || !('modelCalls' in redacted.failure.source)) assert.fail('Expected source');
  assert.deepEqual(redacted.failure.source.modelCalls[0]?.rawText, { status: 'gap', reason: 'redacted' });
  assert.deepEqual(redacted.failure.source.modelCalls[0]?.normalizedOutput, { status: 'gap', reason: 'incomplete' });
  assert.doesNotMatch(JSON.stringify(redacted.failure.source), /raw answer/);
});

test('large retained UTF-8 field has byte-range continuation that reconstructs exact bytes', async () => {
  const raw = 'é'.repeat(700);
  const largeSource: SourceEvidence = { ...source, modelCalls: [{ ...source.modelCalls[0]!, rawText: field('call-2~rawText', raw) }] };
  const detail = { summary, evidenceStatus: 'available' as const, evidence: { ...evidence, sourceEvidence: largeSource } };
  const bytes = Buffer.from(raw);
  const reader = { get: async () => ({ status: 'ok' as const, value: detail }),
    readField: async (_suite: string, _run: string, _selected: object, locator: string, offset: number, limit: number) => ({
      status: 'ok' as const, value: { locator, offset, byteLength: bytes.length,
        bytes: bytes.subarray(offset, offset + limit), nextOffset: offset + limit >= bytes.length ? null : offset + limit },
    }) };
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, { reader });
  assert.equal(selected.status, 'ready');
  if (selected.status !== 'ready' || !('failure' in selected) || !('modelCalls' in selected.failure.source)) assert.fail('Expected source');
  assert.deepEqual(selected.failure.source.modelCalls[0]?.rawText, { status: 'available', locator: 'call-2~rawText', byteLength: 1400, truncated: true });
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection, field: { locator: 'call-2~rawText', offset } }, { reader });
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready' || !('field' in result)) assert.fail('Expected range');
    chunks.push(Buffer.from(result.field.bytesBase64, 'base64'));
    offset = result.field.nextOffset ?? bytes.length;
  }
  assert.equal(Buffer.concat(chunks).toString('utf8'), raw);
});

test('wrong assertion, field locator, or offset refuses cross-selection reads', async () => {
  let fieldReads = 0;
  const reader = { get: async () => ({ status: 'ok' as const, value: { summary, evidenceStatus: 'available' as const,
    evidence: { ...evidence, sourceEvidence: source } } }), readField: async () => { fieldReads++; throw Error('must not read'); } };
  const wrong = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection: { ...selection, assertionId: 'other' } }, { reader });
  assert.deepEqual(wrong, { status: 'blocked', reason: 'selection-mismatch' });
  const locator = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection, field: { locator: 'other~rawText', offset: 0 } }, { reader });
  assert.deepEqual(locator, { status: 'blocked', reason: 'selection-mismatch' });
  const malformed = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection, field: { locator: 'not-linked', offset: 0 } }, { reader });
  assert.deepEqual(malformed, { status: 'blocked', reason: 'invalid-input' });
  const offset = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection, field: { locator: 'call-1~rawText', offset: -1 } }, { reader });
  assert.deepEqual(offset, { status: 'blocked', reason: 'invalid-input' });
  assert.equal(fieldReads, 0);
});

const rubricAssertion = { ...evidence.assertions[0]!, kind: 'grader' as const, score: 0.4,
  threshold: 0.7, judgeModel: 'actual-judge' };
const rubricSource: SourceEvidence = { ...source, judge: { version: 1, judgeModel: 'actual-judge',
  evaluatedRubric: field('judge-1~rubric', 'Evaluate factual accuracy, not style'),
  request: field('judge-1~request', 'Instructions: grade answer A against reference R'),
  response: field('judge-1~response', '{"score":0.4,"reason":"Missing R"}'),
  rationale: field('judge-1~rationale', 'Missing R'),
} };

test('rubric selection separates exact judge fields from numeric score, threshold, and comparison', async () => {
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, assertions: [rubricAssertion], sourceEvidence: rubricSource } }));
  assert.equal(selected.status, 'ready');
  if (selected.status !== 'ready' || !('failure' in selected)) assert.fail('Expected failed rubric');
  assert.deepEqual(selected.failure.grading, { kind: 'rubric',
    evaluatedRubric: { ...field('judge-1~rubric', 'Evaluate factual accuracy, not style'), truncated: false },
    score: 0.4, threshold: 0.7, comparison: 'failed', judgeModel: 'actual-judge',
    judge: { version: 1,
      request: { ...field('judge-1~request', 'Instructions: grade answer A against reference R'), truncated: false },
      response: { ...field('judge-1~response', '{"score":0.4,"reason":"Missing R"}'), truncated: false },
      rationale: { ...field('judge-1~rationale', 'Missing R'), truncated: false },
    },
  });
  const compact = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, ready({ summary, evidenceStatus: 'not-requested' }));
  assert.doesNotMatch(JSON.stringify(compact), /Missing R|grade answer A/);
});

test('deterministic checks have no judge exchange and old rubric runs have a typed judge gap', async () => {
  const deterministic = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, sourceEvidence: source } }));
  if (deterministic.status !== 'ready' || !('failure' in deterministic)) assert.fail('Expected deterministic failure');
  assert.deepEqual(deterministic.failure.grading, { kind: 'deterministic' });
  const oldRubric = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, assertions: [rubricAssertion] } }));
  if (oldRubric.status !== 'ready' || !('failure' in oldRubric) || oldRubric.failure.grading.kind !== 'rubric') assert.fail('Expected old rubric');
  assert.deepEqual(oldRubric.failure.grading.judge, { status: 'gap', reason: 'not-captured' });
  assert.deepEqual(oldRubric.failure.grading.evaluatedRubric, { status: 'gap', reason: 'not-captured' });
});

test('malformed judge response exposes grading issue without claiming a model assertion failure', async () => {
  const malformed = { ...rubricSource, judge: { ...rubricSource.judge!, response: field('judge-1~response', 'not-json'),
    rationale: { status: 'gap' as const, reason: 'incomplete' as const }, error: { code: 'malformed-response' } } };
  const issue = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary: { ...summary, outcome: 'incomplete' },
    evidenceStatus: 'available', evidence: { ...evidence, outcome: 'incomplete', assertions: [{ ...rubricAssertion,
      outcome: 'incomplete', score: null, gradingError: { code: 'malformed-response' } }], sourceEvidence: malformed } }));
  if (issue.status !== 'ready' || !('gradingIssue' in issue)) assert.fail('Expected grading issue');
  assert.equal(issue.gradingIssue.grading.comparison, 'incomplete');
  assert.deepEqual(issue.gradingIssue.grading.error, { code: 'malformed-response' });
  assert.deepEqual(issue.gradingIssue.grading.judge, { version: 1,
    request: { ...field('judge-1~request', 'Instructions: grade answer A against reference R'), truncated: false },
    response: { ...field('judge-1~response', 'not-json'), truncated: false },
    rationale: { status: 'gap', reason: 'incomplete' }, error: { code: 'malformed-response' },
  });
  assert.equal('failure' in issue, false);
});

test('failed judge without captured exchange reports error and gaps, not a model failure', async () => {
  const issue = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary: { ...summary, outcome: 'incomplete' },
    evidenceStatus: 'available', evidence: { ...evidence, outcome: 'incomplete', assertions: [{ ...rubricAssertion,
      outcome: 'incomplete', score: null, gradingError: { code: 'judge-unavailable' } }] } }));
  if (issue.status !== 'ready' || !('gradingIssue' in issue)) assert.fail('Expected grading issue');
  assert.deepEqual(issue.gradingIssue.grading.error, { code: 'judge-unavailable' });
  assert.deepEqual(issue.gradingIssue.grading.judge, { status: 'gap', reason: 'not-captured' });
  assert.deepEqual(issue.gradingIssue.source, { status: 'gap', reason: 'not-captured' });
  assert.equal('failure' in issue, false);
});

test('judge disagreement remains unproven by a completed low score', async () => {
  const selected = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({ summary,
    evidenceStatus: 'available', evidence: { ...evidence, assertions: [rubricAssertion], sourceEvidence: rubricSource } }));
  if (selected.status !== 'ready' || !('failure' in selected)) assert.fail('Expected failed comparison');
  assert.equal(selected.failure.grading.kind, 'rubric');
  assert.doesNotMatch(JSON.stringify(selected), /judge.disagreement|model.root.cause/i);
});

test('tool, runner, and partial execution remain distinct from completed assertion and grading failure', async () => {
  const unfinished = { ...evidence, outcome: 'incomplete' as const,
    assertions: [{ ...evidence.assertions[0]!, outcome: 'incomplete' as const }] };
  const toolSource: SourceEvidence = { ...source, toolEvents: [{ ...source.toolEvents[0]!, outcome: 'error',
    result: { status: 'gap', reason: 'capture-failed' } }], gaps: [{ reason: 'capture-failed', recordId: 'event-1' }] };
  const scenarios = [
    { state: 'partial' as const, sourceEvidence: toolSource, code: 'tool-error' },
    { state: 'error' as const, sourceEvidence: source, code: 'runner-error' },
    { state: 'interrupted' as const, sourceEvidence: { ...source, gaps: [{ reason: 'incomplete' as const }] }, code: 'incomplete-execution' },
  ];
  for (const scenario of scenarios) {
    const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({
      summary: { ...summary, state: scenario.state, outcome: 'incomplete', cases: [{ ...summary.cases[0]!, state: 'incomplete' }] },
      evidenceStatus: 'available', evidence: { ...unfinished, sourceEvidence: scenario.sourceEvidence },
    }));
    if (result.status !== 'ready' || !('executionIssue' in result)) assert.fail(`Expected ${scenario.code}`);
    assert.equal(result.executionIssue.code, scenario.code);
    assert.equal(result.executionIssue.state, scenario.state);
    assert.deepEqual({ caseId: result.executionIssue.caseId, attempt: result.executionIssue.attempt,
      assertionId: result.executionIssue.assertionId }, selection);
    assert.equal('failure' in result, false);
    assert.equal('gradingIssue' in result, false);
    assert.doesNotMatch(JSON.stringify(result), /full-run-secret|full-run-output-secret|full-trace-secret/);
  }
  const absent = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection }, ready({
    summary: { ...summary, state: 'partial', outcome: 'incomplete' }, evidenceStatus: 'available',
    evidence: { ...unfinished, assertions: [] },
  }));
  assert.deepEqual(absent, { status: 'blocked', reason: 'selection-mismatch' });
});

test('judge field continuation rejects a locator absent from the selected assertion', async () => {
  let reads = 0;
  const reader = { get: async () => ({ status: 'ok' as const, value: { summary, evidenceStatus: 'available' as const,
    evidence: { ...evidence, assertions: [rubricAssertion], sourceEvidence: rubricSource } } }),
  readField: async () => { reads++; throw Error('must not read'); } };
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection,
    field: { locator: 'other-judge~response', offset: 0 } }, { reader });
  assert.deepEqual(result, { status: 'blocked', reason: 'selection-mismatch' });
  assert.equal(reads, 0);
});
