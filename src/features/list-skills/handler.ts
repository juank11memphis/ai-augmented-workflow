import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import { renderIntro } from '../../shared/prompts.js';
import { readStateForDoctor } from '../../shared/state.js';
import type { SibuState } from '../../shared/types.js';
import type { ListSkillsCommand } from './command.js';

type SkillListItem = {
  name: string;
  id: string;
  description: string;
  selected: boolean;
};

export async function handleListSkills(_command: ListSkillsCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Listing workflow skills'));

  const { statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);
  const state = stateResult.ok ? stateResult.state : undefined;

  if (!stateResult.ok) {
    log.warn(`${stateResult.message} Showing available skills without project selection state.`);
    log.info('Run `sibu init` before selecting project skills.');
  }

  logSkillGroup('Languages', getLanguageSkillItems(state));
  logSkillGroup('Frameworks', getFrameworkSkillItems(state));
  logSkillGroup('Architecture', getArchitectureSkillItems(state));

  outro(chalk.green('Skill list complete.'));
}

function getLanguageSkillItems(state: SibuState | undefined): SkillListItem[] {
  const selectedSkillIds = new Set(state?.selectedLanguageSkills ?? []);

  return SELECTABLE_LANGUAGE_SKILLS.map((skill) => ({
    name: skill.name,
    id: skill.id,
    description: skill.description,
    selected: selectedSkillIds.has(skill.id),
  }));
}

function getFrameworkSkillItems(state: SibuState | undefined): SkillListItem[] {
  const selectedSkillIds = new Set(state?.selectedFrameworkSkills ?? []);

  return SELECTABLE_FRAMEWORK_SKILLS.map((skill) => ({
    name: skill.name,
    id: skill.id,
    description: skill.description,
    selected: selectedSkillIds.has(skill.id),
  }));
}

function getArchitectureSkillItems(state: SibuState | undefined): SkillListItem[] {
  return SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => ({
    name: skill.name,
    id: skill.id,
    description: skill.description,
    selected: state?.selectedArchitectureSkill === skill.id,
  }));
}

function logSkillGroup(label: string, skills: SkillListItem[]): void {
  log.message(chalk.bold(label));

  for (const skill of skills) {
    const marker = skill.selected ? chalk.green('● selected') : chalk.dim('○ available');
    console.log(`  ${marker} ${chalk.bold(skill.name)} ${chalk.dim(`(${skill.id})`)}`);
    console.log(`    ${chalk.dim(skill.description)}`);
  }
}
