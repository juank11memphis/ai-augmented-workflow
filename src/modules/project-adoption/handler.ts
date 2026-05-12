import fs from 'node:fs';
import path from 'node:path';

import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import {
  askForArchitectureSkill,
  askForDatabaseSkills,
  askForFrameworkSkills,
  askForLanguageSkills,
  askForMcpServers,
  askForNotionDocsParentPage,
  askForProjectOverview,
  askForSupportedAgents,
  askForWorkflowSkills,
  renderIntro,
} from '../interactive-guidance/index.js';
import { readStateForDoctor } from '../workflow-state-registry/index.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../workflow-target-planning/index.js';
import type { InitProjectCommand } from './command.js';
import type {
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  SupportedAgent,
} from '../../shared/types.js';

type InitProjectDependencies = {
  renderIntro: () => Promise<void>;
  askForSupportedAgents: () => Promise<SupportedAgent[]>;
  askForMcpServers: () => Promise<SelectableMcpServer[]>;
  askForNotionDocsParentPage: () => Promise<string>;
  askForLanguageSkills: () => Promise<SelectableLanguageSkill[]>;
  askForFrameworkSkills: () => Promise<SelectableFrameworkSkill[]>;
  askForDatabaseSkills: () => Promise<SelectableDatabaseSkill[]>;
  askForArchitectureSkill: () => Promise<SelectableArchitectureSkill | undefined>;
  askForWorkflowSkills: () => Promise<SelectableWorkflowSkill[]>;
  askForProjectOverview: () => Promise<string>;
};

const defaultDependencies: InitProjectDependencies = {
  renderIntro,
  askForSupportedAgents,
  askForMcpServers,
  askForNotionDocsParentPage,
  askForLanguageSkills,
  askForFrameworkSkills,
  askForDatabaseSkills,
  askForArchitectureSkill,
  askForWorkflowSkills,
  askForProjectOverview,
};

export async function handleInitProject(_command: InitProjectCommand, dependencies: InitProjectDependencies = defaultDependencies): Promise<void> {
  await dependencies.renderIntro();
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

  const selectedAgents = await dependencies.askForSupportedAgents();
  const selectedMcpServers = await dependencies.askForMcpServers();
  const notionDocsParentPage = selectedMcpServers.some((server) => server.id === 'notion') ? await dependencies.askForNotionDocsParentPage() : undefined;
  const selectedLanguageSkills = await dependencies.askForLanguageSkills();
  const selectedFrameworkSkills = await dependencies.askForFrameworkSkills();
  const selectedDatabaseSkills = await dependencies.askForDatabaseSkills();
  const selectedArchitectureSkill = await dependencies.askForArchitectureSkill();
  const selectedWorkflowSkills = await dependencies.askForWorkflowSkills();
  const targets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers
  );
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
  const overview = shouldAskForOverview ? await dependencies.askForProjectOverview() : undefined;
  const files = renderMissingWorkflowFiles({
    missingTargets,
    overview,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    log.success(`Created ${file.label}`);
  }

  writeSibuState({
    rootPath,
    statePath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers,
    mcpServerConfigs: notionDocsParentPage ? { notion: { docsParentPage: notionDocsParentPage } } : undefined,
    targets,
  });
  log.success(`Created ${STATE_RELATIVE_PATH}`);

  outro(chalk.green('Setup complete.'));
}
