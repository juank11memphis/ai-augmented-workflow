import assert from 'node:assert/strict';
import { it } from 'node:test';
import { boundedJson, manifest, attempt, logicalId } from './validation.js';
import { queued, evidence } from './test-fixtures.js';
import { LIMITS } from './limits.js';
it('validates versioned unknown evidence and rejects fabricated completion and raw fields', () => {
  assert.ok(manifest(queued())); assert.ok(attempt(evidence()));
  assert.equal(manifest({ ...queued(), state: 'completed', finishedAt: 100, outcome: 'passed' }), false);
  assert.equal(attempt({ ...evidence(), environment: 'secret' }), false);
  assert.equal(attempt({ ...evidence(), assertions: [] }), false);
  assert.equal(attempt({ ...evidence(), number: 0 }), false);
});
it('enforces exact bytes, multibyte strings, depth and logical IDs', () => {
  assert.ok(boundedJson('é', 4)); assert.equal(boundedJson('é', 3), false);
  assert.ok(boundedJson('x'.repeat(LIMITS.textBytes), LIMITS.textBytes + 2));
  assert.equal(boundedJson('x'.repeat(LIMITS.textBytes + 1), LIMITS.textBytes + 3), false);
  let deep: unknown = null; for (let n = 0; n < 14; n++) deep = [deep];
  assert.equal(boundedJson(deep, 1000), false);
  for (const id of ['../x', '/x', 'C:x', 'a/b', 'a\\b', '..', '', 'a'.repeat(81)]) assert.equal(logicalId(id), false);
});
it('rejects inconsistent counters, oversize collections and duplicate assertion/turn identities', () => {
  assert.equal(manifest({ ...queued(), calls: 10 }), false);
  assert.equal(manifest({ ...queued(), diagnostics: Array(21).fill('synthetic') }), false);
  const e = evidence(); assert.equal(attempt({ ...e, assertions: [e.assertions[0], e.assertions[0]] }), false);
  assert.equal(attempt({ ...e, turns: Array(101).fill({ id: 'turn', role: 'assistant', content: 'x' }) }), false);
});

it('rejects contradictory persisted Judge evidence on save and read boundaries', () => {
  const base = evidence();
  const grader = { ...base.assertions[0]!, id: 'quality', kind: 'grader' as const, score: 0.2,
    threshold: 0.8, judgeModel: 'fake-judge', outcome: 'failed' as const };
  assert.equal(attempt({ ...base, outcome: 'failed', assertions: [grader] }), true);
  assert.equal(attempt({ ...base, assertions: [{ ...grader, outcome: 'passed' }] }), false);
  assert.equal(attempt({ ...base, outcome: 'failed', assertions: [{ ...grader, threshold: 1.2 }] }), false);
});
