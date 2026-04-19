import { log } from '@clack/prompts';

import { resolveSelectableSkillById } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import type {
  ArchitectureSkillId,
  EkkoState,
  FrameworkSkillId,
  LanguageSkillId,
  SelectableArchitectureSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
} from '../../shared/types.js';
import { getWorkflowMutationReadiness } from '../../shared/workflow-mutation-readiness.js';
import type { UseSkillCommand } from './command.js';

type NextSkillSelection = {
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
};

type SkillSelectionResult =
  | { status: 'selected'; selection: NextSkillSelection; skillName: string }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

export async function handleUseSkill(command: UseSkillCommand): Promise<void> {
  const { rootPath, statePath } = getProjectContext();
  const readiness = getWorkflowMutationReadiness({ rootPath, statePath });

  if (!readiness.ok) {
    log.error(readiness.message);
    log.info(readiness.hint);

    for (const preview of readiness.actionablePreviews?.slice(0, 3) ?? []) {
      log.info(`${preview.relativePath}: ${preview.status}`);
    }

    process.exitCode = 1;
    return;
  }

  const selectionResult = getNextSkillSelection(readiness.state, command.skillName);

  switch (selectionResult.status) {
    case 'noop':
      log.success(selectionResult.message);
      log.info('No files changed.');
      return;
    case 'blocked':
      log.error(selectionResult.message);
      if (selectionResult.hint) {
        log.info(selectionResult.hint);
      }
      process.exitCode = 1;
      return;
    case 'selected':
      log.info(`Skill selection for \`${selectionResult.skillName}\` is ready to apply.`);
      return;
  }
}

export function getNextSkillSelection(state: EkkoState, skillName: string): SkillSelectionResult {
  const resolution = resolveSelectableSkillById(skillName);

  if (!resolution.ok) {
    return { status: 'blocked', message: resolution.message };
  }

  const selectedLanguageSkills = [...(state.selectedLanguageSkills ?? [])];
  const selectedFrameworkSkills = [...(state.selectedFrameworkSkills ?? [])];

  switch (resolution.resolved.kind) {
    case 'language':
      if (selectedLanguageSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: [...selectedLanguageSkills, resolution.resolved.skill.id].map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
        },
      };

    case 'framework':
      if (selectedFrameworkSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: [...selectedFrameworkSkills, resolution.resolved.skill.id].map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
        },
      };

    case 'architecture':
      if (state.selectedArchitectureSkill === resolution.resolved.skill.id) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      if (state.selectedArchitectureSkill) {
        return {
          status: 'blocked',
          message: `Cannot select ${resolution.resolved.skill.name} because another architecture skill is already selected.`,
          hint: 'Architecture skill replacement is not supported yet. Keep the existing architecture skill or stop managing it first.',
        };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: resolution.resolved.skill,
        },
      };
  }
}

function getLanguageSkillById(skillId: LanguageSkillId): SelectableLanguageSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'language') {
    throw new Error(`Unsupported language skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getFrameworkSkillById(skillId: FrameworkSkillId): SelectableFrameworkSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'framework') {
    throw new Error(`Unsupported framework skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getArchitectureSkillById(skillId: ArchitectureSkillId | undefined): SelectableArchitectureSkill | undefined {
  if (!skillId) {
    return undefined;
  }

  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'architecture') {
    throw new Error(`Unsupported architecture skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}
