import fs from 'node:fs';
import path from 'node:path';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import type { SibuState, ManagedFileState, ManagedFileStatus } from '../../shared/types.js';

export type StateReadResult = { ok: true; state: SibuState } | { ok: false; message: string };

export function readStateForDoctor(statePath: string): StateReadResult {
  if (!fs.existsSync(statePath)) {
    return { ok: false, message: `${STATE_RELATIVE_PATH} is missing.` };
  }

  try {
    const parsedState = JSON.parse(fs.readFileSync(statePath, 'utf8')) as unknown;

    if (!isSibuState(parsedState)) {
      return { ok: false, message: `${STATE_RELATIVE_PATH} is not a valid Sibu state file.` };
    }

    return { ok: true, state: parsedState };
  } catch {
    return { ok: false, message: `${STATE_RELATIVE_PATH} could not be parsed.` };
  }
}

export function readExistingState(statePath: string): SibuState | undefined {
  if (!fs.existsSync(statePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;
  } catch {
    return undefined;
  }
}

export function writeStateFile(statePath: string, state: SibuState): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function cloneState(state: SibuState): SibuState {
  return JSON.parse(JSON.stringify(state)) as SibuState;
}

export function hasReviewedTemplateVersion(managedFile: ManagedFileState, templateVersion: string): boolean {
  return managedFile.lastReviewedTemplateVersion === templateVersion;
}

function isSibuState(value: unknown): value is SibuState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<SibuState>;

  return (
    typeof state.sibuVersion === 'string' &&
    typeof state.templateVersion === 'string' &&
    typeof state.generatedAt === 'string' &&
    typeof state.updatedAt === 'string' &&
    Array.isArray(state.selectedAgents) &&
    state.selectedAgents.every((agent) => typeof agent === 'string') &&
    (state.selectedLanguageSkills === undefined ||
      (Array.isArray(state.selectedLanguageSkills) && state.selectedLanguageSkills.every((skill) => typeof skill === 'string'))) &&
    (state.reviewedLanguageSkills === undefined ||
      (Array.isArray(state.reviewedLanguageSkills) && state.reviewedLanguageSkills.every((skill) => typeof skill === 'string'))) &&
    (state.selectedFrameworkSkills === undefined ||
      (Array.isArray(state.selectedFrameworkSkills) && state.selectedFrameworkSkills.every((skill) => typeof skill === 'string'))) &&
    (state.selectedArchitectureSkill === undefined || typeof state.selectedArchitectureSkill === 'string') &&
    (state.selectedWorkflowSkills === undefined ||
      (Array.isArray(state.selectedWorkflowSkills) && state.selectedWorkflowSkills.every((skill) => typeof skill === 'string'))) &&
    (state.reviewedArchitectureSkills === undefined ||
      (Array.isArray(state.reviewedArchitectureSkills) && state.reviewedArchitectureSkills.every((skill) => typeof skill === 'string'))) &&
    !!state.managedFiles &&
    typeof state.managedFiles === 'object' &&
    Object.values(state.managedFiles).every(isManagedFileState)
  );
}

function isManagedFileState(value: unknown): value is ManagedFileState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const managedFile = value as Partial<ManagedFileState>;
  const validStatuses: ManagedFileStatus[] = ['managed', 'customized', 'unmanaged'];

  return (
    typeof managedFile.template === 'string' &&
    typeof managedFile.templateVersion === 'string' &&
    typeof managedFile.sha256 === 'string' &&
    (managedFile.status === undefined || validStatuses.includes(managedFile.status)) &&
    (managedFile.lastReviewedTemplateVersion === undefined || typeof managedFile.lastReviewedTemplateVersion === 'string') &&
    (managedFile.reason === undefined || typeof managedFile.reason === 'string')
  );
}
