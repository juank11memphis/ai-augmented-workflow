import assert from 'node:assert/strict';
import { it } from 'node:test';

import { SELECTABLE_MCP_SERVERS, renderTemplateForSync } from './index.js';

it('delegates MCP config templates while preserving rendered output shape', () => {
  const rendered = renderTemplateForSync({
    templateRelativePath: 'mcp/claude/.mcp.json',
    currentPath: 'missing-agents.md',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github'),
  });
  const parsed = JSON.parse(rendered) as { mcpServers?: { github?: { url?: string; headers?: Record<string, string> } } };

  assert.equal(parsed.mcpServers?.github?.url, 'https://api.githubcopilot.com/mcp/');
  assert.equal(parsed.mcpServers?.github?.headers?.Authorization, 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}');
});
