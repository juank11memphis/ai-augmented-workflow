import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import type { SibuState } from '../../shared/types.js';
import { SELECTABLE_ARCHITECTURE_SKILLS, SUPPORTED_AGENTS, getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';
import { writeSibuState } from '../workflow-state-ledger/index.js';
import { handleSyncProject } from './handler.js';

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();
const LEGACY_AGENT_ID = 'legacy-agent';
const LEGACY_ONLY_FILE = '.legacy-agent/settings.json';

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('handleSyncProject unsupported-agent cleanup', () => {
  it('declined cleanup leaves files and state unchanged and stops sync', async () => {
    const rootPath = createLegacyOnlyRepo();
    process.chdir(rootPath);
    const statePath = path.join(rootPath, '.sibu/state.json');
    const beforeState = fs.readFileSync(statePath, 'utf8');
    const beforeAgents = fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8');
    const beforeLegacyFile = fs.readFileSync(path.join(rootPath, LEGACY_ONLY_FILE), 'utf8');
    let askedForCleanup = false;
    let continuedToNormalSync = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForUnsupportedAgentCleanup: async () => {
          askedForCleanup = true;
          return false;
        },
        askForNewLanguageSkills: async (state) => {
          continuedToNormalSync = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(askedForCleanup, true);
    assert.equal(continuedToNormalSync, false);
    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(statePath, 'utf8'), beforeState);
    assert.equal(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), beforeAgents);
    assert.equal(fs.readFileSync(path.join(rootPath, LEGACY_ONLY_FILE), 'utf8'), beforeLegacyFile);
  });

  it('accepted cleanup with no supported agents removes managed files and state without normal sync', async () => {
    const rootPath = createLegacyOnlyRepo();
    process.chdir(rootPath);
    let continuedToNormalSync = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForUnsupportedAgentCleanup: async () => true,
        askForNewLanguageSkills: async (state) => {
          continuedToNormalSync = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(continuedToNormalSync, false);
    assert.equal(process.exitCode, undefined);
    assert.equal(fs.existsSync(path.join(rootPath, '.sibu/state.json')), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(rootPath, LEGACY_ONLY_FILE)), false);
  });
});

describe('handleSyncProject missing architecture repair', () => {
  it('requires architecture selection, updates state, and applies normal architecture previews', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[1];
    let askedForArchitectureRepair = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
        askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
        askForNewArchitectureSkill: async (state) => {
          askedForArchitectureRepair = true;
          return {
            state: {
              ...state,
              selectedArchitectureSkill: selectedArchitectureSkill.id,
              updatedAt: new Date().toISOString(),
            },
            changedState: true,
          };
        },
        askForSyncAction: async () => 'apply-update',
      }
    );

    const state = readState(rootPath);
    const architectureTargetPath = selectedArchitectureSkill.targetRelativePathsByAgent.codex;

    assert.equal(askedForArchitectureRepair, true);
    assert.equal(process.exitCode, undefined);
    assert.equal(state.selectedArchitectureSkill, selectedArchitectureSkill.id);
    assert.ok(architectureTargetPath);
    assert.equal(fs.existsSync(path.join(rootPath, architectureTargetPath)), true);
    assert.equal(state.managedFiles[architectureTargetPath]?.template, selectedArchitectureSkill.templateRelativePath);
  });

  it('preserves existing architecture selection when no repair change is returned', async () => {
    const rootPath = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
    process.chdir(rootPath);
    let askedForArchitectureRepair = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
        askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
        askForNewArchitectureSkill: async (state) => {
          askedForArchitectureRepair = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(askedForArchitectureRepair, true);
    assert.equal(readState(rootPath).selectedArchitectureSkill, SELECTABLE_ARCHITECTURE_SKILLS[0].id);
  });
});

function createLegacyOnlyRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-handler-unsupported-agent-'));
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
      [LEGACY_ONLY_FILE]: {
        template: 'legacy-agent/settings.json',
        templateVersion: '1',
        sha256: 'legacy-hash',
      },
    },
  };
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  return rootPath;
}

function createCleanInitializedRepo(selectedArchitectureSkill?: (typeof SELECTABLE_ARCHITECTURE_SKILLS)[number]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-handler-architecture-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill,
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
    selectedArchitectureSkill,
    targets,
  });

  return rootPath;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: (typeof SUPPORTED_AGENTS)[number]['id']): (typeof SUPPORTED_AGENTS)[number] {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
