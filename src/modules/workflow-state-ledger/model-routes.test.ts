import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ModelRoute } from '../../shared/types.js';
import { isModelRoutes } from './model-routes.js';

const boundedRoute: ModelRoute = {
  agentEnvironment: 'codex',
  role: 'implementation-executor',
  workloadClass: 'bounded',
  model: 'luna',
  reasoningEffort: 'high',
  origin: 'recommended',
  catalogVersionAtSelection: '2026-09-23.1',
  selectedAt: '2026-09-23T12:00:00.000Z',
};

describe('model route state validation', () => {
  it('accepts independently keyed workloads and opaque external model identifiers', () => {
    assert.equal(
      isModelRoutes([
        boundedRoute,
        { ...boundedRoute, workloadClass: 'high-risk', model: 'astra-custom', reasoningEffort: 'low', origin: 'user-selected' },
      ]),
      true
    );
  });

  it('rejects duplicate environment, role, and workload tuples', () => {
    assert.equal(isModelRoutes([boundedRoute, { ...boundedRoute, model: 'another-model' }]), false);
  });

  it('accepts every supported role and workload tuple', () => {
    const roles: ModelRoute['role'][] = [
      'implementation-planner',
      'implementation-executor',
      'architecture-reviewer',
      'technical-lead-reviewer',
      'github-exporter',
      'notion-exporter',
    ];
    const workloads: ModelRoute['workloadClass'][] = ['bounded', 'demanding', 'high-risk'];
    const routes = roles.flatMap((role) => workloads.map((workloadClass) => ({ ...boundedRoute, role, workloadClass })));

    assert.equal(isModelRoutes(routes), true);
  });

  it('rejects malformed key, value, and selection fields', () => {
    const invalidCases: Array<Partial<ModelRoute>> = [
      { agentEnvironment: 'unknown' as never },
      { role: 'unknown' as never },
      { workloadClass: 'unknown' as never },
      { model: '   ' },
      { reasoningEffort: 'extreme' as never },
      { origin: 'inherited' as never },
      { catalogVersionAtSelection: '' },
      { catalogVersionAtSelection: '2026' },
      { catalogVersionAtSelection: '2026-02-30.1' },
      { catalogVersionAtSelection: '2026-09-23.0' },
      { catalogVersionAtSelection: 'external-choice' },
      { selectedAt: 'not-a-date' },
      { selectedAt: '2026' },
      { selectedAt: '09/23/2026' },
      { selectedAt: '2026-09-23T12:00:00Z' },
    ];

    for (const invalidCase of invalidCases) {
      assert.equal(isModelRoutes([{ ...boundedRoute, ...invalidCase }]), false, JSON.stringify(invalidCase));
    }
    assert.equal(isModelRoutes({ route: boundedRoute }), false);
  });
});
