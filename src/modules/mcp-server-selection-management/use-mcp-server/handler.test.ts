import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SUPPORTED_AGENTS } from '../../workflow-target-planning/index.js';
import type { SibuState, SupportedAgent } from '../../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../workflow-target-planning/index.js';
import { getNextMcpSelection, handleUseMcpServer } from './handler.js';

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();
const BASE_STATE: SibuState = {
  sibuVersion: '0.8.0',
  templateVersion: '71',
  generatedAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getNextMcpSelection', () => {
  it('selects GitHub when no MCP servers were previously selected', () => {
    const result = getNextMcpSelection(BASE_STATE, 'github');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.serverName, 'GitHub MCP Server');
    assert.deepEqual(result.selectedMcpServers.map((server) => server.id), ['github']);
  });

  it('selects Notion when no MCP servers were previously selected', () => {
    const result = getNextMcpSelection(BASE_STATE, 'notion');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.serverName, 'Notion MCP Server');
    assert.deepEqual(result.selectedMcpServers.map((server) => server.id), ['notion']);
  });

  it('returns a no-op when GitHub is already selected', () => {
    assert.deepEqual(getNextMcpSelection({ ...BASE_STATE, selectedMcpServers: ['github'] }, 'github'), {
      status: 'noop',
      message: 'GitHub MCP Server is already selected.',
    });
  });

  it('rejects unknown MCP server ids with list guidance', () => {
    assert.deepEqual(getNextMcpSelection(BASE_STATE, 'nope'), {
      status: 'blocked',
      message: 'Unknown MCP server `nope`. Run `sibu mcp list` to see available MCP servers.',
    });
  });
});

describe('handleUseMcpServer', () => {
  it('adds GitHub MCP config files and records selected MCP state', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')]);
    process.chdir(rootPath);

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });

    const state = readState(rootPath);

    assert.deepEqual(state.selectedMcpServers, ['github']);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-github']);
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(state.managedFiles['.mcp.json']?.template, 'mcp/claude/.mcp.json');
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, '.gemini/settings.json');
    assert.equal(state.managedFiles['.agents/skills/export-to-github/SKILL.md']?.template, 'skills/export-to-github/SKILL.md');
    assert.equal(typeof state.managedFiles['.mcp.json']?.sha256, 'string');
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-github`/);
    assert.doesNotMatch(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /ghp_[A-Za-z0-9_]+/);
    assert.equal(hasPathIncluding(rootPath, 'windsurf'), false);
  });

  it('does not ask for a Notion parent page when adding GitHub', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    process.chdir(rootPath);
    let askedForNotionParentPage = false;

    await handleUseMcpServer(
      { type: 'mcp:use', serverId: 'github' },
      {
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

  it('adds Notion MCP config files and records selected MCP state', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')]);
    process.chdir(rootPath);

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'notion' }, { askForNotionDocsParentPage: async () => 'https://notion.so/sibu-docs' });

    const state = readState(rootPath);

    assert.deepEqual(state.selectedMcpServers, ['notion']);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-notion']);
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/sibu-docs' } });
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(state.managedFiles['.mcp.json']?.template, 'mcp/claude/.mcp.json');
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, '.gemini/settings.json');
    assert.equal(state.managedFiles['.agents/skills/export-to-notion/SKILL.md']?.template, 'skills/export-to-notion/SKILL.md');
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /mcp\.notion\.com\/mcp/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-notion`/);
    assert.doesNotMatch(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /notion[_-]?token/i);
    assert.equal(hasPathIncluding(rootPath, 'windsurf'), false);
  });

  it('composes GitHub and Notion MCP config when both are selected', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')]);
    process.chdir(rootPath);

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });
    await handleUseMcpServer({ type: 'mcp:use', serverId: 'notion' }, { askForNotionDocsParentPage: async () => 'https://notion.so/sibu-docs' });

    const state = readState(rootPath);
    const codexConfig = fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8');
    const claudeConfig = fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8');
    const geminiConfig = fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8');

    assert.deepEqual(state.selectedMcpServers, ['github', 'notion']);
    assert.deepEqual(state.selectedWorkflowSkills, ['export-to-github', 'export-to-notion']);
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/sibu-docs' } });
    assert.match(codexConfig, /api\.githubcopilot\.com\/mcp/);
    assert.match(codexConfig, /mcp\.notion\.com\/mcp/);
    assert.match(claudeConfig, /api\.githubcopilot\.com\/mcp/);
    assert.match(claudeConfig, /mcp\.notion\.com\/mcp/);
    assert.match(geminiConfig, /api\.githubcopilot\.com\/mcp/);
    assert.match(geminiConfig, /mcp\.notion\.com\/mcp/);
  });

  it('does not rewrite files or state when GitHub is already selected', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude')]);
    process.chdir(rootPath);
    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });
    const statePath = path.join(rootPath, '.sibu/state.json');
    const mcpPath = path.join(rootPath, '.mcp.json');
    const stateBefore = fs.readFileSync(statePath, 'utf8');
    const mcpConfigBefore = fs.readFileSync(mcpPath, 'utf8');

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });

    assert.equal(fs.readFileSync(statePath, 'utf8'), stateBefore);
    assert.equal(fs.readFileSync(mcpPath, 'utf8'), mcpConfigBefore);
  });

  it('rejects unknown MCP ids without mutating state', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    process.chdir(rootPath);
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'nope' });

    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
    assert.equal(fs.existsSync(path.join(rootPath, '.mcp.json')), false);
  });

  it('blocks when workflow readiness reports drift', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude')]);
    process.chdir(rootPath);
    fs.appendFileSync(path.join(rootPath, 'AGENTS.md'), '\nLocal edit.\n', 'utf8');
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });

    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
    assert.equal(fs.existsSync(path.join(rootPath, '.mcp.json')), false);
  });

  it('blocks rather than overwriting an unrecorded existing MCP config file', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('claude')]);
    process.chdir(rootPath);
    fs.writeFileSync(path.join(rootPath, '.mcp.json'), '{"local": true}\n', 'utf8');
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });

    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
    assert.equal(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), '{"local": true}\n');
  });
});

function createCleanInitializedRepo(selectedAgents: SupportedAgent[]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-mcp-use-test-'));
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

function hasPathIncluding(rootPath: string, text: string): boolean {
  const entries = fs.readdirSync(rootPath, { recursive: true, withFileTypes: true });

  return entries.some((entry) => path.join(entry.parentPath, entry.name).includes(text));
}
