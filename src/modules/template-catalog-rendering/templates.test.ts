import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SELECTABLE_MCP_SERVERS } from '../workflow-target-planning/index.js';
import { readTemplate, readTemplateManifest, renderMcpConfig } from './templates.js';

const selectedGithubMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github');
const selectedNotionMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'notion');
const selectedGithubAndNotionMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github' || server.id === 'notion');

const NOTION_MCP_URL = 'https://mcp.notion.com/mcp';

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
    assert.match(firstRender, /\[mcp_servers\.github\.tools\.issue_write\]\napproval_mode = "approve"/);
    assert.match(firstRender, /\[mcp_servers\.github\.tools\.sub_issue_write\]\napproval_mode = "approve"/);
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

  it('renders deterministic Codex Notion MCP config without credentials', () => {
    const firstRender = renderMcpConfig({
      agentId: 'codex',
      baseContents: 'model_instructions_file = "../AGENTS.md"\n',
      selectedMcpServers: selectedNotionMcpServers,
    });
    const secondRender = renderMcpConfig({
      agentId: 'codex',
      baseContents: 'model_instructions_file = "../AGENTS.md"\n',
      selectedMcpServers: selectedNotionMcpServers,
    });

    assert.equal(firstRender, secondRender);
    assert.match(firstRender, /\[mcp_servers\.notion\]/);
    assert.match(firstRender, /url = "https:\/\/mcp\.notion\.com\/mcp"/);
    assertDoesNotContainRealCredential(firstRender);
    assertDoesNotContainNotionCredential(firstRender);
  });

  it('renders deterministic JSON Notion MCP config without credentials', () => {
    const claudeRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedNotionMcpServers });
    const geminiRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedNotionMcpServers });
    const parsedClaude = JSON.parse(claudeRender) as { mcpServers: { notion: { url: string; headers?: Record<string, string> } } };
    const parsedGemini = JSON.parse(geminiRender) as { mcpServers: { notion: { url: string; headers?: Record<string, string> } } };

    assert.equal(parsedClaude.mcpServers.notion.url, NOTION_MCP_URL);
    assert.equal(parsedClaude.mcpServers.notion.headers, undefined);
    assert.equal(parsedGemini.mcpServers.notion.url, NOTION_MCP_URL);
    assert.equal(parsedGemini.mcpServers.notion.headers, undefined);
    assertDoesNotContainNotionCredential(claudeRender);
    assertDoesNotContainNotionCredential(geminiRender);
  });

  it('composes GitHub and Notion MCP config for all supported agents', () => {
    const codexRender = renderMcpConfig({
      agentId: 'codex',
      baseContents: 'model_instructions_file = "../AGENTS.md"\n',
      selectedMcpServers: selectedGithubAndNotionMcpServers,
    });
    const claudeRender = renderMcpConfig({ agentId: 'claude', selectedMcpServers: selectedGithubAndNotionMcpServers });
    const geminiRender = renderMcpConfig({ agentId: 'gemini', selectedMcpServers: selectedGithubAndNotionMcpServers });
    const parsedClaude = JSON.parse(claudeRender) as { mcpServers: { github: unknown; notion: { url: string } } };
    const parsedGemini = JSON.parse(geminiRender) as { mcpServers: { github: unknown; notion: { url: string } } };

    assert.match(codexRender, /\[mcp_servers\.github\]/);
    assert.match(codexRender, /\[mcp_servers\.notion\]/);
    assert.equal(parsedClaude.mcpServers.github !== undefined, true);
    assert.equal(parsedClaude.mcpServers.notion.url, NOTION_MCP_URL);
    assert.equal(parsedGemini.mcpServers.github !== undefined, true);
    assert.equal(parsedGemini.mcpServers.notion.url, NOTION_MCP_URL);
    assertDoesNotContainRealCredential(codexRender);
    assertDoesNotContainNotionCredential(`${codexRender}\n${claudeRender}\n${geminiRender}`);
  });
});

describe('layered architecture template', () => {
  it('is registered in the manifest and readable', () => {
    const templatePath = 'skills/architecture/layered-architecture/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assert.equal(templateMetadata?.version, '1');
    assert.match(templateMetadata?.description ?? '', /Layered Architecture|lightweight architecture/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Layered Architecture/i);

    const contents = readTemplate(templatePath);

    assert.match(contents, /name: layered-architecture/);
    assert.match(contents, /controllers/i);
    assert.match(contents, /services/i);
    assert.match(contents, /models/i);
    assert.match(contents, /repositories/i);
    assert.match(contents, /not the only valid meaning/i);
  });
});

function assertDoesNotContainRealCredential(contents: string): void {
  assert.doesNotMatch(contents, /ghp_[A-Za-z0-9_]+/);
  assert.doesNotMatch(contents, /github_pat_[A-Za-z0-9_]+/);
}

function assertDoesNotContainNotionCredential(contents: string): void {
  assert.doesNotMatch(contents, /secret_[A-Za-z0-9_]+/i);
  assert.doesNotMatch(contents, /ntn_[A-Za-z0-9_]+/i);
  assert.doesNotMatch(contents, /notion[_-]?token/i);
}
