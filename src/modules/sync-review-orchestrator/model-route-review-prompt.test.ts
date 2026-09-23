import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog, resolveModelRecommendation } from '../template-catalog/model-routing.js';
import { formatModelRouteReview } from './model-route-review-prompt.js';

it('renders the binding Saved, New recommendation, Why hierarchy without raw keys or versions', () => {
  const catalog = loadModelRecommendationCatalog();
  const recommendation = resolveModelRecommendation(catalog, { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' });
  const output = formatModelRouteReview({ route: { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded',
    model: 'saved-model', reasoningEffort: 'low', origin: 'user-selected', catalogVersionAtSelection: '2026-09-23.2',
    selectedAt: '2026-09-23T00:00:00.000Z' }, recommendation,
    reasons: ['Similar expected fit at lower expected cost.'], catalogVersion: '2026-09-23.3', stateBasis: 'a'.repeat(64) });
  assert.ok(output.indexOf('Model recommendation update') < output.indexOf('Implementation executor · bounded'));
  assert.ok(output.indexOf('Saved: saved-model / low') < output.indexOf('New recommendation:'));
  assert.ok(output.indexOf('New recommendation:') < output.indexOf('Why:'));
  assert.doesNotMatch(output, /2026-09-23|codex:/);
});
