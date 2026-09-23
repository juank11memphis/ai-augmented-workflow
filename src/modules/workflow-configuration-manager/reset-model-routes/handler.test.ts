import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog } from '../../template-catalog/model-routing.js';
import { handleResetModelRoutes } from './handler.js';

const catalog = loadModelRecommendationCatalog();
const initialBasis = 'a'.repeat(64);
const key = catalog.recommendations[0];

function fixture(failAt = -1) {
  let writes = 0;
  let basis = initialBasis;
  const saved: string[] = [];
  const ports = {
    stateReader: { read: () => ({ status: 'available' as const, snapshot: { routes: [], stateBasis: basis } }) },
    catalogReader: { list: () => catalog },
    stateWriter: { upsert: (route: { model: string; origin: string }, expected: string) => {
      assert.equal(expected, basis);
      writes++;
      if (writes === failAt) return 'failed' as const;
      assert.equal(route.origin, 'recommended');
      saved.push(route.model);
      basis = String.fromCharCode(97 + writes).repeat(64);
      return 'saved' as const;
    } },
    now: () => 'now',
  };
  return { ports, saved, get writes() { return writes; } };
}

it('rejects unconfirmed bulk intent, stale basis and unsupported key without writes', () => {
  const test = fixture();
  const command = { type: 'models:reset' as const, scope: 'all' as const, confirmed: false, catalogVersion: catalog.catalogVersion, stateBasis: initialBasis };
  assert.equal(handleResetModelRoutes(command, test.ports).status, 'cancelled');
  assert.equal(handleResetModelRoutes({ ...command, confirmed: true, stateBasis: 'b'.repeat(64) }, test.ports).status, 'conflict');
  assert.equal(handleResetModelRoutes({ ...command, scope: 'one', key: { ...key, role: 'unknown' as never }, confirmed: true }, test.ports).status, 'blocked');
  assert.equal(test.writes, 0);
});

it('resets one key, derives recommended origin, and stops honestly after a partial all-route failure', () => {
  const single = fixture();
  assert.equal(handleResetModelRoutes({ type: 'models:reset', scope: 'one', key, confirmed: true, catalogVersion: catalog.catalogVersion, stateBasis: initialBasis }, single.ports).status, 'completed');
  assert.equal(single.writes, 1);
  const partial = fixture(3);
  const result = handleResetModelRoutes({ type: 'models:reset', scope: 'all', confirmed: true, catalogVersion: catalog.catalogVersion, stateBasis: initialBasis }, partial.ports);
  assert.equal(result.status, 'failed');
  assert.equal(result.completed.length, 2);
  if (result.status === 'failed') assert.equal(result.notAttempted.length, 15);
  assert.equal(partial.writes, 3);
  assert.equal(partial.saved.length, 2);
});
