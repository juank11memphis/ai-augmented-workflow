import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog, resolveModelRecommendation } from '../../template-catalog/model-routing.js';
import { handleResolveModelRoute } from './handler.js';
import type { ResolveModelRoutePorts } from './ports.js';

const key = { type: 'models:resolve', agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' } as const;
const catalog = loadModelRecommendationCatalog();
const recommendation = resolveModelRecommendation(catalog, key);
const saved = { ...key, model: 'custom-model', reasoningEffort: 'high' as const, origin: 'user-selected' as const, catalogVersionAtSelection: catalog.catalogVersion, selectedAt: new Date().toISOString() };
const ports: ResolveModelRoutePorts = {
  stateReader: { read: () => ({ status: 'available', snapshot: { routes: [], stateBasis: 'basis' } }) },
  catalogReader: { resolve: () => ({ catalogVersion: catalog.catalogVersion, recommendation }) },
};

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
