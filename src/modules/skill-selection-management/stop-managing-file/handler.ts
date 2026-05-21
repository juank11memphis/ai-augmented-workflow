import fs from 'node:fs';
import path from 'node:path';

import { cancel, intro, isCancel, log, outro, select } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../../shared/catalog.js';
import { resolveSelectableSkillById } from '../../workflow-target-planning/index.js';
import { readFileHashIfPresent, sha256 } from '../../../shared/hash.js';
import { getProjectContext } from '../../../shared/paths.js';
import { renderIntro } from '../../interactive-guidance/index.js';
import { cloneState, readStateForDoctor, writeStateFile } from '../../workflow-state-registry/index.js';
import { getTemplateVersion, readTemplateManifest, renderTemplateForSync } from '../../template-catalog-rendering/index.js';
import type { SibuState, ManagedFilePath, ManagedFileState, ResolvedSelectableSkill } from '../../../shared/types.js';
import { removeUndefinedFields } from '../../../shared/object.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedWorkflowSkillsFromState,
  getSkillTargetsForAgents,
} from '../../workflow-target-planning/index.js';
import type { StopManagingFileCommand } from './command.js';

export type StopSkillResult =
  | { status: 'stopped'; state: SibuState; stoppedPaths: ManagedFilePath[]; stoppedFiles: ManagedFileState[]; skillName: string }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

export async function handleStopManagingFile({ skillName }: StopManagingFileCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Updating skill management'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `sibu init` before managing workflow skill state.');
    outro(chalk.yellow('Skill update unavailable.'));
    process.exitCode = 1;
    return;
  }

  const result = stopSelectedSkill({ rootPath, state: stateResult.state, skillName });

  switch (result.status) {
    case 'blocked':
      log.error(result.message);
      if (result.hint) {
        log.info(result.hint);
      }
      outro(chalk.yellow('Nothing changed.'));
      process.exitCode = 1;
      return;
    case 'noop':
      log.success(result.message);
      log.info('No files changed.');
      outro(chalk.green('Skill selection is already up to date.'));
      return;
    case 'stopped':
      writeStateFile(statePath, result.state);
      for (const stoppedPath of result.stoppedPaths) {
        log.success(`Stopped managing ${stoppedPath.relativePath}.`);
      }
      log.success('Updated AGENTS.md skill routing.');
      log.success(`Updated ${STATE_RELATIVE_PATH}.`);

      for (const [index, stoppedPath] of result.stoppedPaths.entries()) {
        await askToDeleteStoppedFile(stoppedPath, result.stoppedFiles[index]);
      }

      outro(chalk.green(`Updated ${result.skillName}.`));
      return;
  }
}

export function stopSelectedSkill({ rootPath, state, skillName }: { rootPath: string; state: SibuState; skillName: string }): StopSkillResult {
  const resolution = resolveSelectableSkillById(skillName);

  if (!resolution.ok) {
    return { status: 'blocked', message: resolution.message, hint: 'Use `sibu skills stop <skill_name>` with a selectable skill id from `sibu skills list`.' };
  }

  if (!isSkillSelected(state, resolution.resolved)) {
    return { status: 'noop', message: `${resolution.resolved.skill.name} is not selected.` };
  }

  const stoppedPaths = getSkillManagedPaths(rootPath, state, resolution.resolved);

  if (stoppedPaths.length === 0) {
    return { status: 'blocked', message: `${resolution.resolved.skill.name} does not have a managed target for the selected agents.` };
  }

  const nextState = cloneState(state);
  const stoppedFiles: ManagedFileState[] = [];

  for (const stoppedPath of stoppedPaths) {
    const managedFile = nextState.managedFiles[stoppedPath.relativePath];

    if (!managedFile) {
      return {
        status: 'blocked',
        message: `${stoppedPath.relativePath} is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `sibu sync` to review workflow state before stopping this skill.',
      };
    }

    const currentHash = readFileHashIfPresent(stoppedPath.absolutePath);
    const stoppedFile = removeUndefinedFields({
      ...managedFile,
      sha256: currentHash ?? managedFile.sha256,
      status: 'unmanaged' as const,
      reason: 'Stopped by `sibu skills stop`.',
    });

    nextState.managedFiles[stoppedPath.relativePath] = stoppedFile;
    stoppedFiles.push(stoppedFile);
  }

  removeSelectedSkill(nextState, resolution.resolved);

  const agentsUpdate = getAgentsUpdate(rootPath, nextState);
  if (!agentsUpdate.ok) {
    return { status: 'blocked', message: agentsUpdate.message, hint: 'Run `sibu sync` to review workflow state before stopping this skill.' };
  }

  fs.writeFileSync(agentsUpdate.path, agentsUpdate.contents, 'utf8');
  const manifest = readTemplateManifest();
  nextState.templateVersion = manifest.templateVersion;
  nextState.updatedAt = new Date().toISOString();
  nextState.managedFiles['AGENTS.md'] = removeUndefinedFields({
    ...agentsUpdate.managedFile,
    templateVersion: getTemplateVersion(manifest, agentsUpdate.managedFile.template),
    sha256: sha256(agentsUpdate.contents),
    status: agentsUpdate.managedFile.status ?? 'managed',
  });

  return { status: 'stopped', state: nextState, stoppedPaths, stoppedFiles, skillName: resolution.resolved.skill.name };
}

function isSkillSelected(state: SibuState, resolved: ResolvedSelectableSkill): boolean {
  switch (resolved.kind) {
    case 'language':
      return state.selectedLanguageSkills?.includes(resolved.skill.id) ?? false;
    case 'framework':
      return state.selectedFrameworkSkills?.includes(resolved.skill.id) ?? false;
    case 'architecture':
      return state.selectedArchitectureSkill === resolved.skill.id;
    case 'database':
      return state.selectedDatabaseSkills?.includes(resolved.skill.id) ?? false;
    case 'workflow':
      return state.selectedWorkflowSkills?.includes(resolved.skill.id) ?? false;
  }
}

function removeSelectedSkill(state: SibuState, resolved: ResolvedSelectableSkill): void {
  switch (resolved.kind) {
    case 'language':
      state.selectedLanguageSkills = (state.selectedLanguageSkills ?? []).filter((skillId) => skillId !== resolved.skill.id);
      return;
    case 'framework':
      state.selectedFrameworkSkills = (state.selectedFrameworkSkills ?? []).filter((skillId) => skillId !== resolved.skill.id);
      return;
    case 'architecture':
      delete state.selectedArchitectureSkill;
      return;
    case 'database':
      state.selectedDatabaseSkills = (state.selectedDatabaseSkills ?? []).filter((skillId) => skillId !== resolved.skill.id);
      return;
    case 'workflow':
      state.selectedWorkflowSkills = (state.selectedWorkflowSkills ?? []).filter((skillId) => skillId !== resolved.skill.id);
      return;
  }
}

function getSkillManagedPaths(rootPath: string, state: SibuState, resolved: ResolvedSelectableSkill): ManagedFilePath[] {
  const relativePaths = new Set(getSkillTargetsForAgents(resolved.skill, getSelectedAgentsFromState(state)).map((target) => target.targetRelativePath));

  return [...relativePaths].map((relativePath) => ({
    relativePath,
    absolutePath: path.join(rootPath, relativePath),
  }));
}

type AgentsUpdateResult =
  | { ok: true; path: string; contents: string; managedFile: ManagedFileState }
  | { ok: false; message: string };

function getAgentsUpdate(rootPath: string, state: SibuState): AgentsUpdateResult {
  const agentsRelativePath = 'AGENTS.md';
  const agentsPath = path.join(rootPath, agentsRelativePath);
  const managedFile = state.managedFiles[agentsRelativePath];

  if (!managedFile) {
    return { ok: false, message: 'AGENTS.md is not recorded in `.sibu/state.json`.' };
  }

  if (!fs.existsSync(agentsPath)) {
    return { ok: false, message: 'AGENTS.md is missing.' };
  }

  const currentHash = sha256(fs.readFileSync(agentsPath, 'utf8'));
  if (currentHash !== managedFile.sha256) {
    return { ok: false, message: 'AGENTS.md has changed since Sibu last recorded it.' };
  }

  return {
    ok: true,
    path: agentsPath,
    managedFile,
    contents: renderTemplateForSync({
      templateRelativePath: managedFile.template,
      currentPath: agentsPath,
      selectedLanguageSkills: getSelectedLanguageSkillsFromState(state),
      selectedFrameworkSkills: getSelectedFrameworkSkillsFromState(state),
      selectedArchitectureSkill: getSelectedArchitectureSkillFromState(state),
      selectedWorkflowSkills: getSelectedWorkflowSkillsFromState(state),
      selectedDatabaseSkills: getSelectedDatabaseSkillsFromState(state),
    }),
  };
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
      message: `${managedPath.relativePath} differs from the last Sibu-recorded hash. Delete it anyway?`,
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
