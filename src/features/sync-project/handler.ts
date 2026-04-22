import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { getProjectContext } from '../../shared/paths.js';
import { askForMissingFrameworkSkills, askForNewArchitectureSkill, askForNewLanguageSkills, renderIntro } from '../../shared/prompts.js';
import { readStateForDoctor, writeStateFile } from '../../shared/state.js';
import { readTemplateManifest } from '../../shared/templates.js';
import { askForSyncAction } from './action-prompt.js';
import { applySyncAction } from './apply-action.js';
import type { SyncProjectCommand } from './command.js';
import { logSyncPreview } from './log-preview.js';
import { getSyncPreviews, isActionableSyncPreview, shouldAskForSyncAction } from './preview.js';

export async function handleSyncProject(_command: SyncProjectCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Previewing workflow sync'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `sibu init` before syncing so I know which files are managed.');
    outro(chalk.yellow('Workflow sync unavailable.'));
    process.exitCode = 1;
    return;
  }

  const languageSkillSelection = await askForNewLanguageSkills(stateResult.state);
  const frameworkSkillSelection = await askForMissingFrameworkSkills(languageSkillSelection.state);
  const architectureSkillSelection = await askForNewArchitectureSkill(frameworkSkillSelection.state);
  let state = architectureSkillSelection.state;
  const manifest = readTemplateManifest();
  const previews = getSyncPreviews({ rootPath, state, manifest });
  const actionablePreviews = previews.filter(isActionableSyncPreview);

  if (actionablePreviews.length === 0) {
    log.success('No template updates or local drift detected.');

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

    outro(chalk.green('Workflow loop already in sync.'));
    return;
  }

  log.warn('Workflow sync found items to review.');

  let changedState = languageSkillSelection.changedState || frameworkSkillSelection.changedState || architectureSkillSelection.changedState;
  let changedFiles = false;

  for (const preview of previews) {
    logSyncPreview(preview);

    if (!shouldAskForSyncAction(preview)) {
      continue;
    }

    const action = await askForSyncAction(preview);

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

  outro(chalk.green('Workflow sync complete.'));
}
