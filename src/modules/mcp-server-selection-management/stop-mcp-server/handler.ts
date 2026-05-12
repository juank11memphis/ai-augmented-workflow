import fs from 'node:fs';
import path from 'node:path';

import { cancel, isCancel, log, select } from '@clack/prompts';

import { STATE_RELATIVE_PATH } from '../../../shared/catalog.js';
import { readFileHashIfPresent, sha256 } from '../../../shared/hash.js';
import { removeUndefinedFields } from '../../../shared/object.js';
import { getProjectContext } from '../../../shared/paths.js';
import type { ManagedFilePath, ManagedFileState, McpServerId, SelectableMcpServer, SibuState, WorkflowTarget } from '../../../shared/types.js';
import { renderMissingWorkflowFiles, resolveSelectableMcpServerById } from '../../workflow-target-planning/index.js';
import { getWorkflowMutationReadiness } from '../../workflow-mutation-readiness/index.js';
import { getTemplateVersion, readTemplateManifest } from '../../template-catalog-rendering/index.js';
import { cloneState, writeStateFile } from '../../workflow-state-registry/index.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowTargets,
} from '../../workflow-target-planning/index.js';
import type { StopMcpServerCommand } from './command.js';

type StoppedMcpSelectionResult =
  | { status: 'stopped'; state: SibuState; stoppedPaths: ManagedFilePath[]; stoppedFiles: ManagedFileState[]; serverName: string }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

type StopMcpSelectionResult =
  | { status: 'selected'; serverName: string; remainingMcpServers: SelectableMcpServer[] }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

export async function handleStopMcpServer(command: StopMcpServerCommand): Promise<void> {
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

  const result = stopSelectedMcpServer({ rootPath, state: readiness.state, serverId: command.serverId });

  switch (result.status) {
    case 'blocked':
      log.error(result.message);
      if (result.hint) {
        log.info(result.hint);
      }
      process.exitCode = 1;
      return;
    case 'noop':
      log.success(result.message);
      log.info('No files changed.');
      return;
    case 'stopped':
      writeStateFile(statePath, result.state);
      log.success(`Updated ${STATE_RELATIVE_PATH}`);
      log.success(`Stopped ${result.serverName}.`);

      for (const [index, stoppedPath] of result.stoppedPaths.entries()) {
        await askToDeleteStoppedMcpFile(stoppedPath, result.stoppedFiles[index]);
      }
      return;
  }
}

export function getNextStoppedMcpSelection(state: SibuState, serverId: string): StopMcpSelectionResult {
  const resolution = resolveSelectableMcpServerById(serverId);

  if (!resolution.ok) {
    return { status: 'blocked', message: resolution.message };
  }

  const selectedMcpServerIds = [...(state.selectedMcpServers ?? [])];

  if (!selectedMcpServerIds.includes(resolution.resolved.server.id)) {
    return { status: 'noop', message: `${resolution.resolved.server.name} is not selected.` };
  }

  return {
    status: 'selected',
    serverName: resolution.resolved.server.name,
    remainingMcpServers: selectedMcpServerIds.filter((selectedServerId) => selectedServerId !== resolution.resolved.server.id).map(getMcpServerById),
  };
}

export function stopSelectedMcpServer({ rootPath, state, serverId }: { rootPath: string; state: SibuState; serverId: string }): StoppedMcpSelectionResult {
  const selectionResult = getNextStoppedMcpSelection(state, serverId);

  if (selectionResult.status !== 'selected') {
    return selectionResult;
  }

  const selectedAgents = getSelectedAgentsFromState(state);
  const selectedLanguageSkills = getSelectedLanguageSkillsFromState(state);
  const selectedFrameworkSkills = getSelectedFrameworkSkillsFromState(state);
  const selectedArchitectureSkill = getSelectedArchitectureSkillFromState(state);
  const selectedWorkflowSkills = getSelectedWorkflowSkillsFromState(state);
  const selectedDatabaseSkills = getSelectedDatabaseSkillsFromState(state);
  const previousTargets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    getSelectedMcpServersFromState(state)
  );
  const nextTargets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectionResult.remainingMcpServers
  );
  const manifest = readTemplateManifest();
  const nextState = cloneState(state);
  const nextTargetsByPath = new Map(nextTargets.map((target) => [target.targetPath, target]));
  const stoppedPaths: ManagedFilePath[] = [];
  const stoppedFiles: ManagedFileState[] = [];

  nextState.selectedMcpServers = selectionResult.remainingMcpServers.map((server) => server.id);
  if (serverId === 'notion' && nextState.mcpServerConfigs?.notion) {
    const { notion: _notion, ...remainingMcpServerConfigs } = nextState.mcpServerConfigs;
    nextState.mcpServerConfigs = Object.keys(remainingMcpServerConfigs).length > 0 ? remainingMcpServerConfigs : undefined;
  }
  nextState.templateVersion = manifest.templateVersion;
  nextState.updatedAt = new Date().toISOString();

  for (const previousTarget of previousTargets.filter((target) => target.mcpConfigAgentId)) {
    const relativePath = path.relative(rootPath, previousTarget.targetPath);
    const managedFile = nextState.managedFiles[relativePath];

    if (!managedFile) {
      return {
        status: 'blocked',
        message: `${relativePath} is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `sibu sync` to review workflow state before stopping this MCP server.',
      };
    }

    const nextTarget = nextTargetsByPath.get(previousTarget.targetPath);

    if (nextTarget) {
      const [file] = renderMissingWorkflowFiles({
        missingTargets: [nextTarget],
        selectedLanguageSkills,
        selectedFrameworkSkills,
        selectedArchitectureSkill,
        selectedWorkflowSkills,
        selectedDatabaseSkills,
        selectedMcpServers: selectionResult.remainingMcpServers,
      });

      fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
      fs.writeFileSync(file.targetPath, file.contents, 'utf8');
      nextState.managedFiles[relativePath] = removeUndefinedFields({
        ...managedFile,
        templateVersion: getTemplateVersion(manifest, managedFile.template),
        sha256: sha256(file.contents),
        status: managedFile.status ?? 'managed',
      });
      continue;
    }

    const stoppedFile = removeUndefinedFields({
      ...managedFile,
      templateVersion: getTemplateVersion(manifest, managedFile.template),
      sha256: readFileHashIfPresent(previousTarget.targetPath) ?? managedFile.sha256,
      status: 'unmanaged' as const,
      reason: 'Stopped by `sibu mcp stop`.',
    });

    nextState.managedFiles[relativePath] = stoppedFile;
    stoppedPaths.push({ relativePath, absolutePath: previousTarget.targetPath });
    stoppedFiles.push(stoppedFile);
  }

  return { status: 'stopped', state: nextState, stoppedPaths, stoppedFiles, serverName: selectionResult.serverName };
}

export async function askToDeleteStoppedMcpFile(managedPath: ManagedFilePath, managedFile: ManagedFileState): Promise<void> {
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
      { value: 'keep', label: 'Keep file', hint: 'Recommended. Leave the local MCP config file unchanged.' },
      { value: 'delete', label: 'Delete file', hint: 'Permanently remove this file from the project.' },
    ],
  });

  if (isCancel(deleteAction)) {
    cancel('Delete prompt cancelled. The file is no longer managed, but it was not deleted.');
    process.exit(0);
  }

  const confirmDelete = deleteAction === 'delete' && hasLocalEdits(managedPath.absolutePath, managedFile) ? await askToConfirmEditedDelete(managedPath) : undefined;
  applyStoppedMcpFileDeleteDecision({ managedPath, managedFile, deleteAction, confirmDelete });
}

export function applyStoppedMcpFileDeleteDecision({
  managedPath,
  managedFile,
  deleteAction,
  confirmDelete,
}: {
  managedPath: ManagedFilePath;
  managedFile: ManagedFileState;
  deleteAction: 'keep' | 'delete';
  confirmDelete?: 'keep' | 'delete';
}): void {
  if (!fs.existsSync(managedPath.absolutePath)) {
    log.info(`${managedPath.relativePath} does not exist locally, so there is nothing to delete.`);
    return;
  }

  if (!fs.lstatSync(managedPath.absolutePath).isFile()) {
    log.warn(`${managedPath.relativePath} is not a regular file. I will not delete it.`);
    return;
  }

  if (deleteAction === 'keep') {
    log.info(`Kept ${managedPath.relativePath}.`);
    return;
  }

  if (hasLocalEdits(managedPath.absolutePath, managedFile) && confirmDelete !== 'delete') {
    log.info(`Kept ${managedPath.relativePath}.`);
    return;
  }

  fs.unlinkSync(managedPath.absolutePath);
  log.success(`Deleted ${managedPath.relativePath}.`);
}

async function askToConfirmEditedDelete(managedPath: ManagedFilePath): Promise<'keep' | 'delete'> {
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

  return confirmDelete;
}

function hasLocalEdits(filePath: string, managedFile: ManagedFileState): boolean {
  return readFileHashIfPresent(filePath) !== managedFile.sha256;
}

function getMcpServerById(serverId: McpServerId): SelectableMcpServer {
  const resolution = resolveSelectableMcpServerById(serverId);

  if (!resolution.ok) {
    throw new Error(`Unsupported MCP server in state: ${serverId}`);
  }

  return resolution.resolved.server;
}
