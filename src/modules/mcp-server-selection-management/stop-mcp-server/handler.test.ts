import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { sha256 } from '../../../shared/hash.js';
import type { ManagedFilePath, ManagedFileState, SibuState, SupportedAgent } from '../../../shared/types.js';
import { SUPPORTED_AGENTS } from '../../workflow-target-planning/index.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../workflow-target-planning/index.js';
import { handleUseMcpServer } from '../use-mcp-server/handler.js';
import { applyStoppedMcpFileDeleteDecision, getNextStoppedMcpSelection, handleStopMcpServer, stopSelectedMcpServer } from './handler.js';

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

describe('getNextStoppedMcpSelection', () => {
  it('computes remaining MCP servers when GitHub is selected', () => {
    const result = getNextStoppedMcpSelection({ ...BASE_STATE, selectedMcpServers: ['github'] }, 'github');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.serverName, 'GitHub MCP Server');
    assert.deepEqual(result.remainingMcpServers, []);
  });

  it('returns a no-op when GitHub is not selected', () => {
    assert.deepEqual(getNextStoppedMcpSelection(BASE_STATE, 'github'), {
      status: 'noop',
      message: 'GitHub MCP Server is not selected.',
    });
  });

  it('rejects unknown MCP server ids with list guidance', () => {
    assert.deepEqual(getNextStoppedMcpSelection(BASE_STATE, 'nope'), {
      status: 'blocked',
      message: 'Unknown MCP server `nope`. Run `sibu mcp list` to see available MCP servers.',
    });
  });
});

describe('stopSelectedMcpServer', () => {
  it('removes GitHub MCP state, regenerates Codex config, and unmanages MCP-only files', async () => {
    const rootPath = await createInitializedRepoWithGithubMcp();
    const result = stopSelectedMcpServer({ rootPath, state: readState(rootPath), serverId: 'github' });

    assert.equal(result.status, 'stopped');
    if (result.status !== 'stopped') {
      return;
    }

    assert.deepEqual(result.state.selectedMcpServers, []);
    assert.equal(result.state.managedFiles['.codex/config.toml']?.status, 'managed');
    assert.equal(result.state.managedFiles['.mcp.json']?.status, 'unmanaged');
    assert.equal(result.state.managedFiles['.gemini/settings.json']?.status, 'unmanaged');
    assert.equal(result.stoppedPaths.map((stoppedPath) => stoppedPath.relativePath).sort().join(','), '.gemini/settings.json,.mcp.json');
    assert.doesNotMatch(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /github-mcp-server/);
    assert.equal(fs.existsSync(path.join(rootPath, '.mcp.json')), true);
    assert.equal(fs.existsSync(path.join(rootPath, '.gemini/settings.json')), true);
  });

  it('blocks when workflow readiness reports drift through the handler', async () => {
    const rootPath = await createInitializedRepoWithGithubMcp();
    process.chdir(rootPath);
    fs.appendFileSync(path.join(rootPath, 'AGENTS.md'), '\nLocal edit.\n', 'utf8');
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleStopMcpServer({ type: 'mcp:stop', serverId: 'github' });

    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
    assert.match(fs.readFileSync(path.join(rootPath, '.codex/config.toml'), 'utf8'), /api\.githubcopilot\.com\/mcp/);
  });

  it('does not mutate files or state for a not-selected no-op through the handler', async () => {
    const rootPath = createCleanInitializedRepo([getSupportedAgent('codex')]);
    process.chdir(rootPath);
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleStopMcpServer({ type: 'mcp:stop', serverId: 'github' });

    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
  });

  it('does not mutate files or state for an unknown MCP id through the handler', async () => {
    const rootPath = await createInitializedRepoWithGithubMcp();
    process.chdir(rootPath);
    const stateBefore = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');

    await handleStopMcpServer({ type: 'mcp:stop', serverId: 'nope' });

    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), stateBefore);
  });
});

describe('applyStoppedMcpFileDeleteDecision', () => {
  it('keeps stopped files by default decision', () => {
    const { managedPath, managedFile } = createStoppedFile('mcp.json', 'contents\n');

    applyStoppedMcpFileDeleteDecision({ managedPath, managedFile, deleteAction: 'keep' });

    assert.equal(fs.existsSync(managedPath.absolutePath), true);
  });

  it('deletes stopped files when safe', () => {
    const { managedPath, managedFile } = createStoppedFile('mcp.json', 'contents\n');

    applyStoppedMcpFileDeleteDecision({ managedPath, managedFile, deleteAction: 'delete' });

    assert.equal(fs.existsSync(managedPath.absolutePath), false);
  });

  it('keeps locally edited stopped files without second delete confirmation', () => {
    const { managedPath, managedFile } = createStoppedFile('mcp.json', 'contents\n');
    fs.appendFileSync(managedPath.absolutePath, 'local edit\n', 'utf8');

    applyStoppedMcpFileDeleteDecision({ managedPath, managedFile, deleteAction: 'delete', confirmDelete: 'keep' });

    assert.equal(fs.existsSync(managedPath.absolutePath), true);
  });

  it('deletes locally edited stopped files with second delete confirmation', () => {
    const { managedPath, managedFile } = createStoppedFile('mcp.json', 'contents\n');
    fs.appendFileSync(managedPath.absolutePath, 'local edit\n', 'utf8');

    applyStoppedMcpFileDeleteDecision({ managedPath, managedFile, deleteAction: 'delete', confirmDelete: 'delete' });

    assert.equal(fs.existsSync(managedPath.absolutePath), false);
  });
});

async function createInitializedRepoWithGithubMcp(): Promise<string> {
  const rootPath = createCleanInitializedRepo([getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini'), getSupportedAgent('windsurf')]);
  process.chdir(rootPath);
  await handleUseMcpServer({ type: 'mcp:use', serverId: 'github' });
  process.chdir(originalCwd);

  return rootPath;
}

function createCleanInitializedRepo(selectedAgents: SupportedAgent[]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-mcp-stop-test-'));
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

function createStoppedFile(fileName: string, contents: string): { managedPath: ManagedFilePath; managedFile: ManagedFileState } {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-mcp-delete-test-'));
  temporaryRoots.push(rootPath);
  const absolutePath = path.join(rootPath, fileName);
  fs.writeFileSync(absolutePath, contents, 'utf8');

  return {
    managedPath: { relativePath: fileName, absolutePath },
    managedFile: {
      template: 'mcp/claude/.mcp.json',
      templateVersion: '1',
      sha256: sha256(contents),
      status: 'unmanaged',
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
