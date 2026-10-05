import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../workflow-state-ledger/state-path.js';
import { getProjectContext } from '../../shared/paths.js';
import { checkForLatestSibuVersion, getNpmVersionAdvisoryLines } from '../../support/version-advisory/index.js';
import type { NpmVersionCheckResult } from '../../shared/types.js';
import { askForMissingFrameworkSkills, askForNewArchitectureSkill, askForNewLanguageSkills, renderIntro } from '../../support/interactive-guidance/index.js';
import { readStateForDoctor, writeStateFile } from '../workflow-state-ledger/index.js';
import { readTemplateManifest } from '../template-catalog/index.js';
import { askForSyncAction, askForUnsupportedAgentCleanup } from './action-prompt.js';
import { applySyncAction } from './apply-action.js';
import type { SyncProjectCommand } from './command.js';
import { logSyncPreview } from './log-preview.js';
import { getSyncPreviews, isActionableSyncPreview, shouldAskForSyncAction } from './sync-preview.js';
import { applyUnsupportedAgentCleanup, getUnsupportedAgentCleanupPlan } from './unsupported-agent-cleanup.js';
import { reviewProjectModelRoutes } from './model-route-review-adapters.js';
import { askForModelRouteReview, formatModelRouteReview } from './model-route-review-prompt.js';
import type { ModelRouteReviewNotice, ModelRouteReviewResult } from './model-route-review-result.js';

type SyncProjectDependencies = {
  renderIntro: typeof renderIntro;
  askForUnsupportedAgentCleanup: typeof askForUnsupportedAgentCleanup;
  askForNewLanguageSkills: typeof askForNewLanguageSkills;
  askForMissingFrameworkSkills: typeof askForMissingFrameworkSkills;
  askForNewArchitectureSkill: typeof askForNewArchitectureSkill;
  askForSyncAction: typeof askForSyncAction;
  askForModelRouteReview: typeof askForModelRouteReview;
  reviewProjectModelRoutes: typeof reviewProjectModelRoutes;
  checkForLatestSibuVersion: typeof checkForLatestSibuVersion;
};

const defaultSyncProjectDependencies: SyncProjectDependencies = {
  renderIntro,
  askForUnsupportedAgentCleanup,
  askForNewLanguageSkills,
  askForMissingFrameworkSkills,
  askForNewArchitectureSkill,
  askForSyncAction,
  askForModelRouteReview,
  reviewProjectModelRoutes,
  checkForLatestSibuVersion,
};

export async function handleSyncProject(_command: SyncProjectCommand, dependencies: Partial<SyncProjectDependencies> = {}): Promise<void> {
  const syncDependencies = { ...defaultSyncProjectDependencies, ...dependencies };

  await syncDependencies.renderIntro();
  intro(chalk.cyan('Reviewing workflow updates'));
  try {
    const version = await syncDependencies.checkForLatestSibuVersion();
    for (const line of getSyncVersionAdvisoryLines(version)) log.info(line);
  } catch { /* Update advice must not block template review. */ }

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
    log.success('No template updates or local template changes need review.');

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
      log.info('No template files changed.');
    }

    const routesReviewed = await reviewRoutes(rootPath, syncDependencies);
    outro(routesReviewed ? chalk.green('Sync complete.') : chalk.yellow('Sync review incomplete.'));
    if (!routesReviewed) process.exitCode = 1;
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

  const routesReviewed = await reviewRoutes(rootPath, syncDependencies);
  outro(routesReviewed ? chalk.green('Sync complete.') : chalk.yellow('Sync review incomplete.'));
  if (!routesReviewed) process.exitCode = 1;
}

export function getSyncVersionAdvisoryLines(result: NpmVersionCheckResult): string[] {
  const lines = getNpmVersionAdvisoryLines(result);
  return lines.length ? [...lines, 'Sync reviews project files; updating Sibu is how you get Sibu Evals fixes.'] : [];
}

async function reviewRoutes(rootPath: string, dependencies: SyncProjectDependencies): Promise<boolean> {
  let preview = dependencies.reviewProjectModelRoutes({ type: 'preview' }, rootPath);
  if (preview.status !== 'preview') {
    log.warn('Model recommendation review is unavailable. Saved routes were not changed.');
    return false;
  }
  if (preview.reviewUnavailable) log.warn('Some older model guidance cannot be compared. Saved routes were not changed.');
  let reviewUnavailable = preview.reviewUnavailable;
  const reviewedKeys = new Set<string>();
  const refreshedKeys = new Set<string>();
  while (preview.status === 'preview') {
    const notice: ModelRouteReviewNotice | undefined = preview.notices.find((item) =>
      !reviewedKeys.has(`${item.route.agentEnvironment}:${item.route.role}:${item.route.workloadClass}`));
    if (!notice) return !reviewUnavailable;
    const key = `${notice.route.agentEnvironment}:${notice.route.role}:${notice.route.workloadClass}`;
    reviewedKeys.add(key);
    log.info(formatModelRouteReview(notice));
    const choice = await dependencies.askForModelRouteReview(notice);
    const result: ModelRouteReviewResult = dependencies.reviewProjectModelRoutes({ type: 'decide', choice,
      route: notice.route, catalogVersion: notice.catalogVersion, stateBasis: notice.stateBasis }, rootPath);
    if (result.status === 'retained') log.success('Saved route kept.');
    else if (result.status === 'replaced') log.success('New recommendation saved.');
    else if (result.status === 'later') log.info('Review later. Saved route unchanged.');
    else if (result.status === 'conflict') {
      log.warn('Route or catalog changed. Review the refreshed recommendation before deciding.');
      if (refreshedKeys.has(key)) return false;
      refreshedKeys.add(key);
      reviewedKeys.delete(key);
    }
    else {
      log.error('Could not save the route decision. Retry sync or review later; the saved route was not changed.');
      return false;
    }
    preview = dependencies.reviewProjectModelRoutes({ type: 'preview' }, rootPath);
    if (preview.status === 'preview') reviewUnavailable ||= preview.reviewUnavailable;
  }
  return false;
}
