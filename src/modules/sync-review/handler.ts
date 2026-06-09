import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import { askForMissingFrameworkSkills, askForNewArchitectureSkill, askForNewLanguageSkills, renderIntro } from '../interactive-guidance/index.js';
import { readStateForDoctor, writeStateFile } from '../workflow-state-registry/index.js';
import { readTemplateManifest } from '../template-catalog/index.js';
import { askForSyncAction, askForUnsupportedAgentCleanup } from './action-prompt.js';
import { applySyncAction } from './apply-action.js';
import type { SyncProjectCommand } from './command.js';
import { logSyncPreview } from './log-preview.js';
import { getSyncPreviews, isActionableSyncPreview, shouldAskForSyncAction } from './sync-preview.js';
import { applyUnsupportedAgentCleanup, getUnsupportedAgentCleanupPlan } from './unsupported-agent-cleanup.js';

type SyncProjectDependencies = {
  renderIntro: typeof renderIntro;
  askForUnsupportedAgentCleanup: typeof askForUnsupportedAgentCleanup;
  askForNewLanguageSkills: typeof askForNewLanguageSkills;
  askForMissingFrameworkSkills: typeof askForMissingFrameworkSkills;
  askForNewArchitectureSkill: typeof askForNewArchitectureSkill;
  askForSyncAction: typeof askForSyncAction;
};

const defaultSyncProjectDependencies: SyncProjectDependencies = {
  renderIntro,
  askForUnsupportedAgentCleanup,
  askForNewLanguageSkills,
  askForMissingFrameworkSkills,
  askForNewArchitectureSkill,
  askForSyncAction,
};

export async function handleSyncProject(_command: SyncProjectCommand, dependencies: Partial<SyncProjectDependencies> = {}): Promise<void> {
  const syncDependencies = { ...defaultSyncProjectDependencies, ...dependencies };

  await syncDependencies.renderIntro();
  intro(chalk.cyan('Reviewing workflow updates'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `sibu init` before syncing so I know which files are managed.');
    outro(chalk.yellow('Sync unavailable.'));
    process.exitCode = 1;
    return;
  }

  const cleanupPlan = getUnsupportedAgentCleanupPlan({ rootPath, state: stateResult.state });

  if (cleanupPlan) {
    log.warn('This project has agent selections that are no longer supported by Sibu.');
    log.info(`Unsupported selections: ${cleanupPlan.unsupportedAgentIds.join(', ')}`);

    if (cleanupPlan.filePathsToDelete.length > 0) {
      log.info('Sibu-managed files to remove:');
      for (const relativePath of cleanupPlan.filePathsToDelete) {
        log.info(`- ${relativePath}`);
      }
    } else {
      log.info('No Sibu-managed files need to be deleted for this cleanup.');
    }

    if (cleanupPlan.removesSibuState) {
      log.warn(`No supported agents will remain, so ${STATE_RELATIVE_PATH} will be removed after cleanup.`);
    }

    const shouldCleanUp = await syncDependencies.askForUnsupportedAgentCleanup(cleanupPlan);

    if (!shouldCleanUp) {
      log.warn('Unsupported agent cleanup was skipped.');
      log.info('Run `sibu sync` again and accept cleanup before reviewing other workflow updates.');
      outro(chalk.yellow('Sync stopped.'));
      process.exitCode = 1;
      return;
    }

    const cleanupResult = applyUnsupportedAgentCleanup({ rootPath, statePath, state: stateResult.state, plan: cleanupPlan });

    for (const relativePath of cleanupResult.removedFiles) {
      log.success(`Removed ${relativePath}`);
    }

    if (cleanupResult.removedStateFile) {
      log.success(`Removed ${STATE_RELATIVE_PATH}`);
      outro(chalk.green('Unsupported agent cleanup complete.'));
      return;
    }

    writeStateFile(statePath, cleanupResult.state);
    log.success(`Updated ${STATE_RELATIVE_PATH}`);
    stateResult.state = cleanupResult.state;
  }

  const languageSkillSelection = await syncDependencies.askForNewLanguageSkills(stateResult.state);
  const frameworkSkillSelection = await syncDependencies.askForMissingFrameworkSkills(languageSkillSelection.state);
  const architectureSkillSelection = await syncDependencies.askForNewArchitectureSkill(frameworkSkillSelection.state);
  let state = architectureSkillSelection.state;
  const manifest = readTemplateManifest();
  const previews = getSyncPreviews({ rootPath, state, manifest });
  const actionablePreviews = previews.filter(isActionableSyncPreview);

  if (actionablePreviews.length === 0) {
    log.success('No template updates or local changes need review.');

    if (state.templateVersion !== manifest.templateVersion ||
      languageSkillSelection.changedState ||
      frameworkSkillSelection.changedState ||
      architectureSkillSelection.changedState) {
      state = {
        ...state,
        templateVersion: manifest.templateVersion,
        updatedAt: new Date().toISOString(),
      };
      writeStateFile(statePath, state);
      log.success(`Updated ${STATE_RELATIVE_PATH}`);
    } else {
      log.info('No files changed.');
    }

    outro(chalk.green('Everything is already in sync.'));
    return;
  }

  log.warn('Found workflow updates to review.');

  let changedState = languageSkillSelection.changedState || frameworkSkillSelection.changedState || architectureSkillSelection.changedState;
  let changedFiles = false;

  for (const preview of previews) {
    logSyncPreview(preview);

    if (!shouldAskForSyncAction(preview)) {
      continue;
    }

    const action = await syncDependencies.askForSyncAction(preview);

    if (action === 'skip') {
      log.info(`Skipped ${preview.relativePath}.`);
      continue;
    }

    const result = applySyncAction({ rootPath, state, manifest, preview, action });
    state = result.state;
    changedState = changedState || result.changedState;
    changedFiles = changedFiles || result.changedFiles;
  }

  if (changedState) {
    writeStateFile(statePath, state);
    log.success(`Updated ${STATE_RELATIVE_PATH}`);
  }

  if (!changedFiles && !changedState) {
    log.info('No files changed.');
  }

  outro(chalk.green('Sync complete.'));
}
