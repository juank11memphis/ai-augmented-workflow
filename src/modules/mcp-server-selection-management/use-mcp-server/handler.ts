import fs from 'node:fs';
import path from 'node:path';
import { writeSibuState } from '../../workflow-state-ledger/index.js';

import { log } from '@clack/prompts';

import { STATE_RELATIVE_PATH } from '../../../shared/catalog.js';
import { sha256 } from '../../../shared/hash.js';
import { getProjectContext } from '../../../shared/paths.js';
import { askForNotionDocsParentPage } from '../../interactive-guidance/index.js';
import { renderTemplateForSync } from '../../template-catalog-rendering/index.js';
import { getWorkflowMutationReadiness } from '../../workflow-mutation-readiness/index.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowSkillsImpliedByMcpServers,
  getWorkflowTargets,
  renderMissingWorkflowFiles,
  resolveSelectableMcpServerById,
} from '../../workflow-target-planning/index.js';
import type { McpServerConfigs, McpServerId, SelectableMcpServer, SelectableWorkflowSkill, SibuState, WorkflowTarget } from '../../../shared/types.js';
import type { UseMcpServerCommand } from './command.js';

type McpSelectionResult =
  | { status: 'selected'; serverName: string; selectedMcpServers: SelectableMcpServer[] }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

type UseMcpServerDependencies = {
  askForNotionDocsParentPage: () => Promise<string>;
};

const defaultDependencies: UseMcpServerDependencies = {
  askForNotionDocsParentPage,
};

export async function handleUseMcpServer(command: UseMcpServerCommand, dependencies: UseMcpServerDependencies = defaultDependencies): Promise<void> {
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
    case 'selected': {
      const mcpServerConfigs = await getNextMcpServerConfigs({ state: readiness.state, selectionResult, dependencies });
      applySelectedMcpServer({ rootPath, statePath, state: readiness.state, selectionResult, mcpServerConfigs });
      return;
    }
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

async function getNextMcpServerConfigs({
  state,
  selectionResult,
  dependencies,
}: {
  state: SibuState;
  selectionResult: Extract<McpSelectionResult, { status: 'selected' }>;
  dependencies: UseMcpServerDependencies;
}): Promise<McpServerConfigs | undefined> {
  if (!selectionResult.selectedMcpServers.some((server) => server.id === 'notion') || state.selectedMcpServers?.includes('notion')) {
    return state.mcpServerConfigs;
  }

  const docsParentPage = await dependencies.askForNotionDocsParentPage();

  return {
    ...state.mcpServerConfigs,
    notion: { docsParentPage },
  };
}

function applySelectedMcpServer({
  rootPath,
  statePath,
  state,
  selectionResult,
  mcpServerConfigs,
}: {
  rootPath: string;
  statePath: string;
  state: SibuState;
  selectionResult: Extract<McpSelectionResult, { status: 'selected' }>;
  mcpServerConfigs?: McpServerConfigs;
}): void {
  const selectedAgents = getSelectedAgentsFromState(state);
  const selectedLanguageSkills = getSelectedLanguageSkillsFromState(state);
  const selectedFrameworkSkills = getSelectedFrameworkSkillsFromState(state);
  const selectedArchitectureSkill = getSelectedArchitectureSkillFromState(state);
  const currentWorkflowSkills = getSelectedWorkflowSkillsFromState(state);
  const impliedWorkflowSkills = getWorkflowSkillsImpliedByMcpServers(selectionResult.selectedMcpServers.map((server) => server.id));
  const selectedWorkflowSkills = mergeWorkflowSkills(currentWorkflowSkills, impliedWorkflowSkills);
  const selectedDatabaseSkills = getSelectedDatabaseSkillsFromState(state);
  const previousTargets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    currentWorkflowSkills,
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
  const affectedTargets = getAffectedTargets(previousTargets, targets);
  const preflightError = getMcpUsePreflightError({ rootPath, state, affectedTargets, previousTargets });

  if (preflightError) {
    log.error(preflightError);
    log.info('Run `sibu sync` to review workflow state before selecting an MCP server.');
    process.exitCode = 1;
    return;
  }

  const agentsTarget = targets.find((target) => target.label === 'AGENTS.md');
  if (!agentsTarget) {
    throw new Error('AGENTS.md target is missing from workflow targets.');
  }

  const nonAgentTargets = affectedTargets.filter((target) => target.label !== 'AGENTS.md');
  const files = renderMissingWorkflowFiles({
    missingTargets: nonAgentTargets,
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
    fs.writeFileSync(file.targetPath, file.contents, fileAlreadyExists ? 'utf8' : { encoding: 'utf8', flag: 'wx' });
    log.success(`${fileAlreadyExists ? 'Updated' : 'Created'} ${file.label}`);
  }

  if (affectedTargets.some((target) => target.label === 'AGENTS.md')) {
    const agentsContents = renderTemplateForSync({
      templateRelativePath: agentsTarget.templateRelativePath,
      currentPath: agentsTarget.targetPath,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
      selectedDatabaseSkills,
      selectedMcpServers: selectionResult.selectedMcpServers,
    });
    fs.writeFileSync(agentsTarget.targetPath, agentsContents, 'utf8');
    log.success('Updated AGENTS.md skill routing');
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
    mcpServerConfigs,
    targets,
  });

  log.success(`Updated ${STATE_RELATIVE_PATH}`);
  log.success(`Added ${selectionResult.serverName}.`);
  for (const skill of impliedWorkflowSkills.filter((skill) => !currentWorkflowSkills.some((currentSkill) => currentSkill.id === skill.id))) {
    log.success(`Added ${skill.name}.`);
  }
  log.info('Sibu configured MCP files only; prerequisites, credentials, and provider authentication remain user-owned.');
}

function getAffectedTargets(previousTargets: WorkflowTarget[], targets: WorkflowTarget[]): WorkflowTarget[] {
  const previousTargetPaths = new Set(previousTargets.map((target) => target.targetPath));
  const newTargets = targets.filter((target) => !previousTargetPaths.has(target.targetPath) && (target.targetKind === 'skill' || target.targetKind === 'mcp-config'));
  const mcpConfigTargets = targets.filter((target) => target.mcpConfigAgentId);
  const agentsTarget = targets.find((target) => target.label === 'AGENTS.md');
  const affectedTargets = new Map<string, WorkflowTarget>();

  for (const target of [...mcpConfigTargets, ...newTargets, ...(newTargets.some((target) => target.targetKind === 'skill') && agentsTarget ? [agentsTarget] : [])]) {
    affectedTargets.set(target.targetPath, target);
  }

  return [...affectedTargets.values()];
}

function mergeWorkflowSkills(...skillGroups: SelectableWorkflowSkill[][]): SelectableWorkflowSkill[] {
  const skillsById = new Map<SelectableWorkflowSkill['id'], SelectableWorkflowSkill>();

  for (const skill of skillGroups.flat()) {
    skillsById.set(skill.id, skill);
  }

  return [...skillsById.values()];
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
      const managedFile = state.managedFiles[relativePath];
      if (!managedFile) {
        return `${relativePath} is not recorded in ${STATE_RELATIVE_PATH}.`;
      }

      if (!fs.existsSync(target.targetPath)) {
        return `${relativePath} is missing.`;
      }

      const currentHash = sha256(fs.readFileSync(target.targetPath, 'utf8'));
      if (currentHash !== managedFile.sha256) {
        return `${relativePath} has changed since Sibu last recorded it.`;
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
