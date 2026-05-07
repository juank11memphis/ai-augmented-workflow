import fs from 'node:fs';
import path from 'node:path';

import { log } from '@clack/prompts';

import { STATE_RELATIVE_PATH } from '../../../shared/catalog.js';
import { getProjectContext } from '../../../shared/paths.js';
import { getWorkflowMutationReadiness } from '../../workflow-mutation-readiness/index.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowTargets,
  renderMissingWorkflowFiles,
  resolveSelectableMcpServerById,
  writeSibuState,
} from '../../workflow-target-planning/index.js';
import type { McpServerId, SelectableMcpServer, SibuState, WorkflowTarget } from '../../../shared/types.js';
import type { UseMcpServerCommand } from './command.js';

type McpSelectionResult =
  | { status: 'selected'; serverName: string; selectedMcpServers: SelectableMcpServer[] }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

export async function handleUseMcpServer(command: UseMcpServerCommand): Promise<void> {
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

  const selectionResult = getNextMcpSelection(readiness.state, command.serverId);

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
      applySelectedMcpServer({ rootPath, statePath, state: readiness.state, selectionResult });
      return;
  }
}

export function getNextMcpSelection(state: SibuState, serverId: string): McpSelectionResult {
  const resolution = resolveSelectableMcpServerById(serverId);

  if (!resolution.ok) {
    return { status: 'blocked', message: resolution.message };
  }

  const selectedMcpServerIds = [...(state.selectedMcpServers ?? [])];

  if (selectedMcpServerIds.includes(resolution.resolved.server.id)) {
    return { status: 'noop', message: `${resolution.resolved.server.name} is already selected.` };
  }

  return {
    status: 'selected',
    serverName: resolution.resolved.server.name,
    selectedMcpServers: [...selectedMcpServerIds, resolution.resolved.server.id].map(getMcpServerById),
  };
}

function applySelectedMcpServer({
  rootPath,
  statePath,
  state,
  selectionResult,
}: {
  rootPath: string;
  statePath: string;
  state: SibuState;
  selectionResult: Extract<McpSelectionResult, { status: 'selected' }>;
}): void {
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
  const targets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectionResult.selectedMcpServers
  );
  const affectedTargets = getAffectedMcpTargets(previousTargets, targets);
  const preflightError = getMcpUsePreflightError({ rootPath, state, affectedTargets, previousTargets });

  if (preflightError) {
    log.error(preflightError);
    log.info('Run `sibu sync` to review workflow state before selecting an MCP server.');
    process.exitCode = 1;
    return;
  }

  const files = renderMissingWorkflowFiles({
    missingTargets: affectedTargets,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers: selectionResult.selectedMcpServers,
  });

  for (const file of files) {
    const fileAlreadyExists = fs.existsSync(file.targetPath);
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
    log.success(`${fileAlreadyExists ? 'Updated' : 'Created'} ${file.label}`);
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
    selectedMcpServers: selectionResult.selectedMcpServers,
    targets,
  });

  log.success(`Updated ${STATE_RELATIVE_PATH}`);
  log.success(`Added ${selectionResult.serverName}.`);
  log.info('Sibu configured MCP files only; prerequisites, credentials, and provider authentication remain user-owned.');
}

function getAffectedMcpTargets(previousTargets: WorkflowTarget[], targets: WorkflowTarget[]): WorkflowTarget[] {
  const previousTargetPaths = new Set(previousTargets.map((target) => target.targetPath));

  return targets.filter((target) => target.mcpConfigAgentId || (!previousTargetPaths.has(target.targetPath) && target.targetKind === 'mcp-config'));
}

function getMcpUsePreflightError({
  rootPath,
  state,
  affectedTargets,
  previousTargets,
}: {
  rootPath: string;
  state: SibuState;
  affectedTargets: WorkflowTarget[];
  previousTargets: WorkflowTarget[];
}): string | undefined {
  const previousTargetPaths = new Set(previousTargets.map((target) => target.targetPath));

  for (const target of affectedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);

    if (previousTargetPaths.has(target.targetPath)) {
      if (!state.managedFiles[relativePath]) {
        return `${relativePath} is not recorded in ${STATE_RELATIVE_PATH}.`;
      }
      continue;
    }

    if (fs.existsSync(target.targetPath)) {
      return `${relativePath} already exists but is not recorded for this MCP selection.`;
    }
  }

  return undefined;
}

function getMcpServerById(serverId: McpServerId): SelectableMcpServer {
  const resolution = resolveSelectableMcpServerById(serverId);

  if (!resolution.ok) {
    throw new Error(`Unsupported MCP server in state: ${serverId}`);
  }

  return resolution.resolved.server;
}
