import fs from 'node:fs';
import path from 'node:path';

import type { SibuState, SupportedAgent } from '../../shared/types.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowTargets,
  SUPPORTED_AGENTS,
} from '../workflow-target-planning/index.js';
import { cloneState } from '../workflow-state-registry/index.js';

export type UnsupportedAgentCleanupPlan = {
  unsupportedAgentIds: string[];
  remainingSupportedAgents: SupportedAgent[];
  obsoleteManagedFilePaths: string[];
  filePathsToDelete: string[];
  removesSibuState: boolean;
};

export type UnsupportedAgentCleanupResult =
  | {
      removedStateFile: true;
      removedFiles: string[];
    }
  | {
      removedStateFile: false;
      removedFiles: string[];
      state: SibuState;
    };

export function getUnsupportedAgentCleanupPlan({ rootPath, state }: { rootPath: string; state: SibuState }): UnsupportedAgentCleanupPlan | undefined {
  const supportedAgentIds = new Set<string>(SUPPORTED_AGENTS.map((agent) => agent.id));
  const unsupportedAgentIds = state.selectedAgents.filter((agentId) => !supportedAgentIds.has(agentId));

  if (unsupportedAgentIds.length === 0) {
    return undefined;
  }

  const remainingSupportedAgents = getSelectedAgentsFromState(state);
  const obsoleteManagedFilePaths = getObsoleteManagedFilePaths({ rootPath, state, remainingSupportedAgents });
  const filePathsToDelete = obsoleteManagedFilePaths.filter((relativePath) => state.managedFiles[relativePath]?.status !== 'unmanaged');

  return {
    unsupportedAgentIds,
    remainingSupportedAgents,
    obsoleteManagedFilePaths,
    filePathsToDelete,
    removesSibuState: remainingSupportedAgents.length === 0,
  };
}

export function applyUnsupportedAgentCleanup({
  rootPath,
  statePath,
  state,
  plan,
}: {
  rootPath: string;
  statePath: string;
  state: SibuState;
  plan: UnsupportedAgentCleanupPlan;
}): UnsupportedAgentCleanupResult {
  const removedFiles: string[] = [];

  for (const relativePath of plan.filePathsToDelete) {
    const targetPath = path.join(rootPath, relativePath);

    if (!fs.existsSync(targetPath)) {
      continue;
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
    removedFiles.push(relativePath);
  }

  if (plan.removesSibuState) {
    fs.rmSync(statePath, { force: true });
    return { removedStateFile: true, removedFiles };
  }

  const unsupportedAgentIds = new Set(plan.unsupportedAgentIds);
  const obsoleteManagedFilePaths = new Set(plan.obsoleteManagedFilePaths);
  const nextState = cloneState(state);

  nextState.selectedAgents = nextState.selectedAgents.filter((agentId) => !unsupportedAgentIds.has(agentId));
  nextState.updatedAt = new Date().toISOString();

  for (const relativePath of obsoleteManagedFilePaths) {
    delete nextState.managedFiles[relativePath];
  }

  return {
    removedStateFile: false,
    removedFiles,
    state: nextState,
  };
}

function getObsoleteManagedFilePaths({
  rootPath,
  state,
  remainingSupportedAgents,
}: {
  rootPath: string;
  state: SibuState;
  remainingSupportedAgents: SupportedAgent[];
}): string[] {
  if (remainingSupportedAgents.length === 0) {
    return Object.keys(state.managedFiles);
  }

  const expectedTargets = getWorkflowTargets(
    rootPath,
    remainingSupportedAgents,
    getSelectedLanguageSkillsFromState(state),
    getSelectedFrameworkSkillsFromState(state),
    getSelectedArchitectureSkillFromState(state),
    getSelectedWorkflowSkillsFromState(state),
    getSelectedDatabaseSkillsFromState(state),
    getSelectedMcpServersFromState(state)
  );
  const expectedManagedFilePaths = new Set(expectedTargets.map((target) => path.relative(rootPath, target.targetPath)));

  return Object.keys(state.managedFiles).filter((relativePath) => !expectedManagedFilePaths.has(relativePath));
}
