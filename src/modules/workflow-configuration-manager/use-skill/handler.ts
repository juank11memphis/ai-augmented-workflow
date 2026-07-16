import fs from 'node:fs';
import path from 'node:path';
import { writeSibuState } from '../../workflow-state-ledger/index.js';

import { log } from '@clack/prompts';

import { STATE_RELATIVE_PATH } from '../../workflow-state-ledger/state-path.js';
import { askForNotionDocsParentPage } from '../../../support/interactive-guidance/index.js';
import { getMcpServersRequiredByWorkflowSkills, resolveSelectableSkillById } from '../../template-catalog/index.js';
import { sha256 } from '../../../shared/hash.js';
import { getProjectContext } from '../../../shared/paths.js';
import { renderTemplateForSync } from '../../template-catalog/index.js';
import type {
  ArchitectureSkillId,
  DatabaseSkillId,
  SibuState,
  FrameworkSkillId,
  LanguageSkillId,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  SupportedAgent,
  WorkflowSkillId,
  WorkflowTarget,
} from '../../../shared/types.js';
import { getWorkflowMutationReadiness } from '../../sync-review-orchestrator/index.js';
import {
  getSelectedAgentsFromState,
  getSelectedMcpServersFromState,
  getWorkflowTargets,
  renderMissingWorkflowFiles,
} from '../../template-catalog/index.js';
import type { UseSkillCommand } from './command.js';
import type { McpServerConfigs } from '../../../shared/types.js';

type NextSkillSelection = {
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
  selectedDatabaseSkills: SelectableDatabaseSkill[];
};

type SkillSelectionResult =
  | { status: 'selected'; selection: NextSkillSelection; skillName: string }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

type SkillApplicationPlan = {
  agentsTarget: WorkflowTarget;
  newTargets: WorkflowTarget[];
  affectedTargets: WorkflowTarget[];
  targets: WorkflowTarget[];
  selectedAgents: SupportedAgent[];
  selectedMcpServers: SelectableMcpServer[];
};

type UseSkillDependencies = {
  askForNotionDocsParentPage: () => Promise<string>;
};

const defaultDependencies: UseSkillDependencies = {
  askForNotionDocsParentPage,
};

export async function handleUseSkill(command: UseSkillCommand, dependencies: UseSkillDependencies = defaultDependencies): Promise<void> {
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

  const selectionResult = getNextSkillSelection(readiness.state, command.skillName);

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
      await applySelectedSkill({ rootPath, statePath, state: readiness.state, selectionResult, dependencies });
      return;
  }
}

export function getNextSkillSelection(state: SibuState, skillName: string): SkillSelectionResult {
  const resolution = resolveSelectableSkillById(skillName);

  if (!resolution.ok) {
    return { status: 'blocked', message: resolution.message };
  }

  const selectedLanguageSkills = [...(state.selectedLanguageSkills ?? [])];
  const selectedFrameworkSkills = [...(state.selectedFrameworkSkills ?? [])];
  const selectedWorkflowSkills = [...(state.selectedWorkflowSkills ?? [])];
  const selectedDatabaseSkills = [...(state.selectedDatabaseSkills ?? [])];

  switch (resolution.resolved.kind) {
    case 'language':
      if (selectedLanguageSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: [...selectedLanguageSkills, resolution.resolved.skill.id].map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
          selectedWorkflowSkills: selectedWorkflowSkills.map(getWorkflowSkillById),
          selectedDatabaseSkills: selectedDatabaseSkills.map(getDatabaseSkillById),
        },
      };

    case 'framework':
      if (selectedFrameworkSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: [...selectedFrameworkSkills, resolution.resolved.skill.id].map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
          selectedWorkflowSkills: selectedWorkflowSkills.map(getWorkflowSkillById),
          selectedDatabaseSkills: selectedDatabaseSkills.map(getDatabaseSkillById),
        },
      };

    case 'architecture':
      if (state.selectedArchitectureSkill === resolution.resolved.skill.id) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      if (state.selectedArchitectureSkill) {
        return {
          status: 'blocked',
          message: `Cannot select ${resolution.resolved.skill.name} because another architecture skill is already selected.`,
          hint: 'Every healthy Sibu workflow requires one selected architecture skill. Architecture skill replacement is not supported yet; keep the existing architecture skill.',
        };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: resolution.resolved.skill,
          selectedWorkflowSkills: selectedWorkflowSkills.map(getWorkflowSkillById),
          selectedDatabaseSkills: selectedDatabaseSkills.map(getDatabaseSkillById),
        },
      };

    case 'database':
      if (selectedDatabaseSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
          selectedWorkflowSkills: selectedWorkflowSkills.map(getWorkflowSkillById),
          selectedDatabaseSkills: [...selectedDatabaseSkills, resolution.resolved.skill.id].map(getDatabaseSkillById),
        },
      };

    case 'workflow':
      if (selectedWorkflowSkills.includes(resolution.resolved.skill.id)) {
        return { status: 'noop', message: `${resolution.resolved.skill.name} is already selected.` };
      }

      return {
        status: 'selected',
        skillName: resolution.resolved.skill.name,
        selection: {
          selectedLanguageSkills: selectedLanguageSkills.map(getLanguageSkillById),
          selectedFrameworkSkills: selectedFrameworkSkills.map(getFrameworkSkillById),
          selectedArchitectureSkill: getArchitectureSkillById(state.selectedArchitectureSkill),
          selectedWorkflowSkills: [...selectedWorkflowSkills, resolution.resolved.skill.id].map(getWorkflowSkillById),
          selectedDatabaseSkills: selectedDatabaseSkills.map(getDatabaseSkillById),
        },
      };
  }
}

async function applySelectedSkill({
  rootPath,
  statePath,
  state,
  selectionResult,
  dependencies,
}: {
  rootPath: string;
  statePath: string;
  state: SibuState;
  selectionResult: Extract<SkillSelectionResult, { status: 'selected' }>;
  dependencies: UseSkillDependencies;
}): Promise<void> {
  const plan = buildSkillApplicationPlan({ rootPath, state, selectionResult });
  const preflightError = getSkillApplicationPreflightError({ rootPath, state, plan });

  if (preflightError) {
    log.error(preflightError);
    log.info('Run `sibu sync` to review workflow state before selecting a skill.');
    process.exitCode = 1;
    return;
  }

  const mcpServerConfigs = await getNextMcpServerConfigs({ state, selectedMcpServers: plan.selectedMcpServers, dependencies });
  const dependencyMcpServers = plan.selectedMcpServers.filter((server) => !(state.selectedMcpServers ?? []).includes(server.id));
  for (const server of dependencyMcpServers) {
    log.info(`${selectionResult.skillName} requires ${server.name}. I will add them together.`);
  }

  const nonAgentTargets = plan.affectedTargets.filter((target) => target.label !== 'AGENTS.md');
  const files = renderMissingWorkflowFiles({
    missingTargets: nonAgentTargets,
    selectedLanguageSkills: selectionResult.selection.selectedLanguageSkills,
    selectedFrameworkSkills: selectionResult.selection.selectedFrameworkSkills,
    selectedArchitectureSkill: selectionResult.selection.selectedArchitectureSkill,
    selectedWorkflowSkills: selectionResult.selection.selectedWorkflowSkills,
    selectedDatabaseSkills: selectionResult.selection.selectedDatabaseSkills,
    selectedMcpServers: plan.selectedMcpServers,
  });

  for (const file of files) {
    const fileAlreadyExists = fs.existsSync(file.targetPath);
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, fileAlreadyExists ? 'utf8' : { encoding: 'utf8', flag: 'wx' });
    log.success(`${fileAlreadyExists ? 'Updated' : 'Created'} ${file.label}`);
  }

  const agentsContents = renderTemplateForSync({
    templateRelativePath: plan.agentsTarget.templateRelativePath,
    currentPath: plan.agentsTarget.targetPath,
    selectedLanguageSkills: selectionResult.selection.selectedLanguageSkills,
    selectedFrameworkSkills: selectionResult.selection.selectedFrameworkSkills,
    selectedArchitectureSkill: selectionResult.selection.selectedArchitectureSkill,
    selectedWorkflowSkills: selectionResult.selection.selectedWorkflowSkills,
    selectedDatabaseSkills: selectionResult.selection.selectedDatabaseSkills,
    selectedMcpServers: plan.selectedMcpServers,
  });
  fs.writeFileSync(plan.agentsTarget.targetPath, agentsContents, 'utf8');
  log.success('Updated AGENTS.md skill routing');

  writeSibuState({
    rootPath,
    statePath,
    selectedAgents: plan.selectedAgents,
    selectedLanguageSkills: selectionResult.selection.selectedLanguageSkills,
    selectedFrameworkSkills: selectionResult.selection.selectedFrameworkSkills,
    selectedArchitectureSkill: selectionResult.selection.selectedArchitectureSkill,
    selectedWorkflowSkills: selectionResult.selection.selectedWorkflowSkills,
    selectedDatabaseSkills: selectionResult.selection.selectedDatabaseSkills,
    selectedMcpServers: plan.selectedMcpServers,
    mcpServerConfigs,
    targets: plan.targets,
  });
  log.success(`Updated ${STATE_RELATIVE_PATH}`);
  log.success(`Added ${selectionResult.skillName}.`);
  for (const server of dependencyMcpServers) {
    log.success(`Added ${server.name}.`);
  }
}

function buildSkillApplicationPlan({
  rootPath,
  state,
  selectionResult,
}: {
  rootPath: string;
  state: SibuState;
  selectionResult: Extract<SkillSelectionResult, { status: 'selected' }>;
}): SkillApplicationPlan {
  const selectedAgents = getSelectedAgentsFromState(state);
  const currentMcpServers = getSelectedMcpServersFromState(state);
  const requiredMcpServers = getMcpServersRequiredByWorkflowSkills(selectionResult.selection.selectedWorkflowSkills.map((skill) => skill.id));
  const selectedMcpServers = mergeMcpServers(currentMcpServers, requiredMcpServers);
  const previousTargets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    getSelectedLanguageSkillsFromState(state),
    getSelectedFrameworkSkillsFromState(state),
    getArchitectureSkillById(state.selectedArchitectureSkill),
    getSelectedWorkflowSkillsFromState(state),
    getSelectedDatabaseSkillsFromState(state),
    currentMcpServers
  );
  const targets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectionResult.selection.selectedLanguageSkills,
    selectionResult.selection.selectedFrameworkSkills,
    selectionResult.selection.selectedArchitectureSkill,
    selectionResult.selection.selectedWorkflowSkills,
    selectionResult.selection.selectedDatabaseSkills,
    selectedMcpServers
  );
  const previousTargetPaths = new Set(previousTargets.map((target) => target.targetPath));
  const newTargets = targets.filter((target) => !previousTargetPaths.has(target.targetPath) && (target.targetKind === 'skill' || target.targetKind === 'mcp-config'));
  const mcpConfigTargets = targets.filter((target) => target.mcpConfigAgentId && selectedMcpServers.length > currentMcpServers.length);
  const agentsTarget = targets.find((target) => target.label === 'AGENTS.md');

  if (newTargets.length === 0) {
    throw new Error(`No new workflow target found for ${selectionResult.skillName}.`);
  }

  if (!agentsTarget) {
    throw new Error('AGENTS.md target is missing from workflow targets.');
  }

  const affectedTargets = dedupeTargets([...newTargets, ...mcpConfigTargets, agentsTarget]);

  return { agentsTarget, newTargets, affectedTargets, targets, selectedAgents, selectedMcpServers };
}

function getSkillApplicationPreflightError({ rootPath, state, plan }: { rootPath: string; state: SibuState; plan: SkillApplicationPlan }): string | undefined {
  const existingRecordedTargets = plan.affectedTargets.filter((target) => state.managedFiles[path.relative(rootPath, target.targetPath)]);
  const newTargets = plan.affectedTargets.filter((target) => !state.managedFiles[path.relative(rootPath, target.targetPath)]);

  for (const target of newTargets) {
    if (fs.existsSync(target.targetPath)) {
      return `${path.relative(rootPath, target.targetPath)} already exists but is not recorded for this selection.`;
    }
  }

  for (const target of existingRecordedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);
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
  }

  return undefined;
}

function dedupeTargets(targets: WorkflowTarget[]): WorkflowTarget[] {
  return [...new Map(targets.map((target) => [target.targetPath, target])).values()];
}

function mergeMcpServers(...serverGroups: SelectableMcpServer[][]): SelectableMcpServer[] {
  const serversById = new Map<SelectableMcpServer['id'], SelectableMcpServer>();

  for (const server of serverGroups.flat()) {
    serversById.set(server.id, server);
  }

  return [...serversById.values()];
}

async function getNextMcpServerConfigs({
  state,
  selectedMcpServers,
  dependencies,
}: {
  state: SibuState;
  selectedMcpServers: SelectableMcpServer[];
  dependencies: UseSkillDependencies;
}): Promise<McpServerConfigs | undefined> {
  if (!selectedMcpServers.some((server) => server.id === 'notion') || state.selectedMcpServers?.includes('notion')) {
    return state.mcpServerConfigs;
  }

  const docsParentPage = await dependencies.askForNotionDocsParentPage();

  return {
    ...state.mcpServerConfigs,
    notion: { docsParentPage },
  };
}

function getSelectedLanguageSkillsFromState(state: SibuState): SelectableLanguageSkill[] {
  return (state.selectedLanguageSkills ?? []).map(getLanguageSkillById);
}

function getSelectedFrameworkSkillsFromState(state: SibuState): SelectableFrameworkSkill[] {
  return (state.selectedFrameworkSkills ?? []).map(getFrameworkSkillById);
}

function getSelectedWorkflowSkillsFromState(state: SibuState): SelectableWorkflowSkill[] {
  return (state.selectedWorkflowSkills ?? []).map(getWorkflowSkillById);
}

function getSelectedDatabaseSkillsFromState(state: SibuState): SelectableDatabaseSkill[] {
  return (state.selectedDatabaseSkills ?? []).map(getDatabaseSkillById);
}

function getLanguageSkillById(skillId: LanguageSkillId): SelectableLanguageSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'language') {
    throw new Error(`Unsupported language skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getFrameworkSkillById(skillId: FrameworkSkillId): SelectableFrameworkSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'framework') {
    throw new Error(`Unsupported framework skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getArchitectureSkillById(skillId: ArchitectureSkillId | undefined): SelectableArchitectureSkill | undefined {
  if (!skillId) {
    return undefined;
  }

  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'architecture') {
    throw new Error(`Unsupported architecture skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getWorkflowSkillById(skillId: WorkflowSkillId): SelectableWorkflowSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'workflow') {
    throw new Error(`Unsupported workflow skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}

function getDatabaseSkillById(skillId: DatabaseSkillId): SelectableDatabaseSkill {
  const resolution = resolveSelectableSkillById(skillId);

  if (!resolution.ok || resolution.resolved.kind !== 'database') {
    throw new Error(`Unsupported database skill in state: ${skillId}`);
  }

  return resolution.resolved.skill;
}
