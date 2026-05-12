import fs from 'node:fs';
import path from 'node:path';

import { SIBU_VERSION } from '../version-advisory/index.js';
import {
  MANDATORY_SKILLS,
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
} from './index.js';
import { sha256 } from '../../shared/hash.js';
import { removeUndefinedFields } from '../../shared/object.js';
import { readExistingState } from '../workflow-state-registry/index.js';
import { getTemplateVersion, readTemplate, readTemplateManifest, renderMcpConfig, renderSkillRouting } from '../template-catalog-rendering/index.js';
import type {
  SibuState,
  FileToCreate,
  ManagedFileState,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  SkillTemplate,
  SupportedAgent,
  WorkflowTarget,
} from '../../shared/types.js';

type SkillTarget = {
  targetRelativePath: string;
  templateRelativePath: string;
};

type McpTarget = {
  targetRelativePath: string;
  templateRelativePath: string;
  agentId: 'codex' | 'gemini' | 'claude';
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
      const targetRelativePath = skill.targetRelativePathsByAgent[agent.id];

      if (!targetRelativePath) {
        continue;
      }

      skillTargets.set(targetRelativePath, {
        targetRelativePath,
        templateRelativePath: skill.templateRelativePath,
      });
    }
  }

  return [...skillTargets.values()];
}

export function getSelectedMcpTargetsForAgents(selectedAgents: SupportedAgent[], selectedMcpServers: SelectableMcpServer[]): McpTarget[] {
  if (selectedMcpServers.length === 0) {
    return [];
  }

  return selectedAgents.flatMap((agent): McpTarget[] => {
    if (agent.id === 'codex') {
      return [
        {
          targetRelativePath: '.codex/config.toml',
          templateRelativePath: '.codex/config.toml',
          agentId: 'codex',
        },
      ];
    }

    if (agent.id === 'claude') {
      return [
        {
          targetRelativePath: '.mcp.json',
          templateRelativePath: 'mcp/claude/.mcp.json',
          agentId: 'claude',
        },
      ];
    }

    if (agent.id === 'gemini') {
      return [
        {
          targetRelativePath: '.gemini/settings.json',
          templateRelativePath: 'mcp/gemini/settings.json',
          agentId: 'gemini',
        },
      ];
    }

    return [];
  });
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
  ];

  for (const mcpTarget of getSelectedMcpTargetsForAgents(selectedAgents, selectedMcpServers)) {
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

export function renderMissingWorkflowFiles({
  missingTargets,
  overview,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers = [],
}: {
  missingTargets: WorkflowTarget[];
  overview?: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
}): FileToCreate[] {
  return missingTargets.map((target) => {
    let contents = readTemplate(target.templateRelativePath);

    if (target.mcpConfigAgentId && (target.selectedMcpServers?.length || selectedMcpServers.length)) {
      contents = renderMcpConfig({
        agentId: target.mcpConfigAgentId,
        baseContents: contents,
        selectedMcpServers: target.selectedMcpServers ?? selectedMcpServers,
      });
    }

    if (target.requiresProjectOverview) {
      if (!overview?.trim()) {
        throw new Error('Project overview is required to create AGENTS.md.');
      }

      contents = contents.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    }

    contents = renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);

    return {
      label: target.label,
      targetPath: target.targetPath,
      contents,
    };
  });
}

export function writeSibuState({
  rootPath,
  statePath,
  selectedAgents,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers,
  targets,
}: {
  rootPath: string;
  statePath: string;
  selectedAgents: SupportedAgent[];
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
  targets: WorkflowTarget[];
}): void {
  const previousState = readExistingState(statePath);
  const now = new Date().toISOString();
  const manifest = readTemplateManifest();
  const state: SibuState = {
    sibuVersion: SIBU_VERSION,
    templateVersion: manifest.templateVersion,
    generatedAt: previousState?.generatedAt ?? now,
    updatedAt: now,
    selectedAgents: selectedAgents.map((agent) => agent.id),
    selectedLanguageSkills: selectedLanguageSkills.map((skill) => skill.id),
    selectedFrameworkSkills: selectedFrameworkSkills.map((skill) => skill.id),
    selectedArchitectureSkill: selectedArchitectureSkill?.id,
    selectedWorkflowSkills: selectedWorkflowSkills.map((skill) => skill.id),
    selectedDatabaseSkills: selectedDatabaseSkills.map((skill) => skill.id),
    ...(selectedMcpServers !== undefined ? { selectedMcpServers: selectedMcpServers.map((server) => server.id) } : {}),
    managedFiles: Object.fromEntries(
      targets
        .filter((target) => fs.existsSync(target.targetPath))
        .map((target) => {
          const relativePath = path.relative(rootPath, target.targetPath);
          const previousManagedFile = previousState?.managedFiles[relativePath];
          const nextManagedFile: ManagedFileState = {
            template: target.templateRelativePath,
            templateVersion: getTemplateVersion(manifest, target.templateRelativePath),
            sha256: sha256(fs.readFileSync(target.targetPath, 'utf8')),
            status: previousManagedFile?.status ?? 'managed',
            lastReviewedTemplateVersion: previousManagedFile?.lastReviewedTemplateVersion,
            reason: previousManagedFile?.reason,
          };

          return [relativePath, removeUndefinedFields(nextManagedFile)];
        })
    ),
  };

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function getSelectedAgentsFromState(state: SibuState): SupportedAgent[] {
  return SUPPORTED_AGENTS.filter((agent) => state.selectedAgents.includes(agent.id));
}
