import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MODEL_WORKLOAD_CLASSES,
  SIBU_MODEL_ROLES,
  loadModelRecommendationCatalog,
  parseModelRecommendationCatalog,
  resolveModelRecommendation,
} from './model-routing.js';

function mutableCatalog(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(loadModelRecommendationCatalog())) as Record<string, unknown>;
}

function recommendations(catalog: Record<string, unknown>): Array<Record<string, unknown>> {
  return catalog.recommendations as Array<Record<string, unknown>>;
}

describe('model recommendation catalog', () => {
  it('contains an independently addressable Codex recommendation for every role and workload', () => {
    const catalog = loadModelRecommendationCatalog();

    assert.equal(catalog.schemaVersion, 1);
    assert.equal(catalog.catalogVersion, '2026-09-23.2');
    assert.equal(catalog.reviewedAt, '2026-09-23T00:00:00.000Z');
    assert.equal(catalog.recommendations.length, SIBU_MODEL_ROLES.length * MODEL_WORKLOAD_CLASSES.length);

    for (const role of SIBU_MODEL_ROLES) {
      for (const workloadClass of MODEL_WORKLOAD_CLASSES) {
        const recommendation = resolveModelRecommendation(catalog, { agentEnvironment: 'codex', role, workloadClass });
        assert.equal(recommendation.role, role);
        assert.equal(recommendation.workloadClass, workloadClass);
        const expectedRoute = {
          bounded: { model: 'gpt-6-luna', reasoningEffort: 'low' },
          demanding: { model: 'gpt-6-sol', reasoningEffort: 'medium' },
          'high-risk': { model: 'gpt-6-astra', reasoningEffort: 'high' },
        }[workloadClass];
        assert.equal(recommendation.model, expectedRoute.model);
        assert.equal(recommendation.reasoningEffort, expectedRoute.reasoningEffort);
        assert.match(recommendation.rationale.expectedFit, /expected fit/i);
        assert.ok(recommendation.rationale.relativeCost.length > 0);
        assert.ok(recommendation.rationale.relativeSpeed.length > 0);
        assert.match(recommendation.rationale.nonGuarantee, /not a guarantee/i);
      }
    }

    assert.equal(catalog.recommendations.filter((entry) => entry.model === 'gpt-6-astra').length, SIBU_MODEL_ROLES.length);
    assert.equal(catalog.recommendations.some((entry) => entry.workloadClass !== 'high-risk' && entry.model === 'gpt-6-astra'), false);
    assert.notEqual(
      resolveModelRecommendation(catalog, { agentEnvironment: 'codex', role: 'implementation-planner', workloadClass: 'bounded' }),
      resolveModelRecommendation(catalog, { agentEnvironment: 'codex', role: 'architecture-reviewer', workloadClass: 'bounded' })
    );
  });

  it('returns an immutable parsed contract', () => {
    const catalog = loadModelRecommendationCatalog();
    assert.equal(Object.isFrozen(catalog), true);
    assert.equal(Object.isFrozen(catalog.recommendations), true);
    assert.equal(Object.isFrozen(catalog.recommendations[0]), true);
    assert.equal(Object.isFrozen(catalog.recommendations[0].rationale), true);
  });

  it('allows optional official source links to be omitted', () => {
    const catalog = mutableCatalog();
    delete catalog.sourceUrls;
    assert.equal(parseModelRecommendationCatalog(catalog).sourceUrls, undefined);
  });

  it('rejects duplicate and incomplete tuple mappings', () => {
    const duplicate = mutableCatalog();
    recommendations(duplicate).push(structuredClone(recommendations(duplicate)[0]));
    assert.throws(() => parseModelRecommendationCatalog(duplicate), /duplicate route keys/);

    const incomplete = mutableCatalog();
    recommendations(incomplete).pop();
    assert.throws(() => parseModelRecommendationCatalog(incomplete), /mappings are incomplete/);
  });

  it('rejects unsupported identifiers, effort, and malformed metadata', () => {
    for (const [field, value, message] of [
      ['agentEnvironment', 'unknown', /agent environment/],
      ['role', 'unknown', /Sibu model role/],
      ['workloadClass', 'unknown', /workload class/],
      ['reasoningEffort', 'extreme', /reasoning effort/],
    ] as const) {
      const catalog = mutableCatalog();
      recommendations(catalog)[0][field] = value;
      assert.throws(() => parseModelRecommendationCatalog(catalog), message);
    }

    for (const catalogVersion of ['', '2026', '2026-02-30.1', '2026-09-23.0', 'release-1']) {
      const badMetadata = mutableCatalog();
      badMetadata.catalogVersion = catalogVersion;
      assert.throws(() => parseModelRecommendationCatalog(badMetadata), /metadata/, catalogVersion);
    }

    for (const reviewedAt of ['not-a-date', '2026', '09/23/2026', '2026-09-23T00:00:00Z']) {
      const badMetadata = mutableCatalog();
      badMetadata.reviewedAt = reviewedAt;
      assert.throws(() => parseModelRecommendationCatalog(badMetadata), /metadata/, reviewedAt);
    }
  });

  it('rejects malformed rationale and missing non-guarantee language', () => {
    const malformed = mutableCatalog();
    (recommendations(malformed)[0].rationale as Record<string, unknown>).relativeCost = '';
    assert.throws(() => parseModelRecommendationCatalog(malformed), /rationale fields/);

    const guaranteed = mutableCatalog();
    (recommendations(guaranteed)[0].rationale as Record<string, unknown>).nonGuarantee = 'Always succeeds.';
    assert.throws(() => parseModelRecommendationCatalog(guaranteed), /not a guarantee/);
  });

  it('rejects Astra recommendations for bounded and demanding work', () => {
    for (const workloadClass of ['bounded', 'demanding']) {
      const catalog = mutableCatalog();
      const entry = recommendations(catalog).find((recommendation) => recommendation.workloadClass === workloadClass);
      assert.ok(entry);
      entry.model = 'gpt-6-astra';
      entry.reasoningEffort = 'high';

      assert.throws(() => parseModelRecommendationCatalog(catalog), /Astra.*high-risk/, workloadClass);
    }
  });

  it('fails exact tuple resolution instead of applying a fallback', () => {
    const catalog = loadModelRecommendationCatalog();
    assert.throws(
      () => resolveModelRecommendation(catalog, { agentEnvironment: 'codex', role: 'github-exporter', workloadClass: 'unknown' as never }),
      /No model recommendation exists/
    );
  });
});
