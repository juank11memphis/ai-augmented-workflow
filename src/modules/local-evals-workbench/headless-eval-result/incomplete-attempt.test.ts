import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, Manifest, Selection } from '../run-history/contracts.js';
import { headlessEvalResult } from './handler.js';

const raw = 'PRIVATE-RAW-BODY';
const cases: Manifest['cases'] = [
  ...['done-a', 'done-b'].map(caseId => ({ caseId, state: 'completed' as const, attempts: [] })),
  { caseId: 'approximate-price', state: 'incomplete', attempts: [{ number: 1, outcome: 'incomplete', durationMs: 1, calls: 1, cost: null }] },
  ...Array.from({ length: 14 }, (_, index) => ({ caseId: `later-${index}`, state: 'not-run' as const, attempts: [] })),
];
const summary: Manifest = { version: 1, suiteId: 'suite', runId: 'run', caseIds: cases.map(item => item.caseId),
  scope: 'all', testedModel: 'model', judgeModel: null, state: 'error', outcome: 'incomplete',
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2, calls: 1, cost: null,
  diagnostics: [raw], cases, failureProvenance: { stage: 'runner-report', runnerReport: { status: 'error', code: 'malformed-output' }, processExit: { code: 1 } } };
const attempt: Attempt = { version: 1, suiteId: 'suite', runId: 'run', caseId: 'approximate-price', number: 1,
  outcome: 'incomplete', durationMs: 1, calls: 1, cost: null, output: raw, truncated: false,
  diagnostics: ['malformed-output', raw], diagnosticLinks: [{ code: 'malformed-output', turnId: 'turn-1', callId: 'call-1' }],
  failureProvenance: summary.failureProvenance, turns: [{ id: 'turn-1', role: 'assistant', content: raw }], tools: [], assertions: [] };
const reader = { get: async (_suiteId: string, _runId: string, selection?: Selection) => ({ status: 'ok' as const,
  value: { summary, evidenceStatus: selection ? 'available' as const : 'not-requested' as const,
    ...(selection ? { evidence: attempt } : {}) } }) };

test('summary locates incomplete attempt and truthfully counts the 17-case run', async () => {
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run' }, { reader });
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.deepEqual(result.summary.counts, { completed: 2, incomplete: 1, notRun: 14 });
  assert.deepEqual(result.summary.cases[2]?.attempts[0]?.incompleteLocator, { caseId: 'approximate-price', attempt: 1 });
  assert.equal(result.summary.failureProvenance?.stage, 'runner-report');
  assert.ok(JSON.stringify(result).length <= 4800);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-RAW-BODY/);
});

test('selects no-assertion incomplete attempt with safe links and explicit missing response', async () => {
  const result = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection: { caseId: 'approximate-price', attempt: 1 } }, { reader });
  assert.equal(result.status, 'ready'); if (result.status !== 'ready' || !('incompleteAttempt' in result)) return assert.fail();
  assert.deepEqual(result.incompleteAttempt.diagnostics, ['malformed-output']);
  assert.deepEqual(result.incompleteAttempt.turnIds, ['turn-1']);
  assert.deepEqual(result.incompleteAttempt.callIds, ['call-1']);
  assert.deepEqual(result.incompleteAttempt.source, { status: 'gap', reason: 'not-captured' });
  assert.equal(result.incompleteAttempt.failureProvenance?.runnerReport?.code, 'malformed-output');
  assert.equal(JSON.stringify(result).includes(raw), false);
  assert.ok(JSON.stringify(result).length <= 4800);
});

test('rejects mismatched incomplete evidence and preserves assertion selection', async () => {
  const mismatch = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection: { caseId: 'approximate-price', attempt: 1 } },
    { reader: { get: async () => ({ status: 'ok' as const, value: { summary, evidenceStatus: 'available' as const,
      evidence: { ...attempt, caseId: 'other' } } }) } });
  assert.deepEqual(mismatch, { status: 'blocked', reason: 'selection-mismatch' });
  const assertion = await headlessEvalResult({ suiteId: 'suite', runId: 'run', selection: { caseId: 'approximate-price', attempt: 1, assertionId: 'missing' } }, { reader });
  assert.deepEqual(assertion, { status: 'blocked', reason: 'selection-mismatch' });
});
