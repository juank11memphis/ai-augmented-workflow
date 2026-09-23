import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog, parseModelRecommendationCatalog } from '../template-catalog/model-routing.js';
import type { ModelRoute, ModelRouteReview } from '../../shared/types.js';
import { handleModelRouteReview } from './model-route-review-handler.js';
import type { ModelRouteReviewPorts } from './model-route-review-ports.js';

const route: ModelRoute = { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded',
  model: 'gpt-6-luna', reasoningEffort: 'low', origin: 'user-selected', catalogVersionAtSelection: '2026-09-23.2',
  selectedAt: '2026-09-23T00:00:00.000Z' };
const unrelatedRoute: ModelRoute = { ...route, workloadClass: 'demanding', model: 'external-model',
  reasoningEffort: 'high', selectedAt: '2026-09-23T00:10:00.000Z' };

function fixture(options: { catalogRevision?: number; savedVersion?: string; reviews?: ModelRouteReview[];
  rationaleOnly?: boolean } = {}) {
  const catalogRevision = options.catalogRevision ?? 3;
  const draft = structuredClone(loadModelRecommendationCatalog()) as unknown as Record<string, unknown>;
  const recommendations = draft.recommendations as Array<Record<string, unknown>>;
  const selected = recommendations.find((entry) => entry.role === route.role && entry.workloadClass === route.workloadClass)!;
  const before = { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale };
  if (options.rationaleOnly) {
    selected.rationale = { ...(selected.rationale as object), expectedFit: 'Updated expected-fit guidance for bounded tasks.' };
  } else {
    selected.model = 'gpt-6-sol'; selected.reasoningEffort = 'medium';
  }
  draft.catalogVersion = `2026-09-23.${catalogRevision}`;
  draft.releases = Array.from({ length: catalogRevision - 2 }, (_, index) => ({
    version: `2026-09-23.${index + 3}`,
    changes: index + 3 === catalogRevision ? [{ agentEnvironment: route.agentEnvironment, role: route.role,
      workloadClass: route.workloadClass, before,
      after: { model: selected.model, reasoningEffort: selected.reasoningEffort, rationale: selected.rationale },
      reason: options.rationaleOnly ? 'Revised expected-fit research for bounded tasks.'
        : 'Similar expected fit at lower expected cost.' }] : [],
  }));
  const catalog = parseModelRecommendationCatalog(draft);
  let routes = [{ ...route, catalogVersionAtSelection: options.savedVersion ?? route.catalogVersionAtSelection }, unrelatedRoute];
  let reviews: ModelRouteReview[] = options.reviews ?? [];
  let basis = 'a'.repeat(64);
  let writes = 0;
  let fail = false;
  const ports: ModelRouteReviewPorts = {
    catalogReader: { read: () => catalog },
    stateReader: { read: () => ({ status: 'available', snapshot: { routes, reviews, stateBasis: basis } }) },
    stateWriter: { retain: (review, expected) => {
      if (fail) return 'failed';
      if (expected !== basis) return 'conflict';
      reviews = [review]; writes++; basis = 'b'.repeat(64); return 'saved';
    } },
    routeWriter: { replace: (replacement, expected) => {
      if (fail) return 'failed';
      if (expected !== basis) return 'conflict';
      routes = routes.map((saved) => saved.role === replacement.role && saved.workloadClass === replacement.workloadClass
        ? replacement : saved); writes++; basis = 'b'.repeat(64);
      return 'saved';
    } },
    now: () => '2026-09-23T01:00:00.000Z',
  };
  return { ports, get writes() { return writes; }, get routes() { return routes; }, get reviews() { return reviews; },
    set fail(value: boolean) { fail = value; },
    set basis(value: string) { basis = value; } };
}

it('previews the exact changed route and leaves missing and unrelated routes alone', () => {
  const test = fixture();
  const preview = handleModelRouteReview({ type: 'preview' }, test.ports);
  assert.equal(preview.status, 'preview');
  if (preview.status !== 'preview') return;
  assert.equal(preview.notices.length, 1);
  assert.deepEqual(preview.notices[0].route, route);
  assert.deepEqual(test.routes[1], unrelatedRoute);
  assert.equal(test.writes, 0);
});

it('uses a retained .10 marker instead of an older .9 route selection', () => {
  const selectedAt = route.selectedAt;
  const test = fixture({ catalogRevision: 10, savedVersion: '2026-09-23.9', reviews: [{
    agentEnvironment: route.agentEnvironment, role: route.role, workloadClass: route.workloadClass,
    routeSelectedAt: selectedAt, catalogVersion: '2026-09-23.10',
  }] });
  const preview = handleModelRouteReview({ type: 'preview' }, test.ports);
  assert.equal(preview.status, 'preview');
  if (preview.status !== 'preview') return;
  assert.equal(preview.reviewUnavailable, false);
  assert.equal(preview.notices.length, 0);
  assert.equal(test.writes, 0);
});

for (const choice of ['retain', 'replace', 'later'] as const) {
  it(`${choice} only mutates the intended review state`, () => {
    const test = fixture();
    const before = structuredClone(test.routes);
    const preview = handleModelRouteReview({ type: 'preview' }, test.ports);
    if (preview.status !== 'preview') throw new Error('Missing preview');
    const notice = preview.notices[0];
    const result = handleModelRouteReview({ type: 'decide', choice, route: notice.route,
      catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, test.ports);
    assert.equal(result.status, choice === 'retain' ? 'retained' : choice === 'replace' ? 'replaced' : 'later');
    assert.equal(test.writes, choice === 'later' ? 0 : 1);
    assert.equal(test.routes[0].model, choice === 'replace' ? 'gpt-6-sol' : route.model);
    assert.deepEqual(test.routes[1], before[1]);
    if (choice !== 'replace') assert.deepEqual(test.routes, before);
    assert.equal(test.reviews.length, choice === 'retain' ? 1 : 0);
    if (choice === 'replace') {
      assert.equal(test.routes[0].origin, 'recommended');
      assert.equal(test.routes[0].selectedAt, '2026-09-23T01:00:00.000Z');
    }
    const again = handleModelRouteReview({ type: 'preview' }, test.ports);
    assert.equal(again.status, 'preview');
    if (again.status === 'preview') assert.equal(again.notices.length, choice === 'later' ? 1 : 0);
  });
}

it('notices rationale-only guidance and preserves every route on retain or review later', () => {
  for (const choice of ['retain', 'later'] as const) {
    const test = fixture({ rationaleOnly: true });
    const before = structuredClone(test.routes);
    const preview = handleModelRouteReview({ type: 'preview' }, test.ports);
    if (preview.status !== 'preview') throw new Error('Missing preview');
    assert.equal(preview.notices.length, 1);
    const notice = preview.notices[0];
    assert.deepEqual(notice.reasons, ['Revised expected-fit research for bounded tasks.']);
    assert.equal(notice.recommendation.model, route.model);
    assert.equal(notice.recommendation.reasoningEffort, route.reasoningEffort);
    const result = handleModelRouteReview({ type: 'decide', choice, route: notice.route,
      catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, test.ports);
    assert.equal(result.status, choice === 'retain' ? 'retained' : 'later');
    assert.deepEqual(test.routes, before);
    assert.equal(test.reviews.length, choice === 'retain' ? 1 : 0);
  }
});

it('rejects stale basis and reports failed persistence without claiming success', () => {
  const test = fixture();
  const before = structuredClone(test.routes);
  const preview = handleModelRouteReview({ type: 'preview' }, test.ports);
  if (preview.status !== 'preview') throw new Error('Missing preview');
  const notice = preview.notices[0];
  test.basis = 'c'.repeat(64);
  assert.equal(handleModelRouteReview({ type: 'decide', choice: 'replace', route: notice.route,
    catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, test.ports).status, 'conflict');
  test.basis = notice.stateBasis;
  test.fail = true;
  assert.equal(handleModelRouteReview({ type: 'decide', choice: 'retain', route: notice.route,
    catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, test.ports).status, 'failed');
  assert.deepEqual(test.routes, before);
  assert.equal(test.writes, 0);
  assert.deepEqual(test.reviews, []);
  assert.equal(handleModelRouteReview({ type: 'decide', choice: 'replace', route: notice.route,
    catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, test.ports).status, 'failed');
  assert.deepEqual(test.routes, before);
  assert.equal(test.writes, 0);
});

it('does not bypass route-selection validation when replacing during sync', () => {
  const test = fixture();
  const validCatalog = test.ports.catalogReader.read();
  const invalidCatalog = { ...validCatalog, recommendations: validCatalog.recommendations.map((recommendation) =>
    recommendation.role === route.role && recommendation.workloadClass === route.workloadClass
      ? { ...recommendation, model: '' } : recommendation) };
  const ports: ModelRouteReviewPorts = { ...test.ports, catalogReader: { read: () => invalidCatalog } };
  const preview = handleModelRouteReview({ type: 'preview' }, ports);
  if (preview.status !== 'preview') throw new Error('Missing preview');
  const notice = preview.notices[0];
  assert.ok(notice);
  assert.equal(handleModelRouteReview({ type: 'decide', choice: 'replace', route: notice.route,
    catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, ports).status, 'unavailable');
  assert.equal(test.writes, 0);
  assert.deepEqual(test.routes, [route, unrelatedRoute]);
});
