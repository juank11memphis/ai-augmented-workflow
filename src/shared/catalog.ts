import type {
  NpmVersionLookupMode,
  SelectableArchitectureSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableSkillResolutionResult,
  SelectableWorkflowSkill,
  SkillTemplate,
  SupportedAgent,
} from './types.js';

export const SIBU_PACKAGE_NAME = '@juancr11/sibu';
export const SIBU_VERSION = '0.1.0';
export const STATE_RELATIVE_PATH = '.sibu/state.json';
export const NPM_VERSION_LOOKUP_MODE_ENV = 'SIBU_NPM_LOOKUP_MODE';
export const NPM_VERSION_OVERRIDE_ENV = 'SIBU_NPM_LATEST_VERSION';
export const SIBU_CACHE_HOME_ENV = 'SIBU_CACHE_HOME';
export const SUPPORTED_NPM_LOOKUP_MODES: NpmVersionLookupMode[] = ['live', 'offline'];

export const MANDATORY_SKILLS: SkillTemplate[] = [
  {
    templateRelativePath: 'skills/clean-code/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/clean-code/SKILL.md',
      gemini: '.agents/skills/clean-code/SKILL.md',
      claude: '.agents/skills/clean-code/SKILL.md',
      windsurf: '.agents/skills/clean-code/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/product-vision-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/product-vision-writer/SKILL.md',
      gemini: '.agents/skills/product-vision-writer/SKILL.md',
      claude: '.agents/skills/product-vision-writer/SKILL.md',
      windsurf: '.agents/skills/product-vision-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/feature-brief-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/feature-brief-writer/SKILL.md',
      gemini: '.agents/skills/feature-brief-writer/SKILL.md',
      claude: '.agents/skills/feature-brief-writer/SKILL.md',
      windsurf: '.agents/skills/feature-brief-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/technical-design-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/technical-design-writer/SKILL.md',
      gemini: '.agents/skills/technical-design-writer/SKILL.md',
      claude: '.agents/skills/technical-design-writer/SKILL.md',
      windsurf: '.agents/skills/technical-design-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/scrum-master-planner/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/scrum-master-planner/SKILL.md',
      gemini: '.agents/skills/scrum-master-planner/SKILL.md',
      claude: '.agents/skills/scrum-master-planner/SKILL.md',
      windsurf: '.agents/skills/scrum-master-planner/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/ai-implementation-planner/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-implementation-planner/SKILL.md',
      gemini: '.agents/skills/ai-implementation-planner/SKILL.md',
      claude: '.agents/skills/ai-implementation-planner/SKILL.md',
      windsurf: '.agents/skills/ai-implementation-planner/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/ai-implementation-plan-executor/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      gemini: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      claude: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      windsurf: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
    },
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
      windsurf: '.agents/skills/typescript/SKILL.md',
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
      windsurf: '.agents/skills/golang/SKILL.md',
    },
  },
];

export const SELECTABLE_FRAMEWORK_SKILLS: SelectableFrameworkSkill[] = [
  {
    id: 'react',
    name: 'React',
    description: 'Install guidance for React components, props, state ownership, and component boundaries',
    routingInstruction:
      'For tasks that create or change React components, component responsibility, props, state ownership, or presentational vs data-owning boundaries, use `react`.',
    templateRelativePath: 'skills/react/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/react/SKILL.md',
      gemini: '.agents/skills/react/SKILL.md',
      claude: '.agents/skills/react/SKILL.md',
      windsurf: '.agents/skills/react/SKILL.md',
    },
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Install guidance for Next.js App Router and framework-specific files',
    routingInstruction:
      'For tasks that change Next.js App Router or framework-specific files, including `src/app/**`, pages, layouts, route handlers, loading/error/not-found files, metadata, or Server/Client Component boundaries, use `nextjs`.',
    templateRelativePath: 'skills/nextjs/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/nextjs/SKILL.md',
      gemini: '.agents/skills/nextjs/SKILL.md',
      claude: '.agents/skills/nextjs/SKILL.md',
      windsurf: '.agents/skills/nextjs/SKILL.md',
    },
  },
];

export const SELECTABLE_ARCHITECTURE_SKILLS: SelectableArchitectureSkill[] = [
  {
    id: 'ddd-hexagonal',
    name: 'DDD + Hexagonal Architecture',
    description: 'Install back-end architecture guidance for DDD, ports/adapters, and inward dependencies',
    routingInstruction:
      'For any back-end work, use `ddd-hexagonal`. This includes new features, refactors, bug fixes, persistence, external integrations, application/service boundaries, domain modeling, and architectural tradeoffs.',
    templateRelativePath: 'skills/architecture/ddd-hexagonal/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ddd-hexagonal/SKILL.md',
      gemini: '.agents/skills/ddd-hexagonal/SKILL.md',
      claude: '.agents/skills/ddd-hexagonal/SKILL.md',
      windsurf: '.agents/skills/ddd-hexagonal/SKILL.md',
    },
  },
  {
    id: 'command-pattern',
    name: 'Command Pattern',
    description: 'Install architecture guidance for structuring executable operations as commands and handlers',
    routingInstruction:
      'For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.',
    templateRelativePath: 'skills/architecture/command-pattern/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/command-pattern/SKILL.md',
      gemini: '.agents/skills/command-pattern/SKILL.md',
      claude: '.agents/skills/command-pattern/SKILL.md',
      windsurf: '.agents/skills/command-pattern/SKILL.md',
    },
  },
];

export const SELECTABLE_WORKFLOW_SKILLS: SelectableWorkflowSkill[] = [
  {
    id: 'ai-prompt-engineer-master',
    name: 'AI Prompt Engineer Master',
    description: 'Install guidance for creating, rewriting, optimizing, compressing, and evaluating AI prompts',
    routingInstruction:
      'For requests to create, rewrite, optimize, compress, evaluate, or systematize prompts for AI models, agents, tools, coding assistants, product workflows, or reusable prompt templates, use `ai-prompt-engineer-master`.',
    templateRelativePath: 'skills/ai-prompt-engineer-master/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
      gemini: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
      claude: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
      windsurf: '.agents/skills/ai-prompt-engineer-master/SKILL.md',
    },
  },
  {
    id: 'ux-expert',
    name: 'UX Expert',
    description: 'Install senior UX/UI guidance for UI-changing features, responsive layouts, flows, states, accessibility, and binding mockups',
    routingInstruction:
      'For UX/UI design after product definition when a feature has UI changes, use `ux-expert`; downstream technical design, Scrum planning, implementation planning, and implementation must treat mockups in `docs/features/<feature-slug>/ux.md` as binding UI goals, not redesign targets.',
    templateRelativePath: 'skills/ux-expert/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ux-expert/SKILL.md',
      gemini: '.agents/skills/ux-expert/SKILL.md',
      claude: '.agents/skills/ux-expert/SKILL.md',
      windsurf: '.agents/skills/ux-expert/SKILL.md',
    },
  },
];

export const SUPPORTED_AGENTS: SupportedAgent[] = [
  {
    id: 'codex',
    name: 'Codex',
    description: 'Create .codex/config.toml pointing Codex to AGENTS.md',
    targetRelativePath: '.codex/config.toml',
    templateRelativePath: '.codex/config.toml',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Create GEMINI.md that delegates to AGENTS.md',
    targetRelativePath: 'GEMINI.md',
    templateRelativePath: 'GEMINI.md',
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Create CLAUDE.md that delegates to AGENTS.md',
    targetRelativePath: 'CLAUDE.md',
    templateRelativePath: 'CLAUDE.md',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Use root AGENTS.md and shared .agents/skills/ discovery',
  },
];

export function resolveSelectableSkillById(skillId: string): SelectableSkillResolutionResult {
  const languageSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.id === skillId);
  if (languageSkill) {
    return { ok: true, resolved: { kind: 'language', skill: languageSkill } };
  }

  const frameworkSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.id === skillId);
  if (frameworkSkill) {
    return { ok: true, resolved: { kind: 'framework', skill: frameworkSkill } };
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
