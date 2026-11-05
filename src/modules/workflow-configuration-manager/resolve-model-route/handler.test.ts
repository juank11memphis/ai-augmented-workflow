import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog, resolveModelRecommendation } from '../../template-catalog/model-routing.js';
import { handleResolveModelRoute } from './handler.js';
import type { ResolveModelRoutePorts } from './ports.js';
import type { ModelWorkloadClass } from '../../../shared/types.js';

const key = { type: 'models:resolve', agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' } as const;
const catalog = loadModelRecommendationCatalog();
const recommendation = resolveModelRecommendation(catalog, key);
const saved = { ...key, model: 'custom-model', reasoningEffort: 'high' as const, origin: 'user-selected' as const, catalogVersionAtSelection: catalog.catalogVersion, selectedAt: new Date().toISOString() };
const ports: ResolveModelRoutePorts = {
  stateReader: { read: () => ({ status: 'available', snapshot: { routes: [], stateBasis: 'basis' } }) },
  catalogReader: { resolve: () => ({ catalogVersion: catalog.catalogVersion, recommendation }) },
};

for (const workloadClass of ['bounded', 'demanding', 'high-risk'] as const satisfies readonly ModelWorkloadClass[]) {
  it(`resolves every epic-story-planner outcome independently for ${workloadClass}`, () => {
    const plannerKey = { type: 'models:resolve', agentEnvironment: 'codex', role: 'epic-story-planner', workloadClass } as const;
    const current = resolveModelRecommendation(catalog, plannerKey);
    const plannerPorts: ResolveModelRoutePorts = {
      stateReader: { read: () => ({ status: 'available', snapshot: { routes: [], stateBasis: 'planner-basis' } }) },
      catalogReader: { resolve: () => ({ catalogVersion: catalog.catalogVersion, recommendation: current }) },
    };
    const missing = handleResolveModelRoute(plannerKey, plannerPorts);
    assert.equal(missing.status, 'missing');
    if (missing.status === 'missing') {
      assert.equal(missing.catalog.recommendation.role, plannerKey.role);
      assert.equal(missing.catalog.recommendation.workloadClass, workloadClass);
      assert.equal(missing.catalog.recommendation.model, current.model);
      assert.equal(missing.catalog.recommendation.reasoningEffort, current.reasoningEffort);
      assert.equal(missing.stateBasis, 'planner-basis');
    }

    const configuredRoute = { agentEnvironment: plannerKey.agentEnvironment, role: plannerKey.role, workloadClass,
      model: 'alternate-model', reasoningEffort: 'xhigh' as const, origin: 'user-selected' as const,
      catalogVersionAtSelection: catalog.catalogVersion, selectedAt: '2026-11-05T00:00:00.000Z' };
    const withRoute: ResolveModelRoutePorts = { ...plannerPorts, stateReader: { read: () => ({ status: 'available', snapshot: {
      routes: [configuredRoute], stateBasis: 'planner-basis' } }) } };
    const configured = handleResolveModelRoute(plannerKey, withRoute);
    assert.equal(configured.status, 'configured');
    if (configured.status === 'configured') {
      assert.deepEqual(configured.route, configuredRoute);
      assert.equal(configured.route.role, plannerKey.role);
      assert.equal(configured.route.workloadClass, workloadClass);
      assert.equal(configured.route.model, 'alternate-model');
      assert.equal(configured.route.reasoningEffort, 'xhigh');
      assert.equal(configured.origin, 'user-selected');
    }
    const recommendedRoute = { ...configuredRoute, model: current.model, reasoningEffort: current.reasoningEffort,
      origin: 'recommended' as const };
    const recommended = handleResolveModelRoute(plannerKey, { ...plannerPorts, stateReader: { read: () => ({ status: 'available',
      snapshot: { routes: [recommendedRoute], stateBasis: 'planner-basis' } }) } });
    assert.equal(recommended.status, 'configured');
    if (recommended.status === 'configured') {
      assert.deepEqual(recommended.route, recommendedRoute);
      assert.equal(recommended.origin, 'recommended');
      assert.equal(recommended.guidanceCurrent, true);
    }
    const unavailable = handleResolveModelRoute(plannerKey, { ...plannerPorts, stateReader: { read: () => ({ status: 'unavailable' }) } });
    assert.equal(unavailable.status, 'workflow-unavailable');
    if (unavailable.status === 'workflow-unavailable') assert.match(unavailable.recovery, /sibu init/);
    const unsupported = handleResolveModelRoute({ ...plannerKey, agentEnvironment: 'claude' }, plannerPorts);
    assert.equal(unsupported.status, 'unsupported');
    if (unsupported.status === 'unsupported') assert.match(unsupported.recovery, /supported agent/);
    const withoutCatalog: ResolveModelRoutePorts = { ...plannerPorts, catalogReader: { resolve: () => { throw new Error('catalog unavailable'); } } };
    const recommendationUnavailable = handleResolveModelRoute(plannerKey, withoutCatalog);
    assert.equal(recommendationUnavailable.status, 'recommendation-unavailable');
    if (recommendationUnavailable.status === 'recommendation-unavailable') assert.match(recommendationUnavailable.recovery, /catalog/);
    const configuredWithoutCatalog = handleResolveModelRoute(plannerKey, { ...withoutCatalog, stateReader: withRoute.stateReader });
    assert.equal(configuredWithoutCatalog.status, 'configured');
    if (configuredWithoutCatalog.status === 'configured') {
      assert.deepEqual(configuredWithoutCatalog.route, configuredRoute);
      assert.equal(configuredWithoutCatalog.catalog, null);
      assert.equal(configuredWithoutCatalog.guidanceCurrent, false);
      assert.equal(configuredWithoutCatalog.origin, 'unknown');
    }
  });
}

it('resolves missing without mutation and includes current guidance', () => {
  const result = handleResolveModelRoute(key, ports);
  assert.equal(result.status, 'missing');
  if (result.status === 'missing') assert.equal(result.catalog.recommendation.model, 'gpt-6-luna');
});
it('preserves exact configured route and derives current origin', () => {
  const result = handleResolveModelRoute(key, { ...ports, stateReader: { read: () => ({ status: 'available', snapshot: { routes: [saved], stateBasis: 'basis' } }) } });
  assert.equal(result.status, 'configured');
  if (result.status === 'configured') { assert.equal(result.route.model, 'custom-model'); assert.equal(result.origin, 'user-selected'); }
});
it('reports unsupported, unavailable state, and malformed catalog without fallback', () => {
  assert.equal(handleResolveModelRoute({ ...key, role: 'outsider' }, ports).status, 'unsupported');
  assert.equal(handleResolveModelRoute(key, { ...ports, stateReader: { read: () => ({ status: 'unavailable' }) } }).status, 'workflow-unavailable');
  const broken = { ...ports, catalogReader: { resolve: () => { throw new Error('broken'); } } };
  assert.equal(handleResolveModelRoute(key, broken).status, 'recommendation-unavailable');
  const readable = handleResolveModelRoute(key, { ...broken, stateReader: { read: () => ({ status: 'available', snapshot: { routes: [saved], stateBasis: 'basis' } }) } });
  assert.equal(readable.status, 'configured');
  if (readable.status === 'configured') assert.equal(readable.catalog, null);
});
