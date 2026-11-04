import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it, mock } from 'node:test';
import { writeSibuState } from '../../workflow-state-ledger/index.js';

import { log } from '@clack/prompts';
import { SUPPORTED_AGENTS } from '../../template-catalog/index.js';
import { readExistingState } from '../../workflow-state-ledger/index.js';
import type { SibuState, SelectableArchitectureSkill, SelectableDatabaseSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SelectableWorkflowSkill, SupportedAgent } from '../../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles } from '../../template-catalog/index.js';
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
  mock.restoreAll();

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
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

  it('adds AI Prompt Engineer Master in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'ai-prompt-engineer-master' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedWorkflowSkills, ['ai-prompt-engineer-master']);
    assert.ok(state.managedFiles['.agents/skills/ai-prompt-engineer-master/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/ai-prompt-engineer-master/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ai-prompt-engineer-master`/);
    assert.equal(process.exitCode, undefined);
  });

  it('adds UX Expert in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'ux-expert' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedWorkflowSkills, ['ux-expert']);
    assert.ok(state.managedFiles['.agents/skills/ux-expert/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/ux-expert/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ux-expert`/);
    assert.equal(process.exitCode, undefined);
  });

  it('adds Export to Notion with its required Notion MCP server and docs parent page', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);
    let askedForNotionParentPage = false;
    const infoLog = mock.method(log, 'info', () => {});

    await handleUseSkill(
      { type: 'skills:use', skillName: 'export-to-notion' },
      {
        askForNotionDocsParentPage: async () => {
          askedForNotionParentPage = true;
          return 'https://notion.so/sibu-docs';
        },
      }
    );

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.equal(askedForNotionParentPage, true);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-notion']);
    assert.deepEqual(state.selectedMcpServers, ['notion']);
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/sibu-docs' } });
    assert.ok(state.managedFiles['.agents/skills/export-to-notion/SKILL.md']);
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/export-to-notion/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-notion`/);
    assert.ok(infoLog.mock.calls.some((call) => call.arguments[0] === 'Export to Notion requires Notion MCP Server. I will add them together.'));
    assert.equal(process.exitCode, undefined);
  });

  it('adds PostgreSQL Expert in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'postgresql-expert' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.deepEqual(state.selectedDatabaseSkills, ['postgresql-expert']);
    assert.ok(state.managedFiles['.agents/skills/postgresql-expert/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/postgresql-expert/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `postgresql-expert`/);
    assert.equal(process.exitCode, undefined);
  });

  it('adds Layered Architecture in a clean initialized repo', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);

    await handleUseSkill({ type: 'skills:use', skillName: 'layered-architecture' });

    const state = readExistingState(path.join(rootPath, '.sibu/state.json'));
    assert.ok(state);
    assert.equal(state.selectedArchitectureSkill, 'layered-architecture');
    assert.ok(state.managedFiles['.agents/skills/layered-architecture/SKILL.md']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/layered-architecture/SKILL.md')), true);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `layered-architecture`/);
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
  const selectedWorkflowSkills: SelectableWorkflowSkill[] = [];
  const architectureSkill = getArchitectureSkillById(selectedArchitectureSkill);
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, architectureSkill, selectedWorkflowSkills);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill: architectureSkill,
    selectedWorkflowSkills,
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
    selectedWorkflowSkills,
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
