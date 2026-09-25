import type { SessionStartHookTemplate, SkillTemplate } from '../../shared/types.js';

export const MANDATORY_SKILLS: SkillTemplate[] = [
  {
    templateRelativePath: 'skills/clean-code/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/clean-code/SKILL.md',
      gemini: '.agents/skills/clean-code/SKILL.md',
      claude: '.agents/skills/clean-code/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [
        {
          templateRelativePath: 'scripts/check-touched-source-file-lines.mjs',
          targetRelativePath: '.agents/scripts/check-touched-source-file-lines.mjs',
        },
      ],
      gemini: [
        {
          templateRelativePath: 'scripts/check-touched-source-file-lines.mjs',
          targetRelativePath: '.agents/scripts/check-touched-source-file-lines.mjs',
        },
      ],
      claude: [
        {
          templateRelativePath: 'scripts/check-touched-source-file-lines.mjs',
          targetRelativePath: '.agents/scripts/check-touched-source-file-lines.mjs',
        },
      ],
    },
  },
  {
    templateRelativePath: 'skills/structured-logging/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/structured-logging/SKILL.md',
      gemini: '.agents/skills/structured-logging/SKILL.md',
      claude: '.agents/skills/structured-logging/SKILL.md',
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
    templateRelativePath: 'skills/business-domain-model-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/business-domain-model-writer/SKILL.md',
      gemini: '.agents/skills/business-domain-model-writer/SKILL.md',
      claude: '.agents/skills/business-domain-model-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/capabilities-map-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/capabilities-map-writer/SKILL.md',
      gemini: '.agents/skills/capabilities-map-writer/SKILL.md',
      claude: '.agents/skills/capabilities-map-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/software-architecture-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/software-architecture-writer/SKILL.md',
      gemini: '.agents/skills/software-architecture-writer/SKILL.md',
      claude: '.agents/skills/software-architecture-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/business-requirements-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/business-requirements-writer/SKILL.md',
      gemini: '.agents/skills/business-requirements-writer/SKILL.md',
      claude: '.agents/skills/business-requirements-writer/SKILL.md',
    },
  },
  {
    templateRelativePath: 'skills/software-design-writer/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/software-design-writer/SKILL.md',
      gemini: '.agents/skills/software-design-writer/SKILL.md',
      claude: '.agents/skills/software-design-writer/SKILL.md',
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
          templateRelativePath: 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: 'skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.codex/agents/sibu-implementation-executor.toml',
          targetRelativePath: '.codex/agents/sibu-implementation-executor.toml',
        },
        {
          templateRelativePath: '.codex/agents/sibu-architecture-reviewer.toml',
          targetRelativePath: '.codex/agents/sibu-architecture-reviewer.toml',
        },
        {
          templateRelativePath: '.codex/agents/sibu-technical-lead-reviewer.toml',
          targetRelativePath: '.codex/agents/sibu-technical-lead-reviewer.toml',
        },
      ],
      gemini: [
        {
          templateRelativePath: 'skills/ai-implementation-executor-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
        },
        {
          templateRelativePath: 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: 'skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.gemini/agents/sibu-implementation-executor.md',
          targetRelativePath: '.gemini/agents/sibu-implementation-executor.md',
        },
        {
          templateRelativePath: '.gemini/agents/sibu-architecture-reviewer.md',
          targetRelativePath: '.gemini/agents/sibu-architecture-reviewer.md',
        },
        {
          templateRelativePath: '.gemini/agents/sibu-technical-lead-reviewer.md',
          targetRelativePath: '.gemini/agents/sibu-technical-lead-reviewer.md',
        },
      ],
      claude: [
        {
          templateRelativePath: 'skills/ai-implementation-executor-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
        },
        {
          templateRelativePath: 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: 'skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
          targetRelativePath: '.agents/skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
        },
        {
          templateRelativePath: '.claude/agents/sibu-implementation-executor.md',
          targetRelativePath: '.claude/agents/sibu-implementation-executor.md',
        },
        {
          templateRelativePath: '.claude/agents/sibu-architecture-reviewer.md',
          targetRelativePath: '.claude/agents/sibu-architecture-reviewer.md',
        },
        {
          templateRelativePath: '.claude/agents/sibu-technical-lead-reviewer.md',
          targetRelativePath: '.claude/agents/sibu-technical-lead-reviewer.md',
        },
      ],
    },
  },
  {
    templateRelativePath: 'skills/eval-authoring/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/eval-authoring/SKILL.md',
      gemini: '.agents/skills/eval-authoring/SKILL.md',
      claude: '.agents/skills/eval-authoring/SKILL.md',
    },
    supplementalTargetsByAgent: {
      codex: [{
        templateRelativePath: 'skills/eval-authoring/references/version-2-contract.md',
        targetRelativePath: '.agents/skills/eval-authoring/references/version-2-contract.md',
      }],
      gemini: [{
        templateRelativePath: 'skills/eval-authoring/references/version-2-contract.md',
        targetRelativePath: '.agents/skills/eval-authoring/references/version-2-contract.md',
      }],
      claude: [{
        templateRelativePath: 'skills/eval-authoring/references/version-2-contract.md',
        targetRelativePath: '.agents/skills/eval-authoring/references/version-2-contract.md',
      }],
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
