import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { it, mock } from 'node:test';

import type { ModelRoute, SibuState } from '../../shared/types.js';
import { readModelRoutes, upsertModelRoute, writeSibuState, writeStateFile } from './index.js';

const route: ModelRoute = {
  agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded',
  model: 'external', reasoningEffort: 'high', origin: 'user-selected',
  catalogVersionAtSelection: '2026-09-23.1', selectedAt: '2026-09-23T00:00:00.000Z',
};

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-state-mutation-'));
  const statePath = path.join(root, '.sibu', 'state.json');
  const original: SibuState = {
    sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old',
    selectedAgents: [], managedFiles: {},
  };
  fs.mkdirSync(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify(original));
  return { root, statePath, original, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function basis(root: string): string {
  const result = readModelRoutes(root);
  if (result.status !== 'available') throw new Error('Fixture state unavailable');
  return result.snapshot.stateBasis;
}

function state(statePath: string): SibuState {
  return JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;
}

it('preserves route selected after a legacy write snapshot, through both routine writer APIs', () => {
  const f = fixture();
  try {
    const staleSnapshot = state(f.statePath);
    assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'saved');
    writeStateFile(f.statePath, { ...staleSnapshot, selectedAgents: ['codex'] });
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
    writeSibuState({ rootPath: f.root, statePath: f.statePath, selectedAgents: [], selectedLanguageSkills: [], selectedFrameworkSkills: [], targets: [] });
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
  } finally { f.cleanup(); }
});

it('conflicts with reviewed route basis after legacy write, then saves on refreshed basis', () => {
  const f = fixture();
  try {
    const reviewed = basis(f.root);
    writeStateFile(f.statePath, { ...f.original, selectedAgents: ['codex'] });
    const before = fs.readFileSync(f.statePath, 'utf8');
    assert.equal(upsertModelRoute(f.root, route, reviewed), 'conflict');
    assert.equal(fs.readFileSync(f.statePath, 'utf8'), before);
    assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'saved');
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
    assert.deepEqual(state(f.statePath).selectedAgents, ['codex']);
  } finally { f.cleanup(); }
});

it('leaves prior bytes authoritative and cleans staging after replacement failure, then retries', () => {
  const f = fixture();
  try {
    const before = fs.readFileSync(f.statePath, 'utf8');
    const rename = mock.method(fs, 'renameSync', () => { throw new Error('injected replacement failure'); });
    try { assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'failed'); }
    finally { rename.mock.restore(); }
    assert.equal(fs.readFileSync(f.statePath, 'utf8'), before);
    assert.deepEqual(fs.readdirSync(path.dirname(f.statePath)), ['state.json']);
    assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'saved');
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
  } finally { mock.restoreAll(); f.cleanup(); }
});

it('reports a committed route as saved and removes the lock despite a close failure', () => {
  const f = fixture();
  try {
    const closeSync = fs.closeSync.bind(fs);
    let closeAttempts = 0;
    const close = mock.method(fs, 'closeSync', (fd: number) => {
      closeAttempts += 1;
      if (closeAttempts === 1) closeSync(fd);
      throw new Error('injected post-commit close failure');
    });
    try { assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'saved'); }
    finally { close.mock.restore(); }
    assert.equal(closeAttempts, 2);
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
    assert.deepEqual(fs.readdirSync(path.dirname(f.statePath)), ['state.json']);
    assert.equal(upsertModelRoute(f.root, { ...route, model: 'next' }, basis(f.root)), 'saved');
  } finally { mock.restoreAll(); f.cleanup(); }
});

it('reports a committed route as saved when lock removal fails transiently, then retries', () => {
  const f = fixture();
  try {
    const unlinkSync = fs.unlinkSync.bind(fs);
    let failedOnce = false;
    const unlink = mock.method(fs, 'unlinkSync', (filePath: fs.PathLike) => {
      if (filePath === `${f.statePath}.lock` && !failedOnce) {
        failedOnce = true;
        throw new Error('injected post-commit unlink failure');
      }
      unlinkSync(filePath);
    });
    try { assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'saved'); }
    finally { unlink.mock.restore(); }
    assert.deepEqual(state(f.statePath).modelRoutes, [route]);
    assert.deepEqual(fs.readdirSync(path.dirname(f.statePath)), ['state.json']);
    assert.equal(upsertModelRoute(f.root, { ...route, model: 'next' }, basis(f.root)), 'saved');
  } finally { mock.restoreAll(); f.cleanup(); }
});

it('fails closed on occupied lock and malformed state', () => {
  const f = fixture();
  try {
    const before = fs.readFileSync(f.statePath, 'utf8');
    fs.writeFileSync(`${f.statePath}.lock`, 'occupied');
    assert.equal(upsertModelRoute(f.root, route, basis(f.root)), 'failed');
    assert.throws(() => writeStateFile(f.statePath, f.original));
    assert.equal(fs.readFileSync(f.statePath, 'utf8'), before);
    fs.unlinkSync(`${f.statePath}.lock`);
    fs.writeFileSync(f.statePath, '{broken');
    assert.throws(() => writeStateFile(f.statePath, f.original));
    assert.equal(fs.readFileSync(f.statePath, 'utf8'), '{broken');
  } finally { f.cleanup(); }
});
