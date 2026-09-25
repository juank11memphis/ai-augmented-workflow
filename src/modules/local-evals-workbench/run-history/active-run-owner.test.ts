import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ProcessRunOwner, serialized } from './active-run-owner.js';
it('keeps live owner identity stable across readers and treats PID reuse conservatively', async () => {
  const owner = new ProcessRunOwner(); assert.equal(await owner.check(new ProcessRunOwner().identity), 'live');
  assert.equal(await owner.check({ ...owner.identity, token: 'different' }), 'unknown');
});
it('serializes shared project updates even when one operation fails', async () => {
  const seen: number[] = [];
  await Promise.allSettled([serialized('/synthetic', async () => { seen.push(1); throw new Error(); }), serialized('/synthetic', async () => { seen.push(2); })]);
  assert.deepEqual(seen, [1, 2]);
});
