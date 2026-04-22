import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SUPPORTED_AGENTS } from '../../shared/catalog.js';
import { readExistingState } from '../../shared/state.js';
import type { SibuState, SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SupportedAgent } from '../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../shared/workflow-targets.js';
import { getNextSkillSelection, handleUseSkill } from './handler.js';

const BASE_STATE: SibuState = {
  sibuVersion: '0.1.0',
  templateVersion: '40',
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
      message: 'Unknown skill `nope`. Run `sibu skills list` to see available skills.',
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

  it('prepares a next selection for Go language support', () => {
    const result = getNextSkillSelection(BASE_STATE, 'golang');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'Go');
    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['golang']
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

  it('blocks replacing command pattern with DDD and Hexagonal Architecture', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'command-pattern' }, 'ddd-hexagonal'), {
      status: 'blocked',
      message: 'Cannot select DDD + Hexagonal Architecture because another architecture skill is already selected.',
      hint: 'Architecture skill replacement is not supported yet. Keep the existing architecture skill or stop managing it first.',
    });
  });
});

describe('handleUseSkill', () => {
  it('refuses to select a skill when state is missing', async () => {
    const rootPath = createCleanInitializedRepo();
    fs.rmSync(path.join(rootPath, '.sibu/state.json'));
    const beforeSnapshot = snapshotFiles(rootPath);
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    assert.deepEqual(snapshotFiles(rootPath), beforeSnapshot);
    assert.equal(process.exitCode, 1);
  });

  it('refuses to select a skill when state is invalid', async () => {
    const rootPath = createCleanInitializedRepo();
    fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), '{not json', 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath);
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    assert.deepEqual(snapshotFiles(rootPath), beforeSnapshot);
    assert.equal(process.exitCode, 1);
  });

  it('adds TypeScript in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedLanguageSkills, ['typescript']);
    assert.ok(state.managedFiles['.agents/skills/typescript/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/typescript/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /For any task that changes `\.ts` or `\.tsx` files, also use `typescript`\./);
    assert.equal(process.exitCode, undefined);
  });

  it('adds Go in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'golang' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedLanguageSkills, ['golang']);
    assert.ok(state.managedFiles['.agents/skills/golang/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/golang/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /For any task that changes `\.go` files, also use `golang`\./);
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

  it('refuses to overwrite or adopt an unrecorded existing skill file', async () => {
    const rootPath = createCleanInitializedRepo();
    const unrecordedSkillPath = path.join(rootPath, '.agents/skills/typescript/SKILL.md');
    fs.mkdirSync(path.dirname(unrecordedSkillPath), { recursive: true });
    fs.writeFileSync(unrecordedSkillPath, 'locally owned TypeScript skill\n', 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath);
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    assert.deepEqual(snapshotFiles(rootPath), beforeSnapshot);
    assert.equal(process.exitCode, 1);
  });

  it('refuses to select a skill when AGENTS.md has local edits', async () => {
    const rootPath = createCleanInitializedRepo();
    fs.appendFileSync(path.join(rootPath, 'AGENTS.md'), '\nlocal edit\n', 'utf8');
    const beforeSnapshot = snapshotFiles(rootPath);
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'typescript' });

    assert.deepEqual(snapshotFiles(rootPath), beforeSnapshot);
    assert.equal(process.exitCode, 1);
  });

  it('refuses to replace an existing architecture skill', async () => {
    const rootPath = createCleanInitializedRepo({ selectedArchitectureSkill: 'ddd-hexagonal' });
    const beforeSnapshot = snapshotFiles(rootPath, ['AGENTS.md', '.sibu/state.json', '.agents/skills/command-pattern/SKILL.md']);
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'command-pattern' });

    assert.deepEqual(snapshotFiles(rootPath, ['AGENTS.md', '.sibu/state.json', '.agents/skills/command-pattern/SKILL.md']), beforeSnapshot);
    assert.equal(process.exitCode, 1);
  });
});

function createCleanInitializedRepo({
  selectedArchitectureSkill,
}: {
  selectedArchitectureSkill?: SelectableArchitectureSkill['id'];
} = {}): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-use-skill-test-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const selectedLanguageSkills: SelectableLanguageSkill[] = [];
  const selectedFrameworkSkills: SelectableFrameworkSkill[] = [];
  const architectureSkill = getArchitectureSkillById(selectedArchitectureSkill);
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, architectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill: architectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill: architectureSkill,
    targets,
  });

  return rootPath;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}

function getArchitectureSkillById(skillId: SelectableArchitectureSkill['id'] | undefined): SelectableArchitectureSkill | undefined {
  if (!skillId) {
    return undefined;
  }

  const skillSelection = getNextSkillSelection(BASE_STATE, skillId);

  if (skillSelection.status !== 'selected') {
    throw new Error(`Unsupported architecture skill for test setup: ${skillId}`);
  }

  return skillSelection.selection.selectedArchitectureSkill;
}

function snapshotFiles(
  rootPath: string,
  pathsToSnapshot: string[] = ['AGENTS.md', '.sibu/state.json', '.agents/skills/typescript/SKILL.md']
): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};

  for (const relativePath of pathsToSnapshot) {
    const absolutePath = path.join(rootPath, relativePath);
    snapshot[relativePath] = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : undefined;
  }

  return snapshot;
}
