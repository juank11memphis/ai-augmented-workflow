import assert from 'node:assert/strict';
import { it } from 'node:test';
import { transition, appendAttempt } from './lifecycle.js';
import { queued, evidence } from './test-fixtures.js';
it('rejects fabricated completion, duplicate attempts and terminal mutation; partial never passes', () => {
  assert.equal(transition(queued(), 'completed', 101).status, 'blocked');
  const started = transition(queued(), 'running', 101); assert.equal(started.status, 'ok'); if (started.status !== 'ok') return;
  const progress = appendAttempt(started.value, evidence(), 102); assert.equal(progress.status, 'ok'); if (progress.status !== 'ok') return;
  assert.equal(appendAttempt(progress.value, evidence(), 103).status, 'blocked');
  const done = transition(progress.value, 'completed', 103); assert.equal(done.status, 'ok'); if (done.status !== 'ok') return;
  assert.equal(done.value.outcome, 'passed'); assert.equal(transition(done.value, 'running', 104).status, 'blocked');
  const partial = transition(progress.value, 'partial', 104); assert.equal(partial.status === 'ok' && partial.value.outcome, 'incomplete');
});
it('seed 0x17: 100 generated repeated runs preserve counter and terminal invariants', async () => {
  const { manifest } = await import('./validation.js'); let seed = 0x17;
  for (let sequence = 0; sequence < 100; sequence++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const repeats = seed % 10 + 1; let current = { ...queued(), repeats };
    const start = transition(current, 'running', 101); if (start.status !== 'ok') return assert.fail(); current = start.value;
    for (let n = 1; n <= repeats; n++) {
      const attempt = { ...evidence(), number: n, outcome: n === repeats && sequence % 2 ? 'failed' as const : 'passed' as const };
      const next = appendAttempt(current, attempt, 101 + n); assert.equal(next.status, 'ok'); if (next.status !== 'ok') return;
      current = next.value; assert.ok(manifest(current)); assert.equal(current.calls, n);
      assert.equal(transition(current, 'completed', 200).status, n === repeats ? 'ok' : 'blocked');
    }
    const done = transition(current, 'completed', 200); assert.ok(done.status === 'ok');
    if (done.status === 'ok') { assert.equal(done.value.outcome, sequence % 2 ? 'failed' : 'passed'); assert.equal(transition(done.value, 'running', 201).status, 'blocked'); }
  }
});
