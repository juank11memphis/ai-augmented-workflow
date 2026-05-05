import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SELECTABLE_LANGUAGE_SKILLS, SUPPORTED_AGENTS } from '../modules/workflow-target-planning/index.js';
import { getWorkflowMutationReadiness } from './workflow-mutation-readiness.js';
import type { SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SupportedAgent } from './types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from './workflow-targets.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getWorkflowMutationReadiness', () => {
  it('is not ready when state is missing', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-readiness-missing-'));
    temporaryRoots.push(rootPath);

    assert.deepEqual(getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.sibu/state.json') }), {
      ok: false,
      message: '.sibu/state.json is missing.',
      hint: 'Run `sibu init` before selecting project skills.',
    });
  });

  it('is not ready when state cannot be parsed', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-readiness-unparseable-'));
    temporaryRoots.push(rootPath);
    const statePath = path.join(rootPath, '.sibu/state.json');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, '{not json', 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath, ['.sibu/state.json']);

    assert.deepEqual(getWorkflowMutationReadiness({ rootPath, statePath }), {
      ok: false,
      message: '.sibu/state.json could not be parsed.',
      hint: 'Run `sibu init` before selecting project skills.',
    });
    assert.deepEqual(snapshotFiles(rootPath, ['.sibu/state.json']), beforeSnapshot);
  });

  it('is not ready when state is structurally invalid', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-readiness-invalid-'));
    temporaryRoots.push(rootPath);
    const statePath = path.join(rootPath, '.sibu/state.json');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, `${JSON.stringify({ selectedAgents: ['codex'], managedFiles: {} }, null, 2)}\n`, 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath, ['.sibu/state.json']);

    assert.deepEqual(getWorkflowMutationReadiness({ rootPath, statePath }), {
      ok: false,
      message: '.sibu/state.json is not a valid Sibu state file.',
      hint: 'Run `sibu init` before selecting project skills.',
    });
    assert.deepEqual(snapshotFiles(rootPath, ['.sibu/state.json']), beforeSnapshot);
  });

  it('is ready for a clean initialized repo', () => {
    const rootPath = createCleanInitializedRepo();
    const result = getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.sibu/state.json') });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.state.selectedAgents.includes('codex'), true);
    assert.equal(result.previews.every((preview) => preview.status === 'up-to-date'), true);
  });

  it('is ready for a clean Windsurf-selected repo with shared skill files', () => {
    const rootPath = createCleanInitializedRepo({
      selectedAgents: [getSupportedAgent('windsurf')],
      selectedLanguageSkills: [SELECTABLE_LANGUAGE_SKILLS[0]],
    });
    const result = getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.sibu/state.json') });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.deepEqual(result.state.selectedAgents, ['windsurf']);
    assert.equal(result.previews.every((preview) => preview.status === 'up-to-date'), true);
    assert.equal(result.previews.some((preview) => preview.relativePath.startsWith('.windsurf/')), false);
  });

  it('is not ready when a managed file has local edits', () => {
    const rootPath = createCleanInitializedRepo();
    fs.appendFileSync(path.join(rootPath, 'AGENTS.md'), '\nlocal edit\n', 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath, ['AGENTS.md', '.sibu/state.json']);

    const result = getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.sibu/state.json') });

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }

    assert.equal(result.message, 'Workflow state is not clean enough to select a skill safely.');
    assert.equal(result.hint, 'Run `sibu sync` to review workflow state before selecting a skill.');
    assert.equal(result.actionablePreviews?.some((preview) => preview.relativePath === 'AGENTS.md' && preview.status === 'modified'), true);
    assert.deepEqual(snapshotFiles(rootPath, ['AGENTS.md', '.sibu/state.json']), beforeSnapshot);
  });
});

function createCleanInitializedRepo({
  selectedAgents = [getSupportedAgent('codex')],
  selectedLanguageSkills = [],
  selectedFrameworkSkills = [],
  selectedArchitectureSkill = undefined,
}: {
  selectedAgents?: SupportedAgent[];
  selectedLanguageSkills?: SelectableLanguageSkill[];
  selectedFrameworkSkills?: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
} = {}): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-readiness-clean-'));
  temporaryRoots.push(rootPath);
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({ rootPath, statePath: path.join(rootPath, '.sibu/state.json'), selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, targets });

  return rootPath;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}

function snapshotFiles(rootPath: string, relativePaths: string[]): Record<string, string> {
  return Object.fromEntries(relativePaths.map((relativePath) => [relativePath, fs.readFileSync(path.join(rootPath, relativePath), 'utf8')]));
}
