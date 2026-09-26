import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedArtifact } from './bounded-artifact.js';
import { attempt } from './validation.js';
import { evidence } from './test-fixtures.js';
import { LIMITS } from './limits.js';

test('bounded artifact validation preserves accepted raw content and rejects malformed or oversized evidence', () => {
  const raw = { ...evidence(), output: 'SYNTHETIC_SECRET_SENTINEL' };
  const accepted = boundedArtifact(raw, LIMITS.attemptBytes, attempt);
  assert.equal(accepted.status === 'ok' && accepted.value.output, raw.output);
  assert.deepEqual(boundedArtifact({ ...raw, output: 'x'.repeat(LIMITS.textBytes + 1) }, LIMITS.attemptBytes, attempt),
    { status: 'blocked', reason: 'limit-exceeded' });
  assert.deepEqual(boundedArtifact({ ...raw, outcome: 'unknown' }, LIMITS.attemptBytes, attempt),
    { status: 'blocked', reason: 'invalid-input' });
});
