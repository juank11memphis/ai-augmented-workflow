import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SELECTABLE_MCP_SERVERS, SELECTABLE_WORKFLOW_SKILLS, SUPPORTED_AGENTS } from '../workflow-target-planning/index.js';
import { handleInitProject } from './handler.js';
import type { SibuState, SupportedAgent, WorkflowSkillId } from '../../shared/types.js';

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('handleInitProject', () => {
  it('initializes the baseline workflow when no MCP servers are selected', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);

    await handleInitProject({ type: 'init' }, buildDependencies({ selectedAgents: [getSupportedAgent('codex')] }));

    const state = readState(rootPath);

    assert.deepEqual(state.selectedAgents, ['codex']);
    assert.deepEqual(state.selectedMcpServers, []);
    assert.ok(state.managedFiles['AGENTS.md']);
    assert.ok(state.managedFiles['.codex/config.toml']);
    assert.equal(state.managedFiles['.codex/hooks.json']?.template, '.codex/hooks.json');
    assert.equal(state.managedFiles['.mcp.json'], undefined);
    assert.equal(state.managedFiles['.gemini/settings.json'], undefined);
    assert.equal(fs.existsSync(path.join(rootPath, '.codex/hooks.json')), true);
    assert.equal(fs.existsSync(path.join(rootPath, '.mcp.json')), false);
    assert.equal(fs.existsSync(path.join(rootPath, '.gemini/settings.json')), false);
  });

  it('does not ask for a Notion parent page when Notion is not selected', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);
    let askedForNotionParentPage = false;

    await handleInitProject(
      { type: 'init' },
      {
        ...buildDependencies({ selectedAgents: [getSupportedAgent('codex')], selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github') }),
        askForNotionDocsParentPage: async () => {
          askedForNotionParentPage = true;
          return 'https://notion.so/sibu-docs';
        },
      }
    );

    const state = readState(rootPath);

    assert.equal(askedForNotionParentPage, false);
    assert.deepEqual(state.selectedMcpServers, ['github']);
    assert.equal(state.mcpServerConfigs, undefined);
  });



  it('includes the GitHub export skill as a companion when GitHub MCP is selected', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);
    let excludedWorkflowSkillIds: WorkflowSkillId[] | undefined;

    await handleInitProject(
      { type: 'init' },
      {
        ...buildDependencies({ selectedAgents: [getSupportedAgent('codex')], selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github') }),
        askForWorkflowSkills: async (excludedIds) => {
          excludedWorkflowSkillIds = excludedIds;
          return [];
        },
      }
    );

    const state = readState(rootPath);

    assert.deepEqual(excludedWorkflowSkillIds, ['export-to-github']);
    assert.deepEqual(state.selectedMcpServers, ['github']);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-github']);
    assert.ok(state.managedFiles['.agents/skills/export-to-github/SKILL.md']);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-github`/);
  });

  it('includes the Notion export skill as a companion and still asks for Notion docs parent page', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);
    let askedForNotionParentPage = false;
    let excludedWorkflowSkillIds: WorkflowSkillId[] | undefined;

    await handleInitProject(
      { type: 'init' },
      {
        ...buildDependencies({ selectedAgents: [getSupportedAgent('codex')], selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'notion') }),
        askForNotionDocsParentPage: async () => {
          askedForNotionParentPage = true;
          return 'https://notion.so/sibu-docs';
        },
        askForWorkflowSkills: async (excludedIds) => {
          excludedWorkflowSkillIds = excludedIds;
          return [SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ai-prompt-engineer-master')!];
        },
      }
    );

    const state = readState(rootPath);

    assert.equal(askedForNotionParentPage, true);
    assert.deepEqual(excludedWorkflowSkillIds, ['export-to-notion']);
    assert.deepEqual(state.selectedMcpServers, ['notion']);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-notion', 'ai-prompt-engineer-master']);
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/sibu-docs' } });
    assert.ok(state.managedFiles['.agents/skills/export-to-notion/SKILL.md']);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-notion`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ai-prompt-engineer-master`/);
  });

  it('initializes managed MCP config for supported selected agents', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);

    await handleInitProject(
      { type: 'init' },
      buildDependencies({
        selectedAgents: [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')],
        selectedMcpServers: SELECTABLE_MCP_SERVERS,
      })
    );

    const state = readState(rootPath);

    assert.deepEqual(state.selectedAgents, ['codex', 'claude', 'gemini']);
    assert.deepEqual(state.selectedMcpServers, ['github', 'notion']);
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/sibu-docs' } });
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(state.managedFiles['.codex/hooks.json']?.template, '.codex/hooks.json');
    assert.equal(state.managedFiles['.claude/settings.json']?.template, '.claude/settings.json');
    assert.equal(state.managedFiles['.mcp.json']?.template, 'mcp/claude/.mcp.json');
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, '.gemini/settings.json');
    assert.equal(typeof state.managedFiles['.codex/config.toml']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.codex/hooks.json']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.claude/settings.json']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.mcp.json']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.gemini/settings.json']?.sha256, 'string');

    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/hooks.json'), 'utf8'), /SessionStart/);
    assert.match(fs.readFileSync(path.join(rootPath, '.claude/settings.json'), 'utf8'), /SessionStart/);
    assert.match(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /SessionStart/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /mcp\.notion\.com\/mcp/);
  });
});

function buildDependencies({
  selectedAgents,
  selectedMcpServers = [],
}: {
  selectedAgents: SupportedAgent[];
  selectedMcpServers?: typeof SELECTABLE_MCP_SERVERS;
}): NonNullable<Parameters<typeof handleInitProject>[1]> {
  return {
    renderIntro: async () => undefined,
    askForSupportedAgents: async () => selectedAgents,
    askForMcpServers: async () => selectedMcpServers,
    askForNotionDocsParentPage: async () => 'https://notion.so/sibu-docs',
    askForLanguageSkills: async () => [],
    askForFrameworkSkills: async () => [],
    askForDatabaseSkills: async () => [],
    askForArchitectureSkill: async () => undefined,
    askForWorkflowSkills: async () => [],
    askForProjectOverview: async () => 'Test project.',
  };
}

function createTemporaryRoot(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-project-adoption-test-'));
  temporaryRoots.push(rootPath);

  return rootPath;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}

