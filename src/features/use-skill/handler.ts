import fs from 'node:fs';
import path from 'node:path';

import { log } from '@clack/prompts';

import { STATE_RELATIVE_PATH, resolveSelectableSkillById } from '../../shared/catalog.js';
import { sha256 } from '../../shared/hash.js';
import { getProjectContext } from '../../shared/paths.js';
import { renderTemplateForSync } from '../../shared/templates.js';
import type {
  ArchitectureSkillId,
  SibuState,
  FrameworkSkillId,
  LanguageSkillId,
  SelectableArchitectureSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableWorkflowSkill,
  SupportedAgent,
  WorkflowSkillId,
  WorkflowTarget,
} from '../../shared/types.js';
import { getWorkflowMutationReadiness } from '../../shared/workflow-mutation-readiness.js';
import { getSelectedAgentsFromState, getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../shared/workflow-targets.js';
import type { UseSkillCommand } from './command.js';

type NextSkillSelection = {
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
};

type SkillSelectionResult =
  | { status: 'selected'; selection: NextSkillSelection; skillName: string }
  | { status: 'noop'; message: string }
  | { status: 'blocked'; message: string; hint?: string };

type SkillApplicationPlan = {
  agentsTarget: WorkflowTarget;
  newSkillTarget: WorkflowTarget;
  targets: WorkflowTarget[];
  selectedAgents: SupportedAgent[];
};

export async function handleUseSkill(command: UseSkillCommand): Promise<void> {
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
      applySelectedSkill({ rootPath, statePath, state: readiness.state, selectionResult });
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
          hint: 'Architecture skill replacement is not supported yet. Keep the existing architecture skill or stop managing it first.',
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
        },
      };
  }
}

function applySelectedSkill({
  rootPath,
  statePath,
  state,
  selectionResult,
}: {
  rootPath: string;
  statePath: string;
  state: SibuState;
  selectionResult: Extract<SkillSelectionResult, { status: 'selected' }>;
}): void {
  const plan = buildSkillApplicationPlan({ rootPath, state, selectionResult });
  const preflightError = getSkillApplicationPreflightError({ rootPath, state, plan });

  if (preflightError) {
    log.error(preflightError);
    log.info('Run `sibu sync` to review workflow state before selecting a skill.');
    process.exitCode = 1;
    return;
  }

  const agentsContents = renderTemplateForSync({
    templateRelativePath: plan.agentsTarget.templateRelativePath,
    currentPath: plan.agentsTarget.targetPath,
    selectedLanguageSkills: selectionResult.selection.selectedLanguageSkills,
    selectedFrameworkSkills: selectionResult.selection.selectedFrameworkSkills,
    selectedArchitectureSkill: selectionResult.selection.selectedArchitectureSkill,
    selectedWorkflowSkills: selectionResult.selection.selectedWorkflowSkills,
  });
  const [newSkillFile] = renderMissingWorkflowFiles({
    missingTargets: [plan.newSkillTarget],
    selectedLanguageSkills: selectionResult.selection.selectedLanguageSkills,
    selectedFrameworkSkills: selectionResult.selection.selectedFrameworkSkills,
    selectedArchitectureSkill: selectionResult.selection.selectedArchitectureSkill,
  });

  fs.mkdirSync(path.dirname(newSkillFile.targetPath), { recursive: true });
  fs.writeFileSync(newSkillFile.targetPath, newSkillFile.contents, { encoding: 'utf8', flag: 'wx' });
  log.success(`Created ${newSkillFile.label}`);

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
    targets: plan.targets,
  });
  log.success(`Updated ${STATE_RELATIVE_PATH}`);
  log.success(`Added ${selectionResult.skillName}.`);
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
  const previousTargets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    getSelectedLanguageSkillsFromState(state),
    getSelectedFrameworkSkillsFromState(state),
    getArchitectureSkillById(state.selectedArchitectureSkill),
    getSelectedWorkflowSkillsFromState(state)
  );
  const targets = getWorkflowTargets(
    rootPath,
    selectedAgents,
    selectionResult.selection.selectedLanguageSkills,
    selectionResult.selection.selectedFrameworkSkills,
    selectionResult.selection.selectedArchitectureSkill,
    selectionResult.selection.selectedWorkflowSkills
  );
  const previousTargetPaths = new Set(previousTargets.map((target) => target.targetPath));
  const newSkillTarget = targets.find((target) => !previousTargetPaths.has(target.targetPath));
  const agentsTarget = targets.find((target) => target.label === 'AGENTS.md');

  if (!newSkillTarget) {
    throw new Error(`No new workflow target found for ${selectionResult.skillName}.`);
  }

  if (!agentsTarget) {
    throw new Error('AGENTS.md target is missing from workflow targets.');
  }

  return { agentsTarget, newSkillTarget, targets, selectedAgents };
}

function getSkillApplicationPreflightError({ rootPath, state, plan }: { rootPath: string; state: SibuState; plan: SkillApplicationPlan }): string | undefined {
  if (fs.existsSync(plan.newSkillTarget.targetPath)) {
    return `${path.relative(rootPath, plan.newSkillTarget.targetPath)} already exists but is not recorded for this selection.`;
  }

  const agentsRelativePath = path.relative(rootPath, plan.agentsTarget.targetPath);
  const agentsManagedFile = state.managedFiles[agentsRelativePath];

  if (!agentsManagedFile) {
    return 'AGENTS.md is not recorded in `.sibu/state.json`.';
  }

  if (!fs.existsSync(plan.agentsTarget.targetPath)) {
    return 'AGENTS.md is missing.';
  }

  const agentsCurrentHash = sha256(fs.readFileSync(plan.agentsTarget.targetPath, 'utf8'));
  if (agentsCurrentHash !== agentsManagedFile.sha256) {
    return 'AGENTS.md has changed since Sibu last recorded it.';
  }

  return undefined;
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
