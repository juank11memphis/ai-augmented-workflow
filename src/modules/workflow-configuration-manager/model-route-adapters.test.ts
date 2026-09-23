import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { listProjectModelRoutes, resetProjectModelRoutes, resolveProjectModelRoute, setProjectModelRoute } from './model-route-adapters.js';

it('resolves exact explicit route after save through Manager composition', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-manager-'));
  const statePath = path.join(root, '.sibu', 'state.json');
  fs.mkdirSync(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: [], managedFiles: {} }));
  const key = { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' };
  try {
    const before = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
    assert.equal(before.status, 'missing');
    if (before.status !== 'missing') return;
    const saved = setProjectModelRoute({ type: 'models:set', ...key, model: 'external-model', reasoningEffort: 'high', catalogVersion: before.catalog.catalogVersion, stateBasis: before.stateBasis }, root);
    assert.equal(saved.status, 'saved');
    const after = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
    assert.equal(after.status, 'configured');
    if (after.status === 'configured') { assert.equal(after.route.model, 'external-model'); assert.equal(after.route.reasoningEffort, 'high'); assert.equal(after.origin, 'user-selected'); }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

it('lists and resets one route without changing non-route state or other routes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-reset-'));
  const statePath = path.join(root, '.sibu', 'state.json');
  fs.mkdirSync(path.dirname(statePath));
  const seed = { sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: ['codex'], managedFiles: {}, customSetting: 'keep' };
  fs.writeFileSync(statePath, JSON.stringify(seed));
  try {
    const before = listProjectModelRoutes(root);
    assert.equal(before.status, 'listed');
    if (before.status !== 'listed') return;
    const first = before.routes[0].recommendation;
    const result = resetProjectModelRoutes({ type: 'models:reset', scope: 'one', key: first, confirmed: true,
      catalogVersion: before.catalogVersion, stateBasis: before.stateBasis }, root);
    assert.equal(result.status, 'completed');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.customSetting, 'keep');
    assert.deepEqual(state.selectedAgents, ['codex']);
    assert.equal(state.modelRoutes.length, 1);
    const after = listProjectModelRoutes(root);
    if (after.status === 'listed') { assert.equal(after.routes[0].status, 'recommended'); assert.equal(after.routes[1].status, 'not-configured'); }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
