import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, Manifest, RunDetail } from '../run-history/index.js';
import { headlessEvalResult } from './handler.js';

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
