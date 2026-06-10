import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { writeSibuState } from '../workflow-state-ledger/index.js';

import type { SibuState, SupportedAgent } from '../../shared/types.js';
import { SUPPORTED_AGENTS, getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';
import { applyUnsupportedAgentCleanup, getUnsupportedAgentCleanupPlan } from './unsupported-agent-cleanup.js';

const temporaryRoots: string[] = [];

const LEGACY_AGENT_ID = 'legacy-agent';

const LEGACY_ONLY_FILE = '.legacy-agent/settings.json';

function buildLegacyOnlyManagedFile() {
  return {
    template: 'legacy-agent/settings.json',
    templateVersion: '1',
    sha256: 'legacy-hash',
  };
}

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getUnsupportedAgentCleanupPlan', () => {
  it('does not plan cleanup when every selected agent is supported', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);

    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state: readState(rootPath) });

    assert.equal(plan, undefined);
  });


  it('plans cleanup for a legacy selected id after catalog removal', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    const state = addLegacyAgentState(rootPath, readState(rootPath), LEGACY_AGENT_ID);

    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);
    assert.deepEqual(plan.unsupportedAgentIds, [LEGACY_AGENT_ID]);
    assert.deepEqual(plan.remainingSupportedAgents.map((agent) => agent.id), ['codex']);
    assert.equal(plan.removesSibuState, false);
  });

  it('keeps shared managed files still required by remaining supported agents', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    const state = addLegacyAgentState(rootPath, readState(rootPath));

    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);
    assert.deepEqual(plan.unsupportedAgentIds, [LEGACY_AGENT_ID]);
    assert.equal(plan.removesSibuState, false);
    assert.equal(plan.obsoleteManagedFilePaths.includes(LEGACY_ONLY_FILE), true);
    assert.equal(plan.filePathsToDelete.includes(LEGACY_ONLY_FILE), true);
    assert.equal(plan.obsoleteManagedFilePaths.includes('AGENTS.md'), false);
    assert.equal(plan.filePathsToDelete.includes('AGENTS.md'), false);
  });

  it('plans all managed files for removal when no supported agents remain', () => {
    const rootPath = createLegacyOnlyRepo();
    const state = readState(rootPath);

    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);
    assert.deepEqual(plan.unsupportedAgentIds, [LEGACY_AGENT_ID]);
    assert.equal(plan.removesSibuState, true);
    assert.deepEqual(new Set(plan.obsoleteManagedFilePaths), new Set(Object.keys(state.managedFiles)));
    assert.deepEqual(new Set(plan.filePathsToDelete), new Set(Object.keys(state.managedFiles)));
  });

  it('does not delete unmanaged obsolete files', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    const state = addLegacyAgentState(rootPath, readState(rootPath));
    state.managedFiles[LEGACY_ONLY_FILE].status = 'unmanaged';

    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);
    assert.equal(plan.obsoleteManagedFilePaths.includes(LEGACY_ONLY_FILE), true);
    assert.equal(plan.filePathsToDelete.includes(LEGACY_ONLY_FILE), false);
  });
});

describe('applyUnsupportedAgentCleanup', () => {
  it('removes unsupported selections and obsolete managed files after confirmation', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    const state = addLegacyAgentState(rootPath, readState(rootPath));
    const statePath = path.join(rootPath, '.sibu/state.json');
    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);

    const result = applyUnsupportedAgentCleanup({ rootPath, statePath, state, plan });

    assert.equal(result.removedStateFile, false);
    assert.deepEqual(result.removedFiles, [LEGACY_ONLY_FILE]);
    assert.equal(fs.existsSync(path.join(rootPath, LEGACY_ONLY_FILE)), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'AGENTS.md')), true);

    if (!result.removedStateFile) {
      assert.deepEqual(result.state.selectedAgents, ['codex']);
      assert.equal(result.state.managedFiles[LEGACY_ONLY_FILE], undefined);
      assert.ok(result.state.managedFiles['AGENTS.md']);
    }
  });

  it('removes state and all managed files when no supported agents remain', () => {
    const rootPath = createLegacyOnlyRepo();
    const state = readState(rootPath);
    const statePath = path.join(rootPath, '.sibu/state.json');
    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);

    const result = applyUnsupportedAgentCleanup({ rootPath, statePath, state, plan });

    assert.equal(result.removedStateFile, true);
    assert.deepEqual(new Set(result.removedFiles), new Set(Object.keys(state.managedFiles)));
    assert.equal(fs.existsSync(statePath), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(rootPath, LEGACY_ONLY_FILE)), false);
  });

  it('never deletes files absent from Sibu state', () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    const state = addLegacyAgentState(rootPath, readState(rootPath));
    const unmanagedUserFile = path.join(rootPath, '.legacy-agent/user-owned.json');
    fs.mkdirSync(path.dirname(unmanagedUserFile), { recursive: true });
    fs.writeFileSync(unmanagedUserFile, '{}\n', 'utf8');
    const plan = getUnsupportedAgentCleanupPlan({ rootPath, state });

    assert.ok(plan);

    applyUnsupportedAgentCleanup({ rootPath, statePath: path.join(rootPath, '.sibu/state.json'), state, plan });

    assert.equal(fs.existsSync(unmanagedUserFile), true);
  });
});

function createCleanInitializedRepo(selectedAgents: SupportedAgent[]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-unsupported-agent-cleanup-'));
  temporaryRoots.push(rootPath);
  const targets = getWorkflowTargets(rootPath, selectedAgents);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    targets,
  });

  return rootPath;
}

function createLegacyOnlyRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-unsupported-agent-cleanup-only-'));
  temporaryRoots.push(rootPath);
  fs.mkdirSync(path.join(rootPath, '.sibu'), { recursive: true });
  fs.writeFileSync(path.join(rootPath, 'AGENTS.md'), 'legacy agents\n', 'utf8');
  fs.mkdirSync(path.dirname(path.join(rootPath, LEGACY_ONLY_FILE)), { recursive: true });
  fs.writeFileSync(path.join(rootPath, LEGACY_ONLY_FILE), '{}\n', 'utf8');

  const state: SibuState = {
    sibuVersion: '0.0.0',
    templateVersion: '1',
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedAgents: [LEGACY_AGENT_ID],
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    managedFiles: {
      'AGENTS.md': {
        template: 'AGENTS.md',
        templateVersion: '1',
        sha256: 'legacy-agents-hash',
      },
      [LEGACY_ONLY_FILE]: buildLegacyOnlyManagedFile(),
    },
  };
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  return rootPath;
}

function addLegacyAgentState(rootPath: string, state: SibuState, legacyAgentId = LEGACY_AGENT_ID): SibuState {
  const legacyFilePath = path.join(rootPath, LEGACY_ONLY_FILE);
  fs.mkdirSync(path.dirname(legacyFilePath), { recursive: true });
  fs.writeFileSync(legacyFilePath, '{}\n', 'utf8');

  return {
    ...state,
    selectedAgents: [...state.selectedAgents, legacyAgentId],
    managedFiles: {
      ...state.managedFiles,
      [LEGACY_ONLY_FILE]: buildLegacyOnlyManagedFile(),
    },
  };
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
