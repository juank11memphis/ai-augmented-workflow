import path from 'node:path';

import {
  MANDATORY_SKILLS,
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  SESSION_START_HOOKS,
  SUPPORTED_AGENTS,
} from '../modules/template-catalog/catalog.js';
import { getMcpConfigTargetsForAgents } from '../modules/agent-tool-configuration/index.js';
import type {
  SibuState,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  SkillTemplate,
  SupportedAgent,
  WorkflowTarget,
} from '../shared/types.js';

type SkillTarget = {
  targetRelativePath: string;
  templateRelativePath: string;
};

export function getSelectedLanguageSkillsFromState(state: SibuState): SelectableLanguageSkill[] {
  return SELECTABLE_LANGUAGE_SKILLS.filter((skill) => state.selectedLanguageSkills?.includes(skill.id));
}

export function getSelectedFrameworkSkillsFromState(state: SibuState): SelectableFrameworkSkill[] {
  return SELECTABLE_FRAMEWORK_SKILLS.filter((skill) => state.selectedFrameworkSkills?.includes(skill.id));
}

export function getSelectedArchitectureSkillFromState(state: SibuState): SelectableArchitectureSkill | undefined {
  return SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === state.selectedArchitectureSkill);
}

export function getSelectedWorkflowSkillsFromState(state: SibuState): SelectableWorkflowSkill[] {
  return SELECTABLE_WORKFLOW_SKILLS.filter((skill) => state.selectedWorkflowSkills?.includes(skill.id));
}

export function getSelectedDatabaseSkillsFromState(state: SibuState): SelectableDatabaseSkill[] {
  return SELECTABLE_DATABASE_SKILLS.filter((skill) => state.selectedDatabaseSkills?.includes(skill.id));
}

export function getSelectedMcpServersFromState(state: SibuState): SelectableMcpServer[] {
  return SELECTABLE_MCP_SERVERS.filter((server) => state.selectedMcpServers?.includes(server.id));
}

export function getSelectedSkillTargetsForAgents(
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = []
): SkillTarget[] {
  const skillTargets = new Map<string, SkillTarget>();
  const selectedSkills: SkillTemplate[] = [
    ...MANDATORY_SKILLS,
    ...selectedLanguageSkills,
    ...selectedFrameworkSkills,
    ...selectedDatabaseSkills,
    ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : []),
    ...selectedWorkflowSkills,
  ];

  for (const agent of selectedAgents) {
    for (const skill of selectedSkills) {
      for (const skillTarget of getSkillTargetsForAgent(skill, agent.id)) {
        skillTargets.set(skillTarget.targetRelativePath, skillTarget);
      }
    }
  }

  return [...skillTargets.values()];
}

export function getSkillTargetsForAgents(skill: SkillTemplate, selectedAgents: SupportedAgent[]): SkillTarget[] {
  const skillTargets = new Map<string, SkillTarget>();

  for (const agent of selectedAgents) {
    for (const skillTarget of getSkillTargetsForAgent(skill, agent.id)) {
      skillTargets.set(skillTarget.targetRelativePath, skillTarget);
    }
  }

  return [...skillTargets.values()];
}

function getSkillTargetsForAgent(skill: SkillTemplate, agentId: SupportedAgent['id']): SkillTarget[] {
  const targets: SkillTarget[] = [];
  const targetRelativePath = skill.targetRelativePathsByAgent[agentId];

  if (targetRelativePath) {
    targets.push({
      targetRelativePath,
      templateRelativePath: skill.templateRelativePath,
    });
  }

  for (const supplementalTarget of skill.supplementalTargetsByAgent?.[agentId] ?? []) {
    targets.push(supplementalTarget);
  }

  return targets;
}

function getSessionStartHookTargetsForAgents(selectedAgents: SupportedAgent[]): SkillTarget[] {
  const selectedAgentIds = new Set(selectedAgents.map((agent) => agent.id));

  return SESSION_START_HOOKS.filter((hookTemplate) => selectedAgentIds.has(hookTemplate.agentId)).map((hookTemplate) => ({
    targetRelativePath: hookTemplate.targetRelativePath,
    templateRelativePath: hookTemplate.templateRelativePath,
  }));
}

export function getWorkflowTargets(
  rootPath: string,
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[] = [],
  selectedFrameworkSkills: SelectableFrameworkSkill[] = [],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = [],
  selectedMcpServers: SelectableMcpServer[] = []
): WorkflowTarget[] {
  const targets: WorkflowTarget[] = [
    {
      label: 'AGENTS.md',
      targetPath: path.join(rootPath, 'AGENTS.md'),
      templateRelativePath: 'AGENTS.md',
      requiresProjectOverview: true,
      targetKind: 'agent-support',
    },
    ...selectedAgents.flatMap((agent) => {
      if (!agent.targetRelativePath || !agent.templateRelativePath) {
        return [];
      }

      return [
        {
          label: agent.targetRelativePath,
          targetPath: path.join(rootPath, agent.targetRelativePath),
          templateRelativePath: agent.templateRelativePath,
          requiresProjectOverview: false,
          targetKind: 'agent-support' as const,
        },
      ];
    }),
    ...getSelectedSkillTargetsForAgents(selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills).map((skillTarget) => ({
      label: skillTarget.targetRelativePath,
      targetPath: path.join(rootPath, skillTarget.targetRelativePath),
      templateRelativePath: skillTarget.templateRelativePath,
      requiresProjectOverview: false,
      targetKind: 'skill' as const,
    })),
    ...getSessionStartHookTargetsForAgents(selectedAgents).map((hookTarget) => ({
      label: hookTarget.targetRelativePath,
      targetPath: path.join(rootPath, hookTarget.targetRelativePath),
      templateRelativePath: hookTarget.templateRelativePath,
      requiresProjectOverview: false,
      targetKind: 'agent-support' as const,
    })),
  ];

  for (const mcpTarget of getMcpConfigTargetsForAgents(selectedAgents, selectedMcpServers)) {
    const targetPath = path.join(rootPath, mcpTarget.targetRelativePath);
    const existingTarget = targets.find((target) => target.targetPath === targetPath);

    if (existingTarget) {
      existingTarget.selectedMcpServers = selectedMcpServers;
      existingTarget.mcpConfigAgentId = mcpTarget.agentId;
      continue;
    }

    targets.push({
      label: mcpTarget.targetRelativePath,
      targetPath,
      templateRelativePath: mcpTarget.templateRelativePath,
      requiresProjectOverview: false,
      targetKind: 'mcp-config',
      mcpConfigAgentId: mcpTarget.agentId,
      selectedMcpServers,
    });
  }

  return targets;
}

export function getSelectedAgentsFromState(state: SibuState): SupportedAgent[] {
  return SUPPORTED_AGENTS.filter((agent) => state.selectedAgents.includes(agent.id));
}
