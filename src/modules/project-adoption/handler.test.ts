import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SELECTABLE_MCP_SERVERS, SUPPORTED_AGENTS } from '../workflow-target-planning/index.js';
import { handleInitProject } from './handler.js';
import type { SibuState, SupportedAgent } from '../../shared/types.js';

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
    assert.equal(state.managedFiles['.mcp.json'], undefined);
    assert.equal(state.managedFiles['.gemini/settings.json'], undefined);
    assert.equal(fs.existsSync(path.join(rootPath, '.mcp.json')), false);
    assert.equal(fs.existsSync(path.join(rootPath, '.gemini/settings.json')), false);
  });

  it('initializes managed GitHub MCP config for supported selected agents', async () => {
    const rootPath = createTemporaryRoot();
    process.chdir(rootPath);

    await handleInitProject(
      { type: 'init' },
      buildDependencies({
        selectedAgents: [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini'), getSupportedAgent('windsurf')],
        selectedMcpServers: SELECTABLE_MCP_SERVERS,
      })
    );

    const state = readState(rootPath);

    assert.deepEqual(state.selectedAgents, ['codex', 'claude', 'gemini', 'windsurf']);
    assert.deepEqual(state.selectedMcpServers, ['github']);
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(state.managedFiles['.mcp.json']?.template, 'mcp/claude/.mcp.json');
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, 'mcp/gemini/settings.json');
    assert.equal(typeof state.managedFiles['.codex/config.toml']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.mcp.json']?.sha256, 'string');
    assert.equal(typeof state.managedFiles['.gemini/settings.json']?.sha256, 'string');

    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /ghcr\.io\/github\/github-mcp-server/);
    assert.match(fs.readFileSync(path.join(rootPath, '.mcp.json'), 'utf8'), /ghcr\.io\/github\/github-mcp-server/);
    assert.match(fs.readFileSync(path.join(rootPath, '.gemini/settings.json'), 'utf8'), /ghcr\.io\/github\/github-mcp-server/);
    assert.equal(hasPathIncluding(rootPath, 'windsurf'), false);
  });
});

function buildDependencies({
  selectedAgents,
  selectedMcpServers = [],
}: {
  selectedAgents: SupportedAgent[];
  selectedMcpServers?: typeof SELECTABLE_MCP_SERVERS;
}): Parameters<typeof handleInitProject>[1] {
  return {
    renderIntro: async () => undefined,
    askForSupportedAgents: async () => selectedAgents,
    askForMcpServers: async () => selectedMcpServers,
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

function hasPathIncluding(rootPath: string, text: string): boolean {
  const entries = fs.readdirSync(rootPath, { recursive: true, withFileTypes: true });

  return entries.some((entry) => path.join(entry.parentPath, entry.name).includes(text));
}
