import type {
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableMcpServerResolutionResult,
  SelectableSkillResolutionResult,
  SelectableWorkflowSkill,
  SkillTemplate,
  McpServerId,
  WorkflowSkillId,
  SupportedAgent,
  SessionStartHookTemplate,
} from '../../shared/types.js';

export const MANDATORY_SKILLS: SkillTemplate[] = [
  {
    templateRelativePath: 'skills/clean-code/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/clean-code/SKILL.md',
      gemini: '.agents/skills/clean-code/SKILL.md',
      claude: '.agents/skills/clean-code/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/product-vision-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/product-vision-writer/SKILL.md',
      gemini: '.agents/skills/product-vision-writer/SKILL.md',
      claude: '.agents/skills/product-vision-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/deep-module-map-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/deep-module-map-writer/SKILL.md',
      gemini: '.agents/skills/deep-module-map-writer/SKILL.md',
      claude: '.agents/skills/deep-module-map-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/feature-brief-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/feature-brief-writer/SKILL.md',
      gemini: '.agents/skills/feature-brief-writer/SKILL.md',
      claude: '.agents/skills/feature-brief-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/technical-design-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/technical-design-writer/SKILL.md',
      gemini: '.agents/skills/technical-design-writer/SKILL.md',
      claude: '.agents/skills/technical-design-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/scrum-master-planner/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/scrum-master-planner/SKILL.md',
      gemini: '.agents/skills/scrum-master-planner/SKILL.md',
      claude: '.agents/skills/scrum-master-planner/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/ai-implementation-planner/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-implementation-planner/SKILL.md',
      gemini: '.agents/skills/ai-implementation-planner/SKILL.md',
      claude: '.agents/skills/ai-implementation-planner/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [
        {
          templateRelativePath: 'skills/ai-implementation-planner-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-planner-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.codex/agents/sibu-implementation-planner.toml',
          targetRelativePath: '.codex/agents/sibu-implementation-planner.toml',
        },
      ],
      gemini: [
        {
          templateRelativePath: 'skills/ai-implementation-planner-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-planner-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.gemini/agents/sibu-implementation-planner.md',
          targetRelativePath: '.gemini/agents/sibu-implementation-planner.md',
        },
      ],
      claude: [
        {
          templateRelativePath: 'skills/ai-implementation-planner-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-planner-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.claude/agents/sibu-implementation-planner.md',
          targetRelativePath: '.claude/agents/sibu-implementation-planner.md',
        },
      ],
    },
  },
  {
    templateRelativePath: 'skills/ai-implementation-plan-executor/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      gemini: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      claude: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [
        {
          templateRelativePath: 'skills/ai-implementation-executor-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.codex/agents/sibu-implementation-executor.toml',
          targetRelativePath: '.codex/agents/sibu-implementation-executor.toml',
        },
      ],
      gemini: [
        {
          templateRelativePath: 'skills/ai-implementation-executor-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.gemini/agents/sibu-implementation-executor.md',
          targetRelativePath: '.gemini/agents/sibu-implementation-executor.md',
        },
      ],
      claude: [
        {
          templateRelativePath: 'skills/ai-implementation-executor-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.claude/agents/sibu-implementation-executor.md',
          targetRelativePath: '.claude/agents/sibu-implementation-executor.md',
        },
      ],
    },
  },
  {
    templateRelativePath: 'skills/feature-idea-capture/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/feature-idea-capture/SKILL.md',
      gemini: '.agents/skills/feature-idea-capture/SKILL.md',
      claude: '.agents/skills/feature-idea-capture/SKILL.md',
    },
  },
];

export const SESSION_START_HOOKS: SessionStartHookTemplate[] = [
  {
    agentId: 'codex',
    templateRelativePath: '.codex/hooks.json',
    targetRelativePath: '.codex/hooks.json',
  },
  {
    agentId: 'gemini',
    templateRelativePath: '.gemini/settings.json',
    targetRelativePath: '.gemini/settings.json',
  },
  {
    agentId: 'claude',
    templateRelativePath: '.claude/settings.json',
    targetRelativePath: '.claude/settings.json',
  },
];


export const SELECTABLE_LANGUAGE_SKILLS: SelectableLanguageSkill[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Install practical guidance for writing and modifying .ts and .tsx files',
    routingInstruction: 'For any task that changes `.ts` or `.tsx` files, also use `typescript`.',
    templateRelativePath: 'skills/typescript/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/typescript/SKILL.md',
      gemini: '.agents/skills/typescript/SKILL.md',
      claude: '.agents/skills/typescript/SKILL.md',
    },
  },
  {
    id: 'golang',
    name: 'Go',
    description: 'Install practical guidance for writing and modifying .go files',
    routingInstruction: 'For any task that changes `.go` files, also use `golang`.',
    templateRelativePath: 'skills/golang/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/golang/SKILL.md',
      gemini: '.agents/skills/golang/SKILL.md',
      claude: '.agents/skills/golang/SKILL.md',
    },
  },
];


export const SELECTABLE_DATABASE_SKILLS: SelectableDatabaseSkill[] = [
  {
    id: 'postgresql-expert',
    name: 'PostgreSQL Expert',
    description: 'Install practical guidance for PostgreSQL schema design, migrations, constraints, queries, indexing, and database tradeoffs',
    routingInstruction:
      'For PostgreSQL schema design, migrations, constraints, queries, indexing, or database tradeoffs, use `postgresql-expert`.',
    templateRelativePath: 'skills/postgresql-expert/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/postgresql-expert/SKILL.md',
      gemini: '.agents/skills/postgresql-expert/SKILL.md',
      claude: '.agents/skills/postgresql-expert/SKILL.md',
    },
  },
];

export const SELECTABLE_FRAMEWORK_SKILLS: SelectableFrameworkSkill[] = [
  {
    id: 'react',
    name: 'React',
    description: 'Install guidance for React components, props, state ownership, and component boundaries',
    routingInstruction:
      'For React component changes involving responsibility, props, state ownership, or presentational/data-owning boundaries, use `react`.',
    templateRelativePath: 'skills/react/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/react/SKILL.md',
      gemini: '.agents/skills/react/SKILL.md',
      claude: '.agents/skills/react/SKILL.md',
    },
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Install guidance for Next.js App Router and framework-specific files',
    routingInstruction:
      'For Next.js App Router or framework-specific changes—`src/app/**`, pages, layouts, route handlers, loading/error/not-found files, metadata, or Server/Client boundaries—use `nextjs`.',
    templateRelativePath: 'skills/nextjs/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/nextjs/SKILL.md',
      gemini: '.agents/skills/nextjs/SKILL.md',
      claude: '.agents/skills/nextjs/SKILL.md',
    },
  },
];

export const SELECTABLE_ARCHITECTURE_SKILLS: SelectableArchitectureSkill[] = [
  {
    id: 'ddd-hexagonal',
    name: 'DDD + Hexagonal Architecture',
    description: 'Choose for complex back-end domains that need DDD, ports/adapters, and strict inward dependencies',
    routingInstruction:
      'For backend features, refactors, bug fixes, persistence, external integrations, application/service boundaries, domain modeling, or architectural tradeoffs, use `ddd-hexagonal`.',
    templateRelativePath: 'skills/architecture/ddd-hexagonal/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ddd-hexagonal/SKILL.md',
      gemini: '.agents/skills/ddd-hexagonal/SKILL.md',
      claude: '.agents/skills/ddd-hexagonal/SKILL.md',
    },
  },
  {
    id: 'command-pattern',
    name: 'Command Pattern',
    description: 'Choose for workflow-heavy apps that need executable operations structured as commands and handlers',
    routingInstruction:
      'For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.',
    templateRelativePath: 'skills/architecture/command-pattern/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/command-pattern/SKILL.md',
      gemini: '.agents/skills/command-pattern/SKILL.md',
      claude: '.agents/skills/command-pattern/SKILL.md',
    },
  },
  {
    id: 'layered-architecture',
    name: 'Layered Architecture',
    description: 'Choose for smaller apps that need lightweight separation with controllers, services, models, and repositories',
    routingInstruction:
      'For smaller apps that need lightweight separation of concerns with controllers, services, models, and repositories, use `layered-architecture`.',
    templateRelativePath: 'skills/architecture/layered-architecture/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/layered-architecture/SKILL.md',
      gemini: '.agents/skills/layered-architecture/SKILL.md',
      claude: '.agents/skills/layered-architecture/SKILL.md',
    },
  },
];

export const SELECTABLE_WORKFLOW_SKILLS: SelectableWorkflowSkill[] = [
  {
    id: 'ai-prompt-engineer-master',
    name: 'AI Prompt Engineer Master',
    description: 'Install guidance for creating, rewriting, optimizing, compressing, and evaluating AI prompts',
    routingInstruction:
      'For prompt creation, rewriting, optimization, compression, evaluation, or reusable templates for AI models, agents, tools, coding assistants, or product workflows, use `ai-prompt-engineer-master`.',
    templateRelativePath: 'skills/ai-prompt-engineer-master/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
      gemini: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
      claude: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
    },
  },
  {
    id: 'ux-expert',
    name: 'UX Expert',
    description: 'Install senior UX/UI guidance for UI-changing features, responsive layouts, flows, states, accessibility, and binding mockups',
    routingInstruction:
      'For UX/UI design after product definition for UI-changing features, use `ux-expert`; downstream design, planning, and implementation must treat `docs/features/<feature-slug>/ux.md` mockups as binding UI goals, not redesign targets.',
    templateRelativePath: 'skills/ux-expert/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ux-expert/SKILL.md',
      gemini: '.agents/skills/ux-expert/SKILL.md',
      claude: '.agents/skills/ux-expert/SKILL.md',
    },
  },
  {
    id: 'export-to-github',
    name: 'Export to GitHub',
    description: "Install guidance for exporting a named feature's Epics and User Stories to GitHub using the configured GitHub MCP server",
    routingInstruction:
      "For exporting a feature's Epics and User Stories to GitHub issues or sub-issues, use `export-to-github`.",
    templateRelativePath: 'skills/export-to-github/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/export-to-github/SKILL.md',
      gemini: '.agents/skills/export-to-github/SKILL.md',
      claude: '.agents/skills/export-to-github/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [
        {
          templateRelativePath: '.codex/agents/github-exporter.toml',
          targetRelativePath: '.codex/agents/github-exporter.toml',
        },
      ],
      gemini: [
        {
          templateRelativePath: '.gemini/agents/github-exporter.md',
          targetRelativePath: '.gemini/agents/github-exporter.md',
        },
      ],
      claude: [
        {
          templateRelativePath: '.claude/agents/github-exporter.md',
          targetRelativePath: '.claude/agents/github-exporter.md',
        },
      ],
    },
  },
  {
    id: 'export-to-notion',
    name: 'Export to Notion',
    description: "Install guidance for exporting a named feature's feature brief, UX design, and technical design to Notion using the configured Notion MCP server",
    routingInstruction:
      "For exporting a feature's feature brief, UX design, or technical design to Notion, use `export-to-notion`.",
    templateRelativePath: 'skills/export-to-notion/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/export-to-notion/SKILL.md',
      gemini: '.agents/skills/export-to-notion/SKILL.md',
      claude: '.agents/skills/export-to-notion/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [
        {
          templateRelativePath: '.codex/agents/notion-exporter.toml',
          targetRelativePath: '.codex/agents/notion-exporter.toml',
        },
      ],
      gemini: [
        {
          templateRelativePath: '.gemini/agents/notion-exporter.md',
          targetRelativePath: '.gemini/agents/notion-exporter.md',
        },
      ],
      claude: [
        {
          templateRelativePath: '.claude/agents/notion-exporter.md',
          targetRelativePath: '.claude/agents/notion-exporter.md',
        },
      ],
    },
  },
];


const EXPORT_WORKFLOW_SKILL_MCP_REQUIREMENTS: Record<Extract<WorkflowSkillId, 'export-to-github' | 'export-to-notion'>, McpServerId> = {
  'export-to-github': 'github',
  'export-to-notion': 'notion',
};

export function getMcpServersRequiredByWorkflowSkills(workflowSkillIds: WorkflowSkillId[]): SelectableMcpServer[] {
  const requiredServerIds = new Set<McpServerId>();

  for (const workflowSkillId of workflowSkillIds) {
    const requiredServerId = getRequiredMcpServerIdForWorkflowSkill(workflowSkillId);

    if (requiredServerId) {
      requiredServerIds.add(requiredServerId);
    }
  }

  return SELECTABLE_MCP_SERVERS.filter((server) => requiredServerIds.has(server.id));
}

export function getWorkflowSkillsImpliedByMcpServers(mcpServerIds: McpServerId[]): SelectableWorkflowSkill[] {
  const selectedServerIds = new Set(mcpServerIds);
  const impliedSkillIds = Object.entries(EXPORT_WORKFLOW_SKILL_MCP_REQUIREMENTS)
    .filter(([, requiredServerId]) => selectedServerIds.has(requiredServerId))
    .map(([workflowSkillId]) => workflowSkillId as WorkflowSkillId);

  return SELECTABLE_WORKFLOW_SKILLS.filter((skill) => impliedSkillIds.includes(skill.id));
}

function getRequiredMcpServerIdForWorkflowSkill(workflowSkillId: WorkflowSkillId): McpServerId | undefined {
  if (workflowSkillId === 'export-to-github' || workflowSkillId === 'export-to-notion') {
    return EXPORT_WORKFLOW_SKILL_MCP_REQUIREMENTS[workflowSkillId];
  }

  return undefined;
}

export const SELECTABLE_MCP_SERVERS: SelectableMcpServer[] = [
  {
    id: 'github',
    name: 'GitHub MCP Server',
    description:
      "Configure GitHub's official MCP server; Sibu writes config only, while prerequisites, runtime availability, credentials, and authentication remain user-owned",
    source: 'github/github-mcp-server',
  },
  {
    id: 'notion',
    name: 'Notion MCP Server',
    description:
      'Configure Notion MCP server access; Sibu writes config only, while OAuth authentication, workspace access, page permissions, and credentials remain user-owned',
    source: 'developers.notion.com/guides/mcp',
  },
];

export const SUPPORTED_AGENTS: SupportedAgent[] = [
  {
    id: 'codex',
    name: 'Codex',
    description: 'Create .codex/config.toml pointing Codex to AGENTS.md',
    targetRelativePath: '.codex/config.toml',
    templateRelativePath: '.codex/config.toml',
    supportsForegroundWorkers: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Create GEMINI.md that delegates to AGENTS.md',
    targetRelativePath: 'GEMINI.md',
    templateRelativePath: 'GEMINI.md',
    supportsForegroundWorkers: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Create CLAUDE.md that delegates to AGENTS.md',
    targetRelativePath: 'CLAUDE.md',
    templateRelativePath: 'CLAUDE.md',
    supportsForegroundWorkers: true,
  },
];

export function resolveSelectableMcpServerById(serverId: string): SelectableMcpServerResolutionResult {
  const server = SELECTABLE_MCP_SERVERS.find((selectableServer) => selectableServer.id === serverId);

  if (server) {
    return { ok: true, resolved: { server } };
  }

  return { ok: false, message: `Unknown MCP server \`${serverId}\`. Run \`sibu mcp list\` to see available MCP servers.` };
}

export function resolveSelectableSkillById(skillId: string): SelectableSkillResolutionResult {
  const languageSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.id === skillId);
  if (languageSkill) {
    return { ok: true, resolved: { kind: 'language', skill: languageSkill } };
  }

  const frameworkSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.id === skillId);
  if (frameworkSkill) {
    return { ok: true, resolved: { kind: 'framework', skill: frameworkSkill } };
  }

  const databaseSkill = SELECTABLE_DATABASE_SKILLS.find((skill) => skill.id === skillId);
  if (databaseSkill) {
    return { ok: true, resolved: { kind: 'database', skill: databaseSkill } };
  }

  const architectureSkill = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === skillId);
  if (architectureSkill) {
    return { ok: true, resolved: { kind: 'architecture', skill: architectureSkill } };
  }

  const workflowSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === skillId);
  if (workflowSkill) {
    return { ok: true, resolved: { kind: 'workflow', skill: workflowSkill } };
  }

  return { ok: false, message: `Unknown skill \`${skillId}\`. Run \`sibu skills list\` to see available skills.` };
}
