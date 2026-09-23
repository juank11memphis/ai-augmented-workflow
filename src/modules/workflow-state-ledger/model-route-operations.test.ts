import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { readModelRoutes, upsertModelRoute } from './model-route-operations.js';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-ledger-'));
  const statePath = path.join(root, '.sibu', 'state.json');
  fs.mkdirSync(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: [], managedFiles: {} }));
  return { root, statePath };
}
const route = { agentEnvironment: 'codex' as const, role: 'implementation-executor' as const, workloadClass: 'bounded' as const, model: 'custom', reasoningEffort: 'high' as const, origin: 'user-selected' as const, catalogVersionAtSelection: '2026-09-23.2', selectedAt: '2026-09-23T00:00:00.000Z' };

it('upserts only one key, preserves unrelated routes, and rejects stale basis', () => {
  const { root, statePath } = fixture();
  try {
    const initial = readModelRoutes(root);
    assert.equal(initial.status, 'available');
    if (initial.status !== 'available') return;
    assert.equal(upsertModelRoute(root, route, initial.snapshot.stateBasis), 'saved');
    const after = readModelRoutes(root);
    assert.equal(after.status, 'available');
    if (after.status !== 'available') return;
    assert.deepEqual(after.snapshot.routes, [route]);
    assert.equal(upsertModelRoute(root, route, initial.snapshot.stateBasis), 'conflict');
    const second = { ...route, workloadClass: 'demanding' as const, model: 'other' };
    assert.equal(upsertModelRoute(root, second, after.snapshot.stateBasis), 'saved');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.modelRoutes.length, 2);
    assert.equal(state.generatedAt, 'old');
    assert.notEqual(state.updatedAt, 'old');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

it('leaves prior bytes authoritative when replacement cannot proceed', () => {
  const { root, statePath } = fixture();
  try {
    const original = fs.readFileSync(statePath, 'utf8');
    const read = readModelRoutes(root);
    if (read.status !== 'available') throw new Error('fixture invalid');
    fs.writeFileSync(`${statePath}.lock`, 'occupied');
    assert.equal(upsertModelRoute(root, route, read.snapshot.stateBasis), 'failed');
    assert.equal(fs.readFileSync(statePath, 'utf8'), original);
    fs.unlinkSync(`${statePath}.lock`);
    fs.writeFileSync(statePath, '{broken');
    assert.equal(readModelRoutes(root).status, 'unavailable');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
