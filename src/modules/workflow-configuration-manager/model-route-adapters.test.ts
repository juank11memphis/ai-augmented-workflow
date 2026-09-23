import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { resolveProjectModelRoute, setProjectModelRoute } from './model-route-adapters.js';

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
