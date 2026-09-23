import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it, mock } from 'node:test';

import type { ModelRoute, SibuState } from '../../shared/types.js';
import { handleUseSkill } from '../workflow-configuration-manager/use-skill/handler.js';
import { applySyncAction } from '../sync-review-orchestrator/apply-action.js';
import { getWorkflowTargets, readTemplateManifest, renderMissingWorkflowFiles, SUPPORTED_AGENTS } from '../template-catalog/index.js';
import { cloneState, readModelRoutes, readStateForDoctor, recordModelRouteReview, writeSibuState, writeStateFile } from './index.js';

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();
const routes: ModelRoute[] = [
  {
    agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded', model: 'luna', reasoningEffort: 'high',
    origin: 'recommended', catalogVersionAtSelection: '2026-09-23.1', selectedAt: '2026-09-23T12:00:00.000Z',
  },
  {
    agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'high-risk', model: 'astra-custom', reasoningEffort: 'low',
    origin: 'user-selected', catalogVersionAtSelection: '2026-09-23.1', selectedAt: '2026-09-23T12:01:00.000Z',
  },
];

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;
  mock.restoreAll();
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('model route state preservation', () => {
  it('records an atomic route review independently and preserves it through state rewrites', () => {
    const root = createInitializedRepo();
    const statePath = path.join(root, '.sibu/state.json');
    writeStateFile(statePath, { ...readState(root), modelRoutes: routes });
    const read = readModelRoutes(root);
    if (read.status !== 'available') throw new Error('State unavailable');
    const marker = { agentEnvironment: routes[0].agentEnvironment, role: routes[0].role,
      workloadClass: routes[0].workloadClass, routeSelectedAt: routes[0].selectedAt, catalogVersion: '2026-09-23.2' };
    assert.equal(recordModelRouteReview(root, marker, read.snapshot.stateBasis), 'saved');
    assert.equal(recordModelRouteReview(root, marker, read.snapshot.stateBasis), 'conflict');
    assert.deepEqual(readState(root).modelRoutes, routes);
    assert.deepEqual(readState(root).modelRouteReviews, [marker]);
    const selectedAgents = [SUPPORTED_AGENTS.find((agent) => agent.id === 'codex')!];
    writeSibuState({ rootPath: root, statePath, selectedAgents, selectedLanguageSkills: [], selectedFrameworkSkills: [], targets: getWorkflowTargets(root, selectedAgents) });
    assert.deepEqual(readState(root).modelRouteReviews, [marker]);
    assert.deepEqual(readState(root).modelRoutes, routes);
  });
  it('accepts legacy state and rejects malformed or duplicate routes', () => {
    const root = createInitializedRepo();
    const statePath = path.join(root, '.sibu/state.json');
    const legacyState = readState(root);
    assert.equal(legacyState.modelRoutes, undefined);
    assert.equal(readStateForDoctor(statePath).ok, true);

    writeStateFile(statePath, { ...legacyState, modelRoutes: routes });
    assert.equal(readStateForDoctor(statePath).ok, true);

    writeRawState(statePath, { ...legacyState, modelRoutes: [routes[0], { ...routes[0], model: 'duplicate' }] });
    assert.equal(readStateForDoctor(statePath).ok, false);
    writeRawState(statePath, { ...legacyState, modelRoutes: [{ ...routes[0], model: '' }] });
    assert.equal(readStateForDoctor(statePath).ok, false);
  });

  it('deep-clones route arrays and entries without changing opaque model values', () => {
    const state = { ...baseState(), modelRoutes: routes };
    const cloned = cloneState(state);

    cloned.modelRoutes![0].model = 'changed';
    assert.equal(state.modelRoutes![0].model, 'luna');
    assert.equal(cloned.modelRoutes![1].model, 'astra-custom');
  });

  it('preserves routes through reconstruction-based writes', () => {
    const root = createInitializedRepo();
    const statePath = path.join(root, '.sibu/state.json');
    const initial = readState(root);
    writeStateFile(statePath, { ...initial, modelRoutes: routes });

    const selectedAgents = [SUPPORTED_AGENTS.find((agent) => agent.id === 'codex')!];
    writeSibuState({ rootPath: root, statePath, selectedAgents, selectedLanguageSkills: [], selectedFrameworkSkills: [], targets: getWorkflowTargets(root, selectedAgents) });

    assert.deepEqual(readState(root).modelRoutes, routes);
  });

  it('preserves routes through workflow-configuration and sync clone mutations', async () => {
    const root = createInitializedRepo();
    const statePath = path.join(root, '.sibu/state.json');
    writeStateFile(statePath, { ...readState(root), modelRoutes: routes });
    process.chdir(root);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });
    assert.deepEqual(readState(root).modelRoutes, routes);

    const state = readState(root);
    const preview = {
      relativePath: 'AGENTS.md',
      status: 'modified' as const,
      managedFile: state.managedFiles['AGENTS.md'],
      currentTemplateVersion: readTemplateManifest().templates['AGENTS.md'].version,
      changes: [],
    };
    const result = applySyncAction({ rootPath: root, state, manifest: readTemplateManifest(), preview, action: 'mark-reviewed' });
    assert.deepEqual(result.state.modelRoutes, routes);
  });
});

function createInitializedRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-route-preservation-'));
  temporaryRoots.push(root);
  const selectedAgents = [SUPPORTED_AGENTS.find((agent) => agent.id === 'codex')!];
  const targets = getWorkflowTargets(root, selectedAgents);
  for (const file of renderMissingWorkflowFiles({ missingTargets: targets, overview: 'Test.', selectedLanguageSkills: [], selectedFrameworkSkills: [] })) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }
  writeSibuState({ rootPath: root, statePath: path.join(root, '.sibu/state.json'), selectedAgents, selectedLanguageSkills: [], selectedFrameworkSkills: [], targets });
  return root;
}

function baseState(): SibuState {
  return {
    sibuVersion: '0.1.0', templateVersion: '1', generatedAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z',
    selectedAgents: ['codex'], managedFiles: {},
  };
}

function readState(root: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(root, '.sibu/state.json'), 'utf8')) as SibuState;
}

function writeRawState(statePath: string, state: unknown): void {
  fs.writeFileSync(statePath, JSON.stringify(state), 'utf8');
}
