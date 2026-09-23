import assert from 'node:assert/strict';
import { it } from 'node:test';
import { serializeModelRouteResult } from './model-route-json.js';

it('serializes stable versioned JSON and safely escapes identifiers', () => {
  const output = serializeModelRouteResult({ status: 'saved', route: {
    agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded',
    model: 'name"quoted', reasoningEffort: 'low', origin: 'user-selected',
    catalogVersionAtSelection: '2026-09-23.2', selectedAt: '2026-09-23T00:00:00.000Z',
  }, recovery: null });
  assert.equal(JSON.parse(output).schemaVersion, 1);
  assert.equal(JSON.parse(output).route.model, 'name"quoted');
});
