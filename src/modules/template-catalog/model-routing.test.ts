import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MODEL_WORKLOAD_CLASSES,
  SIBU_MODEL_ROLES,
  loadModelRecommendationCatalog,
  parseModelRecommendationCatalog,
  resolveModelRecommendation,
  reviewRecommendationSince,
} from './model-routing.js';

function mutableCatalog(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(loadModelRecommendationCatalog())) as Record<string, unknown>;
}

function recommendations(catalog: Record<string, unknown>): Array<Record<string, unknown>> {
  return catalog.recommendations as Array<Record<string, unknown>>;
}

describe('model recommendation catalog', () => {
  it('orders numeric revisions across .9 to .10 when validating and reviewing releases', () => {
    const draft = mutableCatalog();
    const selected = recommendations(draft)[0];
    const before = { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale };
    selected.model = 'gpt-6-sol';
    selected.reasoningEffort = 'medium';
    draft.catalogVersion = '2026-09-23.10';
    draft.releases = Array.from({ length: 8 }, (_, index) => ({
      version: `2026-09-23.${index + 3}`,
      changes: index === 7 ? [{ agentEnvironment: selected.agentEnvironment, role: selected.role,
        workloadClass: selected.workloadClass, before,
        after: { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale },
        reason: 'Updated expected-cost guidance.' }] : [],
    }));
    const catalog = parseModelRecommendationCatalog(draft);
    const key = { agentEnvironment: 'codex' as const, role: 'implementation-planner' as const, workloadClass: 'bounded' as const };
    assert.equal(reviewRecommendationSince(catalog, key, '2026-09-23.9').status, 'changed');
    assert.equal(reviewRecommendationSince(catalog, key, '2026-09-23.10').status, 'unchanged');
    assert.equal(reviewRecommendationSince(catalog, key, '2026-09-23.11').status, 'unavailable');
    draft.historyBaseVersion = '2026-09-23.11';
    assert.throws(() => parseModelRecommendationCatalog(draft), /history is invalid/);
    draft.historyBaseVersion = '2026-09-23.2';
    (draft.releases as Array<{ version: string }>)[7].version = '2026-09-23.9';
    assert.throws(() => parseModelRecommendationCatalog(draft), /ordered/);
  });
  it('reviews only documented route-scoped changes across releases', () => {
    const draft = mutableCatalog();
    const entries = recommendations(draft);
    const selected = entries.find((entry) => entry.role === 'implementation-executor' && entry.workloadClass === 'bounded')!;
    const before = { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale };
    selected.model = 'gpt-6-sol'; selected.reasoningEffort = 'medium';
    const after = { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale };
    draft.catalogVersion = '2026-09-23.4';
    draft.releases = [
      { version: '2026-09-23.3', changes: [{ agentEnvironment: 'codex', role: selected.role,
        workloadClass: selected.workloadClass, before, after, reason: 'Similar expected fit with revised cost guidance.' }] },
      { version: '2026-09-23.4', changes: [] },
    ];
    const catalog = parseModelRecommendationCatalog(draft);
    assert.equal(reviewRecommendationSince(catalog, { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' }, '2026-09-23.2').status, 'changed');
    assert.equal(reviewRecommendationSince(catalog, { agentEnvironment: 'codex', role: 'implementation-planner', workloadClass: 'bounded' }, '2026-09-23.2').status, 'unchanged');
    assert.equal(reviewRecommendationSince(catalog, { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' }, '2026-09-23.3').status, 'unchanged');
    assert.equal(reviewRecommendationSince(catalog, { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' }, '2026-09-23.1').status, 'unavailable');
    (draft.releases as Array<{ version: string }>)[0].version = '2026-09-23.4';
    assert.throws(() => parseModelRecommendationCatalog(draft), /ordered|gap/);
    (draft.releases as Array<{ version: string }>)[0].version = '2026-09-23.3';
    (draft.releases as Array<{ version: string }>)[1].version = '2026-09-23.5';
    draft.catalogVersion = '2026-09-23.5';
    assert.throws(() => parseModelRecommendationCatalog(draft), /gap/);
    (draft.releases as Array<{ version: string }>)[1].version = '2026-09-23.4';
    draft.catalogVersion = '2026-09-23.4';
    ((draft.releases as Array<{ changes: Array<{ reason: string }> }>)[0].changes[0]).reason = ' ';
    assert.throws(() => parseModelRecommendationCatalog(draft), /note/);
  });
  it('does not treat unrecorded same-day or cross-day versions as reviewable history', () => {
    const draft = mutableCatalog();
    draft.catalogVersion = '2026-09-25.1';
    draft.releases = [
      { version: '2026-09-24.1', changes: [] },
      { version: '2026-09-25.1', changes: [] },
    ];
    const catalog = parseModelRecommendationCatalog(draft);
    const key = { agentEnvironment: 'codex' as const, role: 'implementation-executor' as const, workloadClass: 'bounded' as const };
    for (const version of ['2026-09-23.3', '2026-09-24.2']) {
      assert.equal(reviewRecommendationSince(catalog, key, version).status, 'unavailable');
    }
    for (const version of ['2026-09-23.2', '2026-09-24.1', '2026-09-25.1']) {
      assert.equal(reviewRecommendationSince(catalog, key, version).status, 'unchanged');
    }
  });
  it('rejects changed current guidance without a route-scoped release record', () => {
    const draft = mutableCatalog();
    recommendations(draft)[0].model = 'gpt-6-sol';
    assert.throws(() => parseModelRecommendationCatalog(draft), /does not match current guidance/);

    draft.catalogVersion = '2026-09-23.3';
    draft.releases = [{ version: '2026-09-23.3', changes: [] }];
    assert.throws(() => parseModelRecommendationCatalog(draft), /does not match current guidance/);
  });
  it('validates the history base and the first release against every route', () => {
    const missing = mutableCatalog();
    delete missing.historyBaseRecommendations;
    assert.throws(() => parseModelRecommendationCatalog(missing), /history base/);

    const incomplete = mutableCatalog();
    (incomplete.historyBaseRecommendations as unknown[]).pop();
    assert.throws(() => parseModelRecommendationCatalog(incomplete), /history base.*incomplete/);

    const duplicate = mutableCatalog();
    const base = duplicate.historyBaseRecommendations as unknown[];
    base[1] = structuredClone(base[0]);
    assert.throws(() => parseModelRecommendationCatalog(duplicate), /history base.*duplicate/);

    const malformed = mutableCatalog();
    (malformed.historyBaseRecommendations as Array<Record<string, unknown>>)[0].model = '';
    assert.throws(() => parseModelRecommendationCatalog(malformed), /model must be non-empty/);

    const rewrittenBase = mutableCatalog();
    (rewrittenBase.historyBaseRecommendations as Array<Record<string, unknown>>)[0].model = 'gpt-6-sol';
    recommendations(rewrittenBase)[0].model = 'gpt-6-sol';
    assert.throws(() => parseModelRecommendationCatalog(rewrittenBase), /history base must remain fixed/);

    const mismatchedFirstChange = mutableCatalog();
    const current = recommendations(mismatchedFirstChange)[0];
    const before = { model: 'gpt-6-sol', reasoningEffort: 'medium', rationale: current.rationale };
    const after = { model: 'gpt-6-sol', reasoningEffort: 'low', rationale: current.rationale };
    current.model = after.model;
    current.reasoningEffort = after.reasoningEffort;
    mismatchedFirstChange.catalogVersion = '2026-09-23.3';
    mismatchedFirstChange.releases = [{ version: '2026-09-23.3', changes: [{ agentEnvironment: current.agentEnvironment,
      role: current.role, workloadClass: current.workloadClass, before, after, reason: 'Revised task-fit guidance.' }] }];
    assert.throws(() => parseModelRecommendationCatalog(mismatchedFirstChange), /change chain is inconsistent/);
  });
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
    assert.equal(Object.isFrozen(catalog.historyBaseRecommendations), true);
    assert.equal(Object.isFrozen(catalog.historyBaseRecommendations[0]), true);
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
