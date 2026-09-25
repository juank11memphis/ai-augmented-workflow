import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runIdentity } from './run-identity.js';
import { logicalId } from './validation.js';
import { fixture } from './store-fixture.js';
import { project } from './test-project.js';
import { config } from './test-fixtures.js';
it('1000 generated IDs are unique and monotonically time ordered; seeded suffix is deterministic', () => {
  let previous = ''; const seen = new Set<string>();
  for (let n = 0; n < 1000; n++) { const id = runIdentity(n); assert.ok(logicalId(id)); assert.ok(id > previous); previous = id; seen.add(id); }
  assert.equal(seen.size, 1000); assert.equal(runIdentity(1, () => '0'.repeat(32)), '00000000000001-' + '0'.repeat(32));
});
it('retries an exclusively reserved collision without overwriting history', async () => {
  const p = await project(); try {
    let n = 0; const a = fixture(p.root, { generateId: () => n++ < 2 ? 'same' : 'other' });
    const first = await a.store.create(config); assert.equal(first.status, 'ok'); await a.store.finalize('suite', 'same', 'blocked');
    const second = await a.store.create(config); assert.equal(second.status === 'ok' && second.value.runId, 'other');
  } finally { await p.cleanup(); }
});
