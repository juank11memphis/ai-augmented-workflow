import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SUPPORTED_AGENTS } from '../../shared/catalog.js';
import { readExistingState } from '../../shared/state.js';
import type { EkkoState, SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SupportedAgent } from '../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeEkkoState } from '../../shared/workflow-targets.js';
import { getNextSkillSelection, handleUseSkill } from './handler.js';

const BASE_STATE: EkkoState = {
  ekkoVersion: '0.1.0',
  templateVersion: '39',
  generatedAt: '2026-04-19T00:00:00.000Z',
  updatedAt: '2026-04-19T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

const originalCwd = process.cwd();
const temporaryRoots: string[] = [];

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getNextSkillSelection', () => {
  it('blocks unknown skills with the catalog resolution message', () => {
    assert.deepEqual(getNextSkillSelection(BASE_STATE, 'nope'), {
      status: 'blocked',
      message: 'Unknown skill `nope`. Run `ekko skills list` to see available skills.',
    });
  });

  it('returns no-op success when a language skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedLanguageSkills: ['typescript'] }, 'typescript'), {
      status: 'noop',
      message: 'TypeScript is already selected.',
    });
  });

  it('returns no-op success when a framework skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedFrameworkSkills: ['react'] }, 'react'), {
      status: 'noop',
      message: 'React is already selected.',
    });
  });

  it('returns no-op success when an architecture skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'command-pattern' }, 'command-pattern'), {
      status: 'noop',
      message: 'Command Pattern is already selected.',
    });
  });

  it('prepares a next selection for a new language skill', () => {
    const result = getNextSkillSelection(BASE_STATE, 'typescript');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'TypeScript');
    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['typescript']
    );
    assert.deepEqual(result.selection.selectedFrameworkSkills, []);
    assert.equal(result.selection.selectedArchitectureSkill, undefined);
  });

  it('prepares a next selection for a new framework skill while preserving existing skills', () => {
    const result = getNextSkillSelection({ ...BASE_STATE, selectedLanguageSkills: ['typescript'], selectedFrameworkSkills: ['react'] }, 'nextjs');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['typescript']
    );
    assert.deepEqual(
      result.selection.selectedFrameworkSkills.map((skill) => skill.id),
      ['react', 'nextjs']
    );
  });

  it('prepares a next selection for a new architecture skill when none is selected', () => {
    const result = getNextSkillSelection(BASE_STATE, 'command-pattern');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.selection.selectedArchitectureSkill?.id, 'command-pattern');
  });

  it('blocks replacing an existing architecture skill', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'ddd-hexagonal' }, 'command-pattern'), {
      status: 'blocked',
      message: 'Cannot select Command Pattern because another architecture skill is already selected.',
      hint: 'Architecture skill replacement is not supported yet. Keep the existing architecture skill or stop managing it first.',
    });
  });
});

describe('handleUseSkill', () => {
  it('adds TypeScript in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    const state = readExistingState(path.join(rootPath, '.ekko/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedLanguageSkills, ['typescript']);
    assert.ok(state.managedFiles['.agents/skills/typescript/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/typescript/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /For any task that changes `\.ts` or `\.tsx` files, also use `typescript`\./);
    assert.equal(process.exitCode, undefined);
  });

  it('does not change files when TypeScript is already selected', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);
    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });
    const beforeSnapshot = snapshotFiles(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    assert.deepEqual(snapshotFiles(rootPath), beforeSnapshot);
    assert.equal(process.exitCode, undefined);
  });
});

function createCleanInitializedRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ekko-use-skill-test-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const selectedLanguageSkills: SelectableLanguageSkill[] = [];
  const selectedFrameworkSkills: SelectableFrameworkSkill[] = [];
  const selectedArchitectureSkill: SelectableArchitectureSkill | undefined = undefined;
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

  writeEkkoState({ rootPath, statePath: path.join(rootPath, '.ekko/state.json'), selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, targets });

  return rootPath;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}

function snapshotFiles(rootPath: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const pathsToSnapshot = [
    'AGENTS.md',
    '.ekko/state.json',
    '.agents/skills/typescript/SKILL.md',
  ];

  for (const relativePath of pathsToSnapshot) {
    snapshot[relativePath] = fs.readFileSync(path.join(rootPath, relativePath), 'utf8');
  }

  return snapshot;
}
