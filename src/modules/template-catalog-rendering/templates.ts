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

export type WorkerToolboxRoutingProfile = 'planner' | 'executor';

type OptionalRoutingSkill =
  | SelectableLanguageSkill
  | SelectableFrameworkSkill
  | SelectableArchitectureSkill
  | SelectableDatabaseSkill
  | SelectableWorkflowSkill;

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

  contents = renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);
  contents = renderWorkerToolboxRoutingPlaceholders(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);

  return contents;
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

export function renderWorkerToolboxRouting({
  profile,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
}: {
  profile: WorkerToolboxRoutingProfile;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
}): string {
  const selectedSkills = collectWorkerRelevantSkills({
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
  });
  const selectedSkillLines = selectedSkills.map((skill) => `- ${skill.name}: read \`${getSharedSkillTargetPath(skill)}\` when relevant. ${skill.routingInstruction}`);
  const selectedSkillsSection =
    selectedSkillLines.length > 0
      ? selectedSkillLines.join('\n')
      : '- No optional implementation-relevant Sibu skills are selected for this project. Use source artifacts and flag unmapped patterns as risks instead of guessing silently.';

  return `## Focused ${profile} worker routing

- Always read and apply \`.agents/skills/clean-code/SKILL.md\` before ${profile === 'planner' ? 'writing implementation plan steps' : 'editing code or running story execution'}.
- Read the worker toolbox skill path provided in the main-agent packet before doing work.
- Read every required skill path listed in the packet. If a required skill path is missing, stop and report the blocker to the main agent.
- Read optional installed skill paths only when they are relevant to the story, touched files, source artifacts, or validation work.
- Treat distilled skill constraints from the packet as binding task constraints.
- If an optional relevant skill is not installed and you encounter an unmapped language, framework, database, or architecture pattern, do not guess silently; continue only when safe and flag the gap as a ${profile === 'planner' ? 'plan risk' : 'Review Gate risk'}.

### Optional installed skills relevant to ${profile} work
${selectedSkillsSection}`;
}

function renderWorkerToolboxRoutingPlaceholders(
  contents: string,
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = []
): string {
  const placeholderProfiles: Array<{ placeholder: string; profile: WorkerToolboxRoutingProfile }> = [
    { placeholder: '{{PLANNER_WORKER_ROUTING}}', profile: 'planner' },
    { placeholder: '{{EXECUTOR_WORKER_ROUTING}}', profile: 'executor' },
  ];
  let renderedContents = contents;

  for (const { placeholder, profile } of placeholderProfiles) {
    if (!renderedContents.includes(placeholder)) {
      continue;
    }

    renderedContents = renderedContents.replace(
      placeholder,
      renderWorkerToolboxRouting({
        profile,
        selectedLanguageSkills,
        selectedFrameworkSkills,
        selectedArchitectureSkill,
        selectedWorkflowSkills,
        selectedDatabaseSkills,
      })
    );
  }

  return renderedContents;
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
  if (selectedMcpServers.length === 0) {
    return baseContents ?? renderJsonMcpConfig({});
  }

  if (agentId === 'codex') {
    return renderCodexMcpConfig(baseContents ?? '', selectedMcpServers);
  }

  return renderJsonMcpConfig(buildJsonMcpServerConfigs(agentId, selectedMcpServers), baseContents);
}

function collectWorkerRelevantSkills({
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills,
  selectedDatabaseSkills,
}: {
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
  selectedDatabaseSkills: SelectableDatabaseSkill[];
}): OptionalRoutingSkill[] {
  const implementationRelevantWorkflowSkills = selectedWorkflowSkills.filter((skill) =>
    skill.id === 'ai-prompt-engineer-master' || skill.id === 'ux-expert'
  );

  return [
    ...selectedLanguageSkills,
    ...selectedFrameworkSkills,
    ...selectedDatabaseSkills,
    ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : []),
    ...implementationRelevantWorkflowSkills,
  ];
}

function getSharedSkillTargetPath(skill: OptionalRoutingSkill): string {
  const sharedTargetPath = Object.values(skill.targetRelativePathsByAgent).find((targetPath) => targetPath !== undefined);

  if (!sharedTargetPath) {
    throw new Error(`Selectable skill ${skill.id} has no target path.`);
  }

  return sharedTargetPath;
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

  if (templateRelativePath === '.gemini/settings.json') {
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
    }
  | {
      url: string;
    };

function buildJsonMcpServerConfigs(agentId: Extract<AgentId, 'gemini' | 'claude'>, selectedMcpServers: SelectableMcpServer[]): Record<string, JsonMcpServerConfig> {
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
