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
    assert.match(firstRender, /url = "https:\/\/api\.githubcopilot\.com\/mcp\/"/);
    assert.match(firstRender, /bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"/);
    assert.doesNotMatch(firstRender, /command = "docker"/);
    assertDoesNotContainRealCredential(firstRender);
  });

  it('renders deterministic Claude GitHub MCP JSON config', () => {
    const firstRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedGithubMcpServers });
    const secondRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedGithubMcpServers });
    const parsed = JSON.parse(firstRender) as { mcpServers: { github: { type: string; url: string; headers: Record<string, string>; command?: string } } };

    assert.equal(firstRender, secondRender);
    assert.equal(parsed.mcpServers.github.type, 'http');
    assert.equal(parsed.mcpServers.github.url, 'https://api.githubcopilot.com/mcp/');
    assert.equal(parsed.mcpServers.github.headers.Authorization, 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}');
    assert.equal(parsed.mcpServers.github.command, undefined);
    assertDoesNotContainRealCredential(firstRender);
  });

  it('renders deterministic Gemini GitHub MCP JSON config', () => {
    const firstRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedGithubMcpServers });
    const secondRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedGithubMcpServers });
    const parsed = JSON.parse(firstRender) as { mcpServers: { github: { httpUrl: string; headers: Record<string, string>; command?: string } } };

    assert.equal(firstRender, secondRender);
    assert.equal(parsed.mcpServers.github.httpUrl, 'https://api.githubcopilot.com/mcp/');
    assert.equal(parsed.mcpServers.github.headers.Authorization, 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}');
    assert.equal(parsed.mcpServers.github.command, undefined);
    assertDoesNotContainRealCredential(firstRender);
  });
});

function assertDoesNotContainRealCredential(contents: string): void {
  assert.doesNotMatch(contents, /ghp_[A-Za-z0-9_]+/);
  assert.doesNotMatch(contents, /github_pat_[A-Za-z0-9_]+/);
}
