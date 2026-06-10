import fs from 'node:fs';
import path from 'node:path';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { sha256 } from '../../shared/hash.js';
import { removeUndefinedFields } from '../../shared/object.js';
import type {
  ManagedFileState,
  ManagedFileStatus,
  McpServerConfigs,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  SibuState,
  SupportedAgent,
  WorkflowTarget,
} from '../../shared/types.js';
import { getTemplateVersion, readTemplateManifest } from '../template-catalog/index.js';
import { SIBU_VERSION } from '../../support/version-advisory/index.js';

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

export function writeSibuState({
  rootPath,
  statePath,
  selectedAgents,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers,
  mcpServerConfigs,
  targets,
}: {
  rootPath: string;
  statePath: string;
  selectedAgents: SupportedAgent[];
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
  mcpServerConfigs?: McpServerConfigs;
  targets: WorkflowTarget[];
}): void {
  const previousState = readExistingState(statePath);
  const now = new Date().toISOString();
  const manifest = readTemplateManifest();
  const state: SibuState = {
    sibuVersion: SIBU_VERSION,
    templateVersion: manifest.templateVersion,
    generatedAt: previousState?.generatedAt ?? now,
    updatedAt: now,
    selectedAgents: selectedAgents.map((agent) => agent.id),
    selectedLanguageSkills: selectedLanguageSkills.map((skill) => skill.id),
    selectedFrameworkSkills: selectedFrameworkSkills.map((skill) => skill.id),
    selectedArchitectureSkill: selectedArchitectureSkill?.id,
    selectedWorkflowSkills: selectedWorkflowSkills.map((skill) => skill.id),
    selectedDatabaseSkills: selectedDatabaseSkills.map((skill) => skill.id),
    ...(selectedMcpServers !== undefined ? { selectedMcpServers: selectedMcpServers.map((server) => server.id) } : {}),
    ...(mcpServerConfigs ?? previousState?.mcpServerConfigs ? { mcpServerConfigs: mcpServerConfigs ?? previousState?.mcpServerConfigs } : {}),
    managedFiles: Object.fromEntries(
      targets
        .filter((target) => fs.existsSync(target.targetPath))
        .map((target) => {
          const relativePath = path.relative(rootPath, target.targetPath);
          const previousManagedFile = previousState?.managedFiles[relativePath];
          const nextManagedFile: ManagedFileState = {
            template: target.templateRelativePath,
            templateVersion: getTemplateVersion(manifest, target.templateRelativePath),
            sha256: sha256(fs.readFileSync(target.targetPath, 'utf8')),
            status: previousManagedFile?.status ?? 'managed',
            lastReviewedTemplateVersion: previousManagedFile?.lastReviewedTemplateVersion,
            reason: previousManagedFile?.reason,
          };

          return [relativePath, removeUndefinedFields(nextManagedFile)];
        })
    ),
  };

  writeStateFile(statePath, state);
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
    (state.selectedDatabaseSkills === undefined ||
      (Array.isArray(state.selectedDatabaseSkills) && state.selectedDatabaseSkills.every((skill) => typeof skill === 'string'))) &&
    (state.selectedMcpServers === undefined ||
      (Array.isArray(state.selectedMcpServers) && state.selectedMcpServers.every((server) => typeof server === 'string'))) &&
    (state.mcpServerConfigs === undefined || isMcpServerConfigs(state.mcpServerConfigs)) &&
    (state.reviewedArchitectureSkills === undefined ||
      (Array.isArray(state.reviewedArchitectureSkills) && state.reviewedArchitectureSkills.every((skill) => typeof skill === 'string'))) &&
    !!state.managedFiles &&
    typeof state.managedFiles === 'object' &&
    Object.values(state.managedFiles).every(isManagedFileState)
  );
}

function isMcpServerConfigs(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const configs = value as { notion?: unknown };

  if (configs.notion !== undefined) {
    if (!configs.notion || typeof configs.notion !== 'object') {
      return false;
    }

    const notionConfig = configs.notion as { docsParentPage?: unknown };
    if (typeof notionConfig.docsParentPage !== 'string') {
      return false;
    }
  }

  return true;
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
