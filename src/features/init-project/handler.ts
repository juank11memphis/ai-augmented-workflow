import fs from 'node:fs';
import path from 'node:path';

import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import { askForArchitectureSkill, askForFrameworkSkills, askForLanguageSkills, askForProjectOverview, askForSupportedAgents, askForWorkflowSkills, renderIntro } from '../../shared/prompts.js';
import { readStateForDoctor } from '../../shared/state.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../modules/workflow-target-planning/index.js';
import type { InitProjectCommand } from './command.js';

export async function handleInitProject(_command: InitProjectCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Setting up Sibu'));

  const { rootPath, statePath } = getProjectContext();

  if (fs.existsSync(statePath)) {
    const stateResult = readStateForDoctor(statePath);

    if (stateResult.ok) {
      log.success('This project is already initialized with Sibu.');
      log.info('Run `sibu doctor` for a read-only health check.');
      log.info('Run `sibu sync` to review template updates, missing files, or workflow changes.');
      outro(chalk.green('Setup already complete.'));
      return;
    }

    log.error(stateResult.message);
    log.info(`${STATE_RELATIVE_PATH} already exists, so I will not overwrite it from init.`);
    log.info('Fix or restore the state file before running `sibu doctor` or `sibu sync`.');
    outro(chalk.yellow('Setup needs attention.'));
    process.exitCode = 1;
    return;
  }

  const selectedAgents = await askForSupportedAgents();
  const selectedLanguageSkills = await askForLanguageSkills();
  const selectedFrameworkSkills = await askForFrameworkSkills();
  const selectedArchitectureSkill = await askForArchitectureSkill();
  const selectedWorkflowSkills = await askForWorkflowSkills();
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills);
  const missingTargets = targets.filter((target) => !fs.existsSync(target.targetPath));

  log.message('I will create this project’s initial AI workflow files.');
  for (const target of targets) {
    if (fs.existsSync(target.targetPath)) {
      log.info(`${target.label} already exists. I will keep it unchanged and record it in ${STATE_RELATIVE_PATH}.`);
    } else {
      log.info(`${target.label} is missing. I will create it.`);
    }
  }

  log.info(`${STATE_RELATIVE_PATH} is missing. I will create it.`);

  const shouldAskForOverview = missingTargets.some((target) => target.requiresProjectOverview);
  const overview = shouldAskForOverview ? await askForProjectOverview() : undefined;
  const files = renderMissingWorkflowFiles({
    missingTargets,
    overview,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    log.success(`Created ${file.label}`);
  }

  writeSibuState({ rootPath, statePath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, targets });
  log.success(`Created ${STATE_RELATIVE_PATH}`);

  outro(chalk.green('Setup complete.'));
}
