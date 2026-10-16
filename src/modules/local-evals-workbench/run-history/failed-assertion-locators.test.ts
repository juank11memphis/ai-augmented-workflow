import assert from 'node:assert/strict';
import test from 'node:test';
import type { Attempt, ArtifactReaderPort, Manifest } from './contracts.js';
import { failedAssertionLocators } from './failed-assertion-locators.js';

const rawSentinel = 'private-raw-transcript';

function failedAttempt(caseId: string, number: number, count: number): Attempt {
  return {
    version: 1, suiteId: 'suite', runId: 'run', caseId, number, outcome: 'failed',
    durationMs: 1, calls: null, cost: null, output: rawSentinel, truncated: false,
    diagnostics: [rawSentinel], turns: [{ id: 'turn', role: 'assistant', content: rawSentinel }], tools: [],
    assertions: Array.from({ length: count }, (_, index) => ({
      id: `${caseId}-${number}-${index}`, kind: 'assertion' as const, outcome: 'failed' as const,
      score: null, expected: rawSentinel, actual: rawSentinel, diagnostics: [rawSentinel], turnIds: [], toolIds: [],
    })),
  };
}

const manifest: Manifest = {
  version: 1, suiteId: 'suite', runId: 'run', scope: 'all', caseIds: ['first', 'second', 'third'],
  testedModel: 'tested', judgeModel: null, state: 'completed', outcome: 'failed',
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2,
  calls: null, cost: null, diagnostics: [rawSentinel], cases: [
    { caseId: 'first', state: 'completed', attempts: [
      { number: 1, outcome: 'failed', durationMs: 1, calls: null, cost: null },
      { number: 2, outcome: 'failed', durationMs: 1, calls: null, cost: null },
    ] },
    { caseId: 'second', state: 'completed', attempts: [
      { number: 1, outcome: 'passed', durationMs: 1, calls: null, cost: null },
      { number: 2, outcome: 'failed', durationMs: 1, calls: null, cost: null },
      { number: 3, outcome: 'failed', durationMs: 1, calls: null, cost: null },
    ] },
    { caseId: 'third', state: 'completed', attempts: [
      { number: 1, outcome: 'failed', durationMs: 1, calls: null, cost: null },
    ] },
  ],
};

const evidence = [failedAttempt('first', 1, 20), failedAttempt('first', 2, 18),
  failedAttempt('second', 2, 5), failedAttempt('third', 1, 3)];

function readerFor(attempts: readonly Attempt[]): Pick<ArtifactReaderPort, 'get'> {
  return { get: async (_suiteId, _runId, selection) => {
    const attempt = attempts.find(item => item.caseId === selection?.caseId && item.number === selection.attempt);
    return attempt
      ? { status: 'ok', value: { summary: manifest, evidenceStatus: 'available', evidence: attempt } }
      : { status: 'blocked', reason: 'corrupt' };
  } };
}

test('ordered locator pages reconstruct every failed assertion across cases and attempts', async () => {
  const reader = readerFor(evidence);
  const expected = evidence.flatMap(item => item.assertions.map(assertion => `${item.caseId}/${item.number}/${assertion.id}`));
  const actual: string[] = [];
  const offsets: number[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    offsets.push(offset);
    const page = await failedAssertionLocators(manifest, reader, offset);
    assert.doesNotMatch(JSON.stringify(page), /private-raw-transcript|output|turns|tools/);
    for (const item of page.cases) {
      for (const attempt of item.attempts) {
        for (const id of attempt.failedAssertionIds ?? []) actual.push(`${item.caseId}/${attempt.number}/${id}`);
      }
    }
    offset = page.nextLocatorOffset;
  }
  assert.deepEqual(offsets, [0, 32]);
  assert.equal(actual.length, 46);
  assert.equal(new Set(actual).size, actual.length);
  assert.deepEqual(actual, expected);
});

test('failed evidence gaps are unavailable, not invented or confused with page truncation', async () => {
  const reader = readerFor(evidence);
  const first = await failedAssertionLocators(manifest, reader);
  assert.equal(first.cases[0]?.attempts[1]?.locatorStatus, 'truncated');
  assert.deepEqual(first.cases[1]?.attempts[0], { number: 1, outcome: 'passed' });
  const second = await failedAssertionLocators(manifest, reader, first.nextLocatorOffset!);
  assert.deepEqual(second.cases[1]?.attempts[2], {
    number: 3, outcome: 'failed', failedAssertionIds: [], locatorStatus: 'unavailable',
  });
  assert.equal(second.nextLocatorOffset, null);

  const invalid = readerFor([{ ...failedAttempt('first', 1, 1), assertions: [
    { ...failedAttempt('first', 1, 1).assertions[0]!, id: '../invalid' },
  ] }]);
  const invalidPage = await failedAssertionLocators(manifest, invalid);
  assert.deepEqual(invalidPage.cases[0]?.attempts[0], {
    number: 1, outcome: 'failed', failedAssertionIds: [], locatorStatus: 'unavailable',
  });
  assert.doesNotMatch(JSON.stringify(invalidPage), /\.\.\/invalid|private-raw-transcript/);
});
