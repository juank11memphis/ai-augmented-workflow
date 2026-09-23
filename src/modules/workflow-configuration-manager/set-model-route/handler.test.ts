import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog, resolveModelRecommendation } from '../../template-catalog/model-routing.js';
import { handleSetModelRoute } from './handler.js';
import { validateModelRouteSelection } from '../model-route-selection.js';
import type { SetModelRoutePorts } from './ports.js';

const catalog = loadModelRecommendationCatalog();
const key = { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' } as const;
const basis = 'a'.repeat(64);
const command = { type: 'models:set' as const, ...key, model: 'gpt-6-luna', reasoningEffort: 'low', catalogVersion: catalog.catalogVersion, stateBasis: basis };
const saved: { routes: unknown[] } = { routes: [] };
const ports: SetModelRoutePorts = {
  stateReader: { read: () => ({ status: 'available', snapshot: { routes: [], stateBasis: basis } }) },
  catalogReader: { resolve: (routeKey) => ({ catalogVersion: catalog.catalogVersion, recommendation: resolveModelRecommendation(catalog, routeKey) }) },
  stateWriter: { upsert: (route) => { saved.routes.push(route); return 'saved'; } },
  now: () => '2026-09-23T00:00:00.000Z',
};

it('derives recommended only when both model and effort match', () => {
  assert.equal(handleSetModelRoute(command, ports).status, 'saved');
  assert.equal(handleSetModelRoute({ ...command, reasoningEffort: 'high' }, ports).status, 'saved');
  assert.deepEqual(saved.routes.map((route) => (route as { origin: string }).origin), ['recommended', 'user-selected']);
});
it('allows catalog-external and non-high-risk Astra as user selected', () => {
  for (const model of ['other-provider-model', 'gpt-6-astra']) {
    const result = handleSetModelRoute({ ...command, model }, ports);
    assert.equal(result.status, 'saved');
    if (result.status === 'saved') assert.equal(result.route.origin, 'user-selected');
  }
});
it('blocks invalid input and unavailable state, conflicts on stale basis or catalog', () => {
  assert.equal(handleSetModelRoute({ ...command, model: '' }, ports).status, 'blocked');
  assert.equal(handleSetModelRoute({ ...command, reasoningEffort: 'impossible' }, ports).status, 'blocked');
  assert.equal(handleSetModelRoute({ ...command, stateBasis: 'b'.repeat(64) }, ports).status, 'conflict');
  assert.equal(handleSetModelRoute({ ...command, catalogVersion: 'old' }, ports).status, 'conflict');
  assert.equal(handleSetModelRoute(command, { ...ports, stateReader: { read: () => ({ status: 'unavailable' }) } }).status, 'blocked');
});
it('applies the same pure selection rules to both save and sync replacement inputs', () => {
  const current = { catalogVersion: catalog.catalogVersion, recommendation: resolveModelRecommendation(catalog, key), stateBasis: basis };
  for (const changes of [
    { model: '' }, { model: ' invalid ' }, { model: 'a'.repeat(129) }, { reasoningEffort: 'impossible' },
    { role: 'unknown' }, { catalogVersion: '' }, { stateBasis: 'invalid' },
  ]) {
    const candidate = { ...command, ...changes };
    assert.equal(validateModelRouteSelection(candidate, current, ports.now()).status, 'blocked');
    assert.equal(handleSetModelRoute(candidate, ports).status, 'blocked');
  }
  for (const changes of [{ catalogVersion: 'old' }, { stateBasis: 'b'.repeat(64) }]) {
    const candidate = { ...command, ...changes };
    assert.equal(validateModelRouteSelection(candidate, current, ports.now()).status, 'conflict');
    assert.equal(handleSetModelRoute(candidate, ports).status, 'conflict');
  }
  const valid = validateModelRouteSelection(command, current, ports.now());
  assert.equal(valid.status, 'valid');
  if (valid.status === 'valid') assert.equal(valid.route.origin, 'recommended');
});
it('reports guarded writer conflict and failure honestly', () => {
  for (const outcome of ['conflict', 'failed'] as const) {
    assert.equal(handleSetModelRoute(command, { ...ports, stateWriter: { upsert: () => outcome } }).status, outcome);
  }
  assert.equal(handleSetModelRoute(command, { ...ports, stateWriter: { upsert: () => { throw new Error('disk'); } } }).status, 'failed');
});
