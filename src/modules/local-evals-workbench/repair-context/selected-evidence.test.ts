import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSelectedFailureReader, type FailureSelection } from './selected-evidence.js';
import type { GetEvalRunResult } from '../get-eval-run/index.js';

const selection: FailureSelection = { suiteId: 'suite', runId: 'run-two', testCaseId: 'case', attempt: 2, assertionId: 'a2' };
const summary = {
  version: 1 as const, suiteId: 'suite', runId: 'run-two', caseIds: ['case'], scope: 'all' as const,
  testedModel: 'model', judgeModel: null, repeats: 2, state: 'completed' as const,
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2,
  outcome: 'failed' as const, calls: 2, cost: null, diagnostics: [],
  cases: [{ caseId: 'case', state: 'completed' as const, attempts: [
    { number: 1, outcome: 'passed' as const, durationMs: 1, calls: 1, cost: null },
    { number: 2, outcome: 'failed' as const, durationMs: 1, calls: 1, cost: null },
  ] }],
};
const evidence = {
  version: 1 as const, suiteId: 'suite', runId: 'run-two', caseId: 'case', number: 2,
  outcome: 'failed' as const, durationMs: 1, calls: 1, cost: null, output: '', truncated: false, diagnostics: [],
  turns: [{ id: 'linked', role: 'assistant' as const, content: 'selected turn' }],
  tools: [{ id: 'tool-linked', name: 'verify', arguments: 'selected args', result: 'selected result' }],
  assertions: [{ id: 'a2', kind: 'assertion' as const, outcome: 'failed' as const, score: null,
    expected: 'selected expected', actual: 'selected actual', diagnostics: ['selected diagnostic'],
    turnIds: ['linked'], toolIds: ['tool-linked'] }],
};

describe('createSelectedFailureReader', () => {
  it('requests one exact run/attempt/assertion and projects bounded linked evidence', async () => {
    const commands: unknown[] = [];
    const reader = createSelectedFailureReader(async command => {
      commands.push(command);
      return { status: 'ok', value: { summary, evidence, evidenceStatus: 'available' } };
    });
    const result = await reader.read(selection);
    assert.deepEqual(commands, [{ suiteId: 'suite', runId: 'run-two', selection: { caseId: 'case', attempt: 2, assertionId: 'a2' } }]);
    assert.equal(result.status, 'ready');
    assert.match(JSON.stringify(result), /selected actual|selected turn|selected args/);
    assert.doesNotMatch(JSON.stringify(result), /other run|other attempt|unlinked/);
  });
  it('blocks unavailable, mismatched, passed, and oversized evidence', async () => {
    const cases: GetEvalRunResult[] = [
      { status: 'blocked', reason: 'not-found' },
      { status: 'ok', value: { summary, evidenceStatus: 'unavailable' } },
      { status: 'ok', value: { summary, evidence: { ...evidence, runId: 'other-run' }, evidenceStatus: 'available' } },
      { status: 'ok', value: { summary, evidence: { ...evidence, assertions: [{ ...evidence.assertions[0]!, outcome: 'passed' }] }, evidenceStatus: 'available' } },
    ];
    for (const item of cases) assert.equal((await createSelectedFailureReader(async () => item).read(selection)).status, 'blocked');
    const huge = { ...evidence, assertions: [{ ...evidence.assertions[0]!, actual: 'x'.repeat(20_000) }] };
    const bounded = await createSelectedFailureReader(async () => ({ status: 'ok', value: { summary, evidence: huge, evidenceStatus: 'available' } })).read(selection);
    assert.equal(bounded.status, 'ready');
    if (bounded.status === 'ready') assert.ok(JSON.stringify(bounded.value.evidence).length < 5000);
  });
});
