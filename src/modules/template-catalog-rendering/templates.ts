import fs from 'node:fs';
import path from 'node:path';

import { getTemplatesPath } from '../../shared/paths.js';
import type {
  AgentId,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  TemplateManifest,
} from '../../shared/types.js';

export function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(getTemplatesPath(), relativePath), 'utf8');
}

export function readTemplateManifest(): TemplateManifest {
  const manifest = JSON.parse(fs.readFileSync(path.join(getTemplatesPath(), 'manifest.json'), 'utf8')) as unknown;

  if (!isTemplateManifest(manifest)) {
    throw new Error('templates/manifest.json is not a valid template manifest.');
  }

  return manifest;
}

export function getTemplateVersion(manifest: TemplateManifest, templateRelativePath: string): string {
  const template = manifest.templates[templateRelativePath];

  if (!template) {
    throw new Error(`Template ${templateRelativePath} is missing from templates/manifest.json.`);
  }

  return template.version;
}

export function renderTemplateForSync({
  templateRelativePath,
  currentPath,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers = [],
}: {
  templateRelativePath: string;
  currentPath: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
}): string {
  let contents = readTemplate(templateRelativePath);

  const mcpConfigAgentId = getMcpConfigAgentId(templateRelativePath);
  if (mcpConfigAgentId) {
    return renderMcpConfig({ agentId: mcpConfigAgentId, baseContents: contents, selectedMcpServers });
  }

  if (contents.includes('{{PROJECT_OVERVIEW}}')) {
    contents = contents.replace('{{PROJECT_OVERVIEW}}', extractProjectOverview(currentPath) ?? 'Describe this project.');
  }

  return renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);
}

export function renderSkillRouting(
  contents: string,
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = []
): string {
  if (!contents.includes('{{OPTIONAL_SKILL_ROUTING}}')) {
    return contents;
  }

  const optionalRouting = [...selectedLanguageSkills, ...selectedFrameworkSkills, ...selectedDatabaseSkills, ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : []), ...selectedWorkflowSkills]
    .map((skill) => `- ${skill.routingInstruction}`)
    .join('\n');

  return contents.replace('{{OPTIONAL_SKILL_ROUTING}}', optionalRouting);
}

export function renderMcpConfig({
  agentId,
  baseContents,
  selectedMcpServers,
}: {
  agentId: Extract<AgentId, 'codex' | 'gemini' | 'claude'>;
  baseContents?: string;
  selectedMcpServers: SelectableMcpServer[];
}): string {
  const githubServer = selectedMcpServers.find((server) => server.id === 'github');

  if (!githubServer) {
    return baseContents ?? renderJsonMcpConfig({});
  }

  if (agentId === 'codex') {
    return renderCodexGithubMcpConfig(baseContents ?? '');
  }

  return renderJsonMcpConfig({
    github: buildGithubMcpServerConfig(agentId),
  });
}

export function extractProjectOverview(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(/## Project overview\s+([\s\S]*?)(?=\n## |$)/);
  const overview = match?.[1]?.trim();
  return overview || undefined;
}

function renderCodexGithubMcpConfig(baseContents: string): string {
  const trimmedBaseContents = baseContents.trimEnd();
  const separator = trimmedBaseContents ? '\n\n' : '';

  return `${trimmedBaseContents}${separator}[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"
`;
}

function getMcpConfigAgentId(templateRelativePath: string): Extract<AgentId, 'codex' | 'gemini' | 'claude'> | undefined {
  if (templateRelativePath === '.codex/config.toml') {
    return 'codex';
  }

  if (templateRelativePath === 'mcp/claude/.mcp.json') {
    return 'claude';
  }

  if (templateRelativePath === 'mcp/gemini/settings.json') {
    return 'gemini';
  }

  return undefined;
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
    };

function buildGithubMcpServerConfig(agentId: Extract<AgentId, 'gemini' | 'claude'>): JsonMcpServerConfig {
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

function renderJsonMcpConfig(mcpServers: Record<string, JsonMcpServerConfig>): string {
  return `${JSON.stringify({ mcpServers }, null, 2)}\n`;
}

function isTemplateManifest(value: unknown): value is TemplateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<TemplateManifest>;

  return (
    typeof manifest.templateVersion === 'string' &&
    !!manifest.templates &&
    typeof manifest.templates === 'object' &&
    Object.values(manifest.templates).every(
      (template) =>
        !!template &&
        typeof template === 'object' &&
        typeof template.version === 'string' &&
        typeof template.description === 'string' &&
        Array.isArray(template.changes) &&
        template.changes.every((change) => typeof change === 'string')
    )
  );
}
