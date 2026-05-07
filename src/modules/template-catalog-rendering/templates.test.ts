import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SELECTABLE_MCP_SERVERS } from '../workflow-target-planning/index.js';
import { renderMcpConfig } from './templates.js';

const selectedGithubMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github');

describe('renderMcpConfig', () => {
  it('renders deterministic Codex GitHub MCP config while preserving the agent support config', () => {
    const firstRender = renderMcpConfig({
      agentId: 'codex',
      baseContents: 'model_instructions_file = "../AGENTS.md"\n',
      selectedMcpServers: selectedGithubMcpServers,
    });
    const secondRender = renderMcpConfig({
      agentId: 'codex',
      baseContents: 'model_instructions_file = "../AGENTS.md"\n',
      selectedMcpServers: selectedGithubMcpServers,
    });

    assert.equal(firstRender, secondRender);
    assert.match(firstRender, /model_instructions_file = "\.\.\/AGENTS\.md"/);
    assert.match(firstRender, /\[mcp_servers\.github\]/);
    assert.match(firstRender, /command = "docker"/);
    assert.match(firstRender, /"ghcr\.io\/github\/github-mcp-server"/);
    assertDoesNotContainRealCredential(firstRender);
  });

  it('renders deterministic Claude GitHub MCP JSON config', () => {
    const firstRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedGithubMcpServers });
    const secondRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedGithubMcpServers });
    const parsed = JSON.parse(firstRender) as { mcpServers: { github: { command: string; args: string[]; env: Record<string, string> } } };

    assert.equal(firstRender, secondRender);
    assert.equal(parsed.mcpServers.github.command, 'docker');
    assert.deepEqual(parsed.mcpServers.github.args, ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'ghcr.io/github/github-mcp-server']);
    assert.equal(parsed.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN, '${GITHUB_PERSONAL_ACCESS_TOKEN}');
    assertDoesNotContainRealCredential(firstRender);
  });

  it('renders deterministic Gemini GitHub MCP JSON config', () => {
    const firstRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedGithubMcpServers });
    const secondRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedGithubMcpServers });
    const parsed = JSON.parse(firstRender) as { mcpServers: { github: { command: string; args: string[]; env: Record<string, string> } } };

    assert.equal(firstRender, secondRender);
    assert.equal(parsed.mcpServers.github.command, 'docker');
    assert.deepEqual(parsed.mcpServers.github.args, ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'ghcr.io/github/github-mcp-server']);
    assert.equal(parsed.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN, '${GITHUB_PERSONAL_ACCESS_TOKEN}');
    assertDoesNotContainRealCredential(firstRender);
  });
});

function assertDoesNotContainRealCredential(contents: string): void {
  assert.doesNotMatch(contents, /ghp_[A-Za-z0-9_]+/);
  assert.doesNotMatch(contents, /github_pat_[A-Za-z0-9_]+/);
}
