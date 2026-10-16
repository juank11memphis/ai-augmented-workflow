import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGraderOutcomes } from './attempt-evidence.js';
import type { ExecutionEvent } from './contracts.js';
import { sourceRecord } from '../runner-process/source-records.js';
const graders = [{ id: 'custom', type: 'custom' as const, name: 'safe' },
  { id: 'rubric', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }];
const events: Extract<ExecutionEvent, { type: 'grader-completed' }>[] = [
  { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'custom', grader: 'custom', passed: true, score: null, evidence: 'safe', diagnostics: [] },
  { type: 'grader-completed', caseId: 'case', attempt: 1, checkId: 'rubric', grader: 'rubric', passed: false, score: 0.7, threshold: 0.8, judgeModel: 'judge', evidence: 'Missing caveat', diagnostics: [] },
];
test('normalizes declared custom and rubric outcomes without hidden reasoning', () => {
  const result = normalizeGraderOutcomes(graders, events, 'judge');
  assert.deepEqual(result.map(item => item.outcome), ['passed', 'failed']);
  assert.equal(result[1]?.judgeModel, 'judge');
  assert.equal(result[1]?.score, 0.7);
});
test('missing, duplicate, undeclared, wrong judge, and inconsistent threshold fail closed', () => {
  for (const invalid of [events.slice(0, 1), [...events, events[0]!],
    [...events.slice(0, 1), { ...events[1]!, checkId: 'unknown' }],
    [...events.slice(0, 1), { ...events[1]!, judgeModel: 'wrong' }],
    [...events.slice(0, 1), { ...events[1]!, passed: true }]]) {
    assert.throws(() => normalizeGraderOutcomes(graders, invalid, 'judge'));
  }
});

test('source record shape distinguishes provider text, structured calls, normalized output and delivered tool results', () => {
  const call = { kind: 'model-call', id: 'call-1', turnId: 'turn-1', checkId: 'exact', modelId: 'fake', phase: 'initial',
    elapsedMs: 4, inputMessages: [{ role: 'user', content: 'prompt é' }], rawText: 'raw é',
    rawToolCalls: [{ id: 'tool-1', name: 'lookup', arguments: { id: 'é' } }], normalizedOutput: 'normalized' };
  const tool = { kind: 'tool-delivery', id: 'tool-1', turnId: 'turn-1', checkId: 'exact', modelCallId: 'call-1',
    name: 'lookup', request: { id: 'é' }, result: { found: true }, outcome: 'result', elapsedMs: 8 };
  assert.equal(sourceRecord(call), true);
  assert.equal(sourceRecord(tool), true);
  assert.equal(sourceRecord({ ...call, rawText: undefined }), false);
  assert.equal(sourceRecord({ ...tool, modelCallId: '../other' }), false);
});
