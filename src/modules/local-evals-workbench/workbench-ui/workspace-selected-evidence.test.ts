import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { RunDetail } from '../run-history/contracts.js';
import { projectSelectedEvidence, type EvidenceSelection } from './workspace-selected-evidence.js';

const selection: EvidenceSelection = { suiteId: 'suite', runId: 'run', caseId: 'case', attempt: 2 };

function detail(): RunDetail {
  return {
    evidenceStatus: 'available',
    summary: {
      version: 1, suiteId: 'suite', runId: 'run', caseIds: ['case'], scope: 'all', testedModel: 'model',
      judgeModel: null, state: 'completed', owner: { pid: 1, token: 'fixture' },
      createdAt: 1, updatedAt: 2, finishedAt: 2, outcome: 'failed', calls: null, cost: null,
      diagnostics: [], cases: [{ caseId: 'case', state: 'completed', attempts: [
        { number: 2, outcome: 'failed', durationMs: 1, calls: null, cost: null },
      ] }],
    },
    evidence: {
      version: 1, suiteId: 'suite', runId: 'run', caseId: 'case', number: 2, outcome: 'failed',
      durationMs: 1, calls: null, cost: null, output: 'private raw response', truncated: false,
      diagnostics: ['private attempt diagnostic'],
      turns: [{ id: 'turn', role: 'assistant', content: 'private turn' }],
      tools: [{ id: 'tool', name: 'lookup', arguments: 'private arguments', result: 'private result' }],
      assertions: [
        { id: 'passed', kind: 'assertion', outcome: 'passed', score: null, expected: 'private passed expected', actual: 'private passed actual', diagnostics: [], turnIds: [], toolIds: [] },
        { id: 'failed-first', kind: 'grader', outcome: 'failed', score: 0.3, threshold: 0.7, expected: 'private reference', actual: 'private actual', diagnostics: ['private check diagnostic'], turnIds: ['turn'], toolIds: ['tool'] },
        { id: 'failed-second', kind: 'assertion', outcome: 'failed', score: null, expected: 'second expected', actual: 'second actual', diagnostics: [], turnIds: [], toolIds: [] },
      ],
    },
  };
}

function ready(result: ReturnType<typeof projectSelectedEvidence>) {
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready') throw new Error('Selected evidence was not ready');
  return result.value;
}

it('validates exact suite/run/case/attempt identity against summary and evidence', () => {
  for (const key of ['suiteId', 'runId', 'caseId', 'attempt'] as const) {
    const wrong = { ...selection, [key]: key === 'attempt' ? 1 : 'other' };
    assert.deepEqual(projectSelectedEvidence(detail(), wrong), { status: 'invalid', reason: 'identity-mismatch' });
  }
  const mismatched = detail();
  assert.deepEqual(projectSelectedEvidence({ ...mismatched, evidence: { ...mismatched.evidence!, runId: 'other' } }, selection),
    { status: 'invalid', reason: 'identity-mismatch' });
  assert.deepEqual(projectSelectedEvidence({ ...mismatched, evidenceStatus: 'unavailable', evidence: undefined }, selection),
    { status: 'invalid', reason: 'unavailable' });
});

it('defaults to the first actual failed check and keeps all distinct private evidence in detail', () => {
  const value = ready(projectSelectedEvidence(detail(), selection));
  assert.equal(value.selectedCheck?.id, 'failed-first');
  assert.deepEqual(value.analysisScope, { ...selection, assertionId: 'failed-first' });
  assert.equal(value.actual, 'private actual');
  assert.equal(value.expected, 'private reference');
  assert.equal(value.score, 0.3);
  assert.equal(value.threshold, 0.7);
  assert.equal(value.checks.length, 3);
  assert.deepEqual(value.selectedCheck?.diagnostics, ['private check diagnostic']);
  assert.deepEqual(value.diagnostics, ['private attempt diagnostic']);
  assert.equal(value.turns[0]?.content, 'private turn');
  assert.equal(value.tools[0]?.result, 'private result');
  assert.equal(value.rawResponse, 'private raw response');
});

it('selects the exact explicitly requested failed assertion and rejects invalid or passed requests', () => {
  const value = ready(projectSelectedEvidence(detail(), { ...selection, assertionId: 'failed-second' }));
  assert.equal(value.selectedCheck?.id, 'failed-second');
  assert.equal(value.analysisScope?.assertionId, 'failed-second');
  for (const assertionId of ['missing', 'passed']) {
    assert.deepEqual(projectSelectedEvidence(detail(), { ...selection, assertionId }),
      { status: 'invalid', reason: 'invalid-assertion' });
  }
});

it('retains inspectable passed-attempt evidence and checks without inventing failure analysis scope', () => {
  const saved = detail();
  const passed = { ...saved, summary: { ...saved.summary, cases: [{ caseId: 'case' as const, state: 'completed' as const,
    attempts: [{ number: 2, outcome: 'passed' as const, durationMs: 1, calls: null, cost: null }] }] },
    evidence: { ...saved.evidence!, outcome: 'passed' as const, assertions: [saved.evidence!.assertions[0]!] } };
  const value = ready(projectSelectedEvidence(passed, selection));
  assert.equal(value.safeMetadata.outcome, 'passed');
  assert.equal(value.checks.length, 1);
  assert.equal(value.selectedCheck, null);
  assert.equal(value.analysisScope, null);
  assert.equal(value.rawResponse, 'private raw response');
  assert.deepEqual(value.diagnostics, ['private attempt diagnostic']);
});

it('represents absent optional score, threshold, expected context, diagnostics, and raw response without placeholders', () => {
  const saved = detail();
  const noOptional = { ...saved, evidence: { ...saved.evidence!, output: '', diagnostics: [],
    assertions: [{ ...saved.evidence!.assertions[1]!, score: null, threshold: undefined, expected: '', diagnostics: [] }] } };
  const value = ready(projectSelectedEvidence(noOptional, selection));
  assert.equal(value.score, null);
  assert.equal(value.threshold, null);
  assert.equal(value.expected, null);
  assert.deepEqual(value.diagnostics, []);
  assert.deepEqual(value.selectedCheck?.diagnostics, []);
  assert.equal(value.rawResponse, null);
});

it('safe metadata excludes private actual, expected, diagnostics, trace, and raw response', () => {
  const value = ready(projectSelectedEvidence(detail(), selection));
  assert.deepEqual(value.safeMetadata, { suiteId: 'suite', runId: 'run', caseId: 'case', attempt: 2,
    outcome: 'failed', failedCheckCount: 2 });
  assert.doesNotMatch(JSON.stringify(value.safeMetadata), /private/);
});
