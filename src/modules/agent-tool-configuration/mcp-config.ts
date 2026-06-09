import type { AgentId, SelectableMcpServer } from '../../shared/types.js';

type McpConfigAgentId = Extract<AgentId, 'codex' | 'gemini' | 'claude'>;
type JsonMcpConfigAgentId = Extract<AgentId, 'gemini' | 'claude'>;

export function renderMcpConfig({
  agentId,
  baseContents,
  selectedMcpServers,
}: {
  agentId: McpConfigAgentId;
  baseContents?: string;
  selectedMcpServers: SelectableMcpServer[];
}): string {
  if (selectedMcpServers.length === 0) {
    return baseContents ?? renderJsonMcpConfig({});
  }

  if (agentId === 'codex') {
    return renderCodexMcpConfig(baseContents ?? '', selectedMcpServers);
  }

  return renderJsonMcpConfig(buildJsonMcpServerConfigs(agentId, selectedMcpServers), baseContents);
}

export function resolveMcpConfigAgentId(templateRelativePath: string): McpConfigAgentId | undefined {
  if (templateRelativePath === '.codex/config.toml') {
    return 'codex';
  }

  if (templateRelativePath === 'mcp/claude/.mcp.json') {
    return 'claude';
  }

  if (templateRelativePath === 'mcp/gemini/settings.json') {
    return 'gemini';
  }

  if (templateRelativePath === '.gemini/settings.json') {
    return 'gemini';
  }

  return undefined;
}

function renderCodexMcpConfig(baseContents: string, selectedMcpServers: SelectableMcpServer[]): string {
  const trimmedBaseContents = baseContents.trimEnd();
  const serverConfigs = selectedMcpServers.map((server) => buildCodexMcpServerConfig(server)).filter((config) => config.length > 0);

  if (serverConfigs.length === 0) {
    return baseContents;
  }

  const separator = trimmedBaseContents ? '\n\n' : '';

  return `${trimmedBaseContents}${separator}${serverConfigs.join('\n\n')}\n`;
}

function buildCodexMcpServerConfig(server: SelectableMcpServer): string {
  if (server.id === 'github') {
    return `[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"

[mcp_servers.github.tools.issue_write]
approval_mode = "approve"

[mcp_servers.github.tools.sub_issue_write]
approval_mode = "approve"`;
  }

  if (server.id === 'notion') {
    return `[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"`;
  }

  return '';
}

type JsonMcpServerConfig =
  | {
      type: 'http';
      url: string;
      headers: Record<string, string>;
    }
  | {
      httpUrl: string;
      headers: Record<string, string>;
    }
  | {
      url: string;
    };

function buildJsonMcpServerConfigs(agentId: JsonMcpConfigAgentId, selectedMcpServers: SelectableMcpServer[]): Record<string, JsonMcpServerConfig> {
  const mcpServers: Record<string, JsonMcpServerConfig> = {};

  for (const server of selectedMcpServers) {
    if (server.id === 'github') {
      mcpServers.github = buildGithubMcpServerConfig(agentId);
    }

    if (server.id === 'notion') {
      mcpServers.notion = buildNotionMcpServerConfig();
    }
  }

  return mcpServers;
}

function buildGithubMcpServerConfig(agentId: JsonMcpConfigAgentId): JsonMcpServerConfig {
  const headers = {
    Authorization: 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}',
  };

  if (agentId === 'gemini') {
    return {
      httpUrl: 'https://api.githubcopilot.com/mcp/',
      headers,
    };
  }

  return {
    type: 'http',
    url: 'https://api.githubcopilot.com/mcp/',
    headers,
  };
}

function buildNotionMcpServerConfig(): JsonMcpServerConfig {
  return {
    url: 'https://mcp.notion.com/mcp',
  };
}

function renderJsonMcpConfig(mcpServers: Record<string, JsonMcpServerConfig>, baseContents?: string): string {
  const baseConfig = parseJsonObject(baseContents);
  baseConfig.mcpServers = mcpServers;

  return `${JSON.stringify(baseConfig, null, 2)}\n`;
}

function parseJsonObject(contents?: string): Record<string, unknown> {
  if (!contents?.trim()) {
    return {};
  }

  const parsed = JSON.parse(contents) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected JSON template to contain an object.');
  }

  return parsed as Record<string, unknown>;
}
