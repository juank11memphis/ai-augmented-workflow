import fs from 'node:fs';
import path from 'node:path';

import { SIBU_VERSION } from '../../shared/catalog.js';
import {
  MANDATORY_SKILLS,
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
} from './index.js';
import { sha256 } from '../../shared/hash.js';
import { removeUndefinedFields } from '../../shared/object.js';
import { readExistingState } from '../workflow-state-registry/index.js';
import { getTemplateVersion, readTemplate, readTemplateManifest, renderSkillRouting } from '../template-catalog-rendering/index.js';
import type {
  SibuState,
  FileToCreate,
  ManagedFileState,
  SelectableArchitectureSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableWorkflowSkill,
  SkillTemplate,
  SupportedAgent,
  WorkflowTarget,
} from '../../shared/types.js';

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

export function getSelectedSkillTargetsForAgents(
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = []
): SkillTarget[] {
  const skillTargets = new Map<string, SkillTarget>();
  const selectedSkills: SkillTemplate[] = [
    ...MANDATORY_SKILLS,
    ...selectedLanguageSkills,
    ...selectedFrameworkSkills,
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

export function getWorkflowTargets(
  rootPath: string,
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[] = [],
  selectedFrameworkSkills: SelectableFrameworkSkill[] = [],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = []
): WorkflowTarget[] {
  return [
    {
      label: 'AGENTS.md',
      targetPath: path.join(rootPath, 'AGENTS.md'),
      templateRelativePath: 'AGENTS.md',
      requiresProjectOverview: true,
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
        },
      ];
    }),
    ...getSelectedSkillTargetsForAgents(selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills).map((skillTarget) => ({
      label: skillTarget.targetRelativePath,
      targetPath: path.join(rootPath, skillTarget.targetRelativePath),
      templateRelativePath: skillTarget.templateRelativePath,
      requiresProjectOverview: false,
    })),
  ];
}

export function renderMissingWorkflowFiles({
  missingTargets,
  overview,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
}: {
  missingTargets: WorkflowTarget[];
  overview?: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
}): FileToCreate[] {
  return missingTargets.map((target) => {
    let contents = readTemplate(target.templateRelativePath);

    if (target.requiresProjectOverview) {
      if (!overview?.trim()) {
        throw new Error('Project overview is required to create AGENTS.md.');
      }

      contents = contents.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    }

    contents = renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills);

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
  targets,
}: {
  rootPath: string;
  statePath: string;
  selectedAgents: SupportedAgent[];
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
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
