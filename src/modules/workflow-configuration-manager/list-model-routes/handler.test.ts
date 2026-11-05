import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog } from '../../template-catalog/model-routing.js';
import { handleListModelRoutes } from './handler.js';

const catalog = loadModelRecommendationCatalog();
const stateBasis = 'a'.repeat(64);
const selected = { ...catalog.recommendations[0], model: 'external-model', reasoningEffort: 'high' as const,
  origin: 'recommended' as const, catalogVersionAtSelection: 'old', selectedAt: 'now' };

it('lists every route in stable role/workload order, deriving user selection independently of origin', () => {
  const result = handleListModelRoutes({ type: 'models:list' }, {
    stateReader: { read: () => ({ status: 'available', snapshot: { routes: [selected], stateBasis } }) },
    catalogReader: { list: () => catalog },
  });
  assert.equal(result.status, 'listed');
  if (result.status !== 'listed') return;
  assert.equal(result.routes.length, 15);
  assert.deepEqual(result.routes.slice(0, 3).map((item) => item.recommendation.workloadClass), ['bounded', 'demanding', 'high-risk']);
  assert.equal(result.routes[0].status, 'user-selected');
  assert.equal(result.routes[0].reviewNeeded, true);
  assert.equal(result.routes[1].status, 'not-configured');
});

it('fails closed for unavailable state or malformed catalog without writing', () => {
  assert.equal(handleListModelRoutes({ type: 'models:list' }, {
    stateReader: { read: () => ({ status: 'unavailable' }) }, catalogReader: { list: () => catalog },
  }).status, 'workflow-unavailable');
  const malformed = handleListModelRoutes({ type: 'models:list' }, {
    stateReader: { read: () => ({ status: 'available', snapshot: { routes: [selected], stateBasis } }) },
    catalogReader: { list: () => ({ ...catalog, recommendations: [] }) },
  });
  assert.equal(malformed.status, 'recommendation-unavailable');
  if (malformed.status === 'recommendation-unavailable') assert.deepEqual(malformed.savedRoutes, [selected]);
  const unavailable = handleListModelRoutes({ type: 'models:list' }, {
    stateReader: { read: () => ({ status: 'available', snapshot: { routes: [selected], stateBasis } }) },
    catalogReader: { list: () => { throw new Error('Catalog unavailable'); } },
  });
  assert.equal(unavailable.status, 'recommendation-unavailable');
  if (unavailable.status === 'recommendation-unavailable') assert.deepEqual(unavailable.savedRoutes, [selected]);
});
