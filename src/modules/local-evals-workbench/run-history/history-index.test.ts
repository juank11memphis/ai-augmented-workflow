import assert from 'node:assert/strict';
import { it } from 'node:test';
import { indexFrom, compact } from './history-index.js';
import { queued } from './test-fixtures.js';
import { LIMITS } from './limits.js';
it('seeded 200-entry index is unique, bounded, newest first, and contains no evidence', () => {
  const entries = Array.from({ length: 200 }, (_, n) => compact({ ...queued(), runId: `run-${n}`, createdAt: n, updatedAt: n }));
  const result = indexFrom([...entries, entries[0]!]); assert.equal(result.entries.length, LIMITS.history);
  assert.equal(result.entries[0]!.runId, 'run-199'); assert.ok(!JSON.stringify(result).includes('diagnostics'));
});
it('also bounds aggregate encoded index bytes rather than only slicing entry counts', () => {
  const entries = Array.from({ length: 50 }, (_, n) => compact({ ...queued(), runId: `run-${n}`, testedModel: 'é'.repeat(4096), judgeModel: 'é'.repeat(4096) }));
  const index = indexFrom(entries); assert.ok(index.entries.length < LIMITS.history);
  assert.ok(Buffer.byteLength(JSON.stringify(index)) <= LIMITS.indexBytes);
});
