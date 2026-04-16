import fs from 'node:fs';

import { cancel, intro, isCancel, log, outro, select } from '@clack/prompts';
import chalk from 'chalk';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { readFileHashIfPresent } from '../../shared/hash.js';
import { getProjectContext, resolveManagedFilePath } from '../../shared/paths.js';
import { renderIntro } from '../../shared/prompts.js';
import { cloneState, readStateForDoctor, writeStateFile } from '../../shared/state.js';
import type { EkkoState, ManagedFilePath, ManagedFileState } from '../../shared/types.js';
import { removeUndefinedFields } from '../../shared/object.js';
import type { StopManagingFileCommand } from './command.js';

export async function handleStopManagingFile({ file }: StopManagingFileCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Stopping file management'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `ekko init` before managing workflow file state.');
    outro(chalk.yellow('File management unavailable.'));
    process.exitCode = 1;
    return;
  }

  const managedPath = resolveManagedFilePath(rootPath, file);
  const managedFile = stateResult.state.managedFiles[managedPath.relativePath];

  if (!managedFile) {
    log.error(`${managedPath.relativePath} is not recorded in ${STATE_RELATIVE_PATH}.`);
    log.info('Run `ekko doctor` to see currently managed workflow files.');
    outro(chalk.yellow('No file management changed.'));
    process.exitCode = 1;
    return;
  }

  const nextState = cloneState(stateResult.state);
  const currentHash = readFileHashIfPresent(managedPath.absolutePath);

  nextState.managedFiles[managedPath.relativePath] = removeUndefinedFields({
    ...managedFile,
    sha256: currentHash ?? managedFile.sha256,
    status: 'unmanaged',
    reason: 'Stopped by `ekko manage stop`.',
  });
  clearSelectedSkillForStoppedFile(nextState, managedFile);
  nextState.updatedAt = new Date().toISOString();
  writeStateFile(statePath, nextState);

  if (managedFile.status === 'unmanaged') {
    log.info(`${managedPath.relativePath} was already unmanaged.`);
  } else {
    log.success(`Stopped managing ${managedPath.relativePath}.`);
  }

  await askToDeleteStoppedFile(managedPath, managedFile);
  outro(chalk.green('File management updated.'));
}

function clearSelectedSkillForStoppedFile(state: EkkoState, managedFile: ManagedFileState): void {
  const languageSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.templateRelativePath === managedFile.template);

  if (languageSkill && state.selectedLanguageSkills?.includes(languageSkill.id)) {
    state.selectedLanguageSkills = state.selectedLanguageSkills.filter((skillId) => skillId !== languageSkill.id);
    log.info(`Removed ${languageSkill.id} from selected language skills.`);
  }


  const frameworkSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.templateRelativePath === managedFile.template);

  if (frameworkSkill && state.selectedFrameworkSkills?.includes(frameworkSkill.id)) {
    state.selectedFrameworkSkills = state.selectedFrameworkSkills.filter((skillId) => skillId !== frameworkSkill.id);
    log.info(`Removed ${frameworkSkill.id} from selected framework skills.`);
  }

  const architectureSkill = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.templateRelativePath === managedFile.template);

  if (architectureSkill && state.selectedArchitectureSkill === architectureSkill.id) {
    delete state.selectedArchitectureSkill;
    log.info(`Removed ${architectureSkill.id} as the selected architecture skill.`);
  }
}

async function askToDeleteStoppedFile(managedPath: ManagedFilePath, managedFile: ManagedFileState): Promise<void> {
  if (!fs.existsSync(managedPath.absolutePath)) {
    log.info(`${managedPath.relativePath} does not exist locally, so there is nothing to delete.`);
    return;
  }

  if (!fs.lstatSync(managedPath.absolutePath).isFile()) {
    log.warn(`${managedPath.relativePath} is not a regular file. I will not delete it.`);
    return;
  }

  const deleteAction = await select<'keep' | 'delete'>({
    message: `Do you also want to delete ${managedPath.relativePath} for good?`,
    options: [
      { value: 'keep', label: 'Keep file', hint: 'Recommended. Leave the local file unchanged.' },
      { value: 'delete', label: 'Delete file', hint: 'Permanently remove this file from the project.' },
    ],
  });

  if (isCancel(deleteAction)) {
    cancel('Delete prompt cancelled. The file is no longer managed, but it was not deleted.');
    process.exit(0);
  }

  if (deleteAction === 'keep') {
    log.info(`Kept ${managedPath.relativePath}.`);
    return;
  }

  if (hasLocalEdits(managedPath.absolutePath, managedFile)) {
    const confirmDelete = await select<'keep' | 'delete'>({
      message: `${managedPath.relativePath} differs from the last Ekko-recorded hash. Delete it anyway?`,
      options: [
        { value: 'keep', label: 'Keep file', hint: 'Recommended. Preserve local edits.' },
        { value: 'delete', label: 'Delete anyway', hint: 'Permanently remove the edited file.' },
      ],
    });

    if (isCancel(confirmDelete)) {
      cancel('Delete prompt cancelled. The file is no longer managed, but it was not deleted.');
      process.exit(0);
    }

    if (confirmDelete === 'keep') {
      log.info(`Kept ${managedPath.relativePath}.`);
      return;
    }
  }

  fs.unlinkSync(managedPath.absolutePath);
  log.success(`Deleted ${managedPath.relativePath}.`);
}

function hasLocalEdits(filePath: string, managedFile: ManagedFileState): boolean {
  return readFileHashIfPresent(filePath) !== managedFile.sha256;
}
