import fs from 'node:fs';
import path from 'node:path';

import { sha256 } from '../../shared/hash.js';
import { hasReviewedTemplateVersion } from '../workflow-state-ledger/index.js';
import { renderTemplateForSync } from '../template-catalog/index.js';
import type {
  SibuState,
  ManagedFileState,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  TemplateManifest,
  WorkflowSkillId,
  WorkflowTarget,
} from '../../shared/types.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getSkillTargetsForAgents,
  getWorkflowSkillsImpliedByMcpServers,
  getWorkflowTargets,
} from '../template-catalog/index.js';

export type SyncPreview = {
  relativePath: string;
  status: 'up-to-date' | 'new-template' | 'missing' | 'modified' | 'update-available' | 'modified-with-update' | 'unknown-template' | 'unmanaged';
  managedFile: ManagedFileState;
  recordedTemplateVersion?: string;
  currentTemplateVersion?: string;
  changes: string[];
  hasLocalFile?: boolean;
  impliedWorkflowSkillId?: WorkflowSkillId;
};

type SyncPreviewStatus = SyncPreview['status'];

const ACTIONABLE_SYNC_PREVIEW_STATUSES = new Set<SyncPreviewStatus>([
  'new-template',
  'missing',
  'modified',
  'update-available',
  'modified-with-update',
  'unknown-template',
]);

const PROMPTABLE_SYNC_PREVIEW_STATUSES = new Set<SyncPreviewStatus>([
  'new-template',
  'missing',
  'modified',
  'update-available',
  'modified-with-update',
]);

export function isActionableSyncPreview(preview: SyncPreview): boolean {
  return ACTIONABLE_SYNC_PREVIEW_STATUSES.has(preview.status);
}

export function shouldAskForSyncAction(preview: SyncPreview): boolean {
  return PROMPTABLE_SYNC_PREVIEW_STATUSES.has(preview.status);
}

export function getSyncPreviews({ rootPath, state, manifest }: { rootPath: string; state: SibuState; manifest: TemplateManifest }): SyncPreview[] {
  const selectedLanguageSkills = getSelectedLanguageSkillsFromState(state);
  const selectedFrameworkSkills = getSelectedFrameworkSkillsFromState(state);
  const selectedArchitectureSkill = getSelectedArchitectureSkillFromState(state);
  const selectedWorkflowSkills = getSelectedWorkflowSkillsFromState(state);
  const selectedDatabaseSkills = getSelectedDatabaseSkillsFromState(state);
  const selectedMcpServers = getSelectedMcpServersFromState(state);
  const impliedWorkflowSkills = getWorkflowSkillsImpliedByMcpServers(selectedMcpServers.map((server) => server.id));
  const plannedWorkflowSkills = mergeWorkflowSkills(selectedWorkflowSkills, impliedWorkflowSkills);
  const missingImpliedWorkflowSkills = impliedWorkflowSkills.filter((skill) => !selectedWorkflowSkills.some((selectedSkill) => selectedSkill.id === skill.id));
  const previews: SyncPreview[] = [];
  const expectedTargets = getWorkflowTargets(
    rootPath,
    getSelectedAgentsFromState(state),
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    plannedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers
  );
  const alreadyPreviewedPaths = new Set<string>();

  for (const skill of missingImpliedWorkflowSkills) {
    for (const preview of getNewExpectedTargetPreviews({ rootPath, manifest, state, expectedTargets, selectedAgents: getSelectedAgentsFromState(state), workflowSkill: skill })) {
      previews.push(preview);
      alreadyPreviewedPaths.add(preview.relativePath);
    }
  }

  previews.push(
    ...Object.entries(state.managedFiles).map(([relativePath, managedFile]) =>
      getManagedFileSyncPreview({
        rootPath,
        manifest,
        relativePath,
        managedFile,
        selectedLanguageSkills,
        selectedFrameworkSkills,
        selectedArchitectureSkill,
        selectedWorkflowSkills: plannedWorkflowSkills,
        selectedDatabaseSkills,
        selectedMcpServers,
      })
    )
  );

  for (const target of expectedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);

    if (state.managedFiles[relativePath] || alreadyPreviewedPaths.has(relativePath)) {
      continue;
    }

    previews.push(getNewExpectedTargetPreview({ rootPath, manifest, target }));
  }

  return previews;
}

function getNewExpectedTargetPreviews({
  rootPath,
  manifest,
  state,
  expectedTargets,
  selectedAgents,
  workflowSkill,
}: {
  rootPath: string;
  manifest: TemplateManifest;
  state: SibuState;
  expectedTargets: WorkflowTarget[];
  selectedAgents: ReturnType<typeof getSelectedAgentsFromState>;
  workflowSkill: SelectableWorkflowSkill;
}): SyncPreview[] {
  const workflowSkillTargetPaths = new Set(getSkillTargetsForAgents(workflowSkill, selectedAgents).map((target) => target.targetRelativePath));

  return expectedTargets
    .filter((target) => workflowSkillTargetPaths.has(path.relative(rootPath, target.targetPath)))
    .filter((target) => !state.managedFiles[path.relative(rootPath, target.targetPath)])
    .map((target) => ({
      ...getNewExpectedTargetPreview({ rootPath, manifest, target }),
      impliedWorkflowSkillId: workflowSkill.id,
    }));
}

function getNewExpectedTargetPreview({ rootPath, manifest, target }: { rootPath: string; manifest: TemplateManifest; target: WorkflowTarget }): SyncPreview {
  const relativePath = path.relative(rootPath, target.targetPath);
  const template = manifest.templates[target.templateRelativePath];

  if (!template) {
    return {
      relativePath,
      managedFile: {
        template: target.templateRelativePath,
        templateVersion: 'unknown',
        sha256: '',
      },
      status: 'unknown-template',
      changes: [],
      hasLocalFile: fs.existsSync(target.targetPath),
    };
  }

  return {
    relativePath,
    managedFile: {
      template: target.templateRelativePath,
      templateVersion: template.version,
      sha256: '',
      status: 'managed',
    },
    status: 'new-template',
    currentTemplateVersion: template.version,
    changes: template.changes,
    hasLocalFile: fs.existsSync(target.targetPath),
  };
}

function mergeWorkflowSkills(...skillGroups: SelectableWorkflowSkill[][]): SelectableWorkflowSkill[] {
  const skillsById = new Map<SelectableWorkflowSkill['id'], SelectableWorkflowSkill>();

  for (const skill of skillGroups.flat()) {
    skillsById.set(skill.id, skill);
  }

  return [...skillsById.values()];
}

function getManagedFileSyncPreview({
  rootPath,
  manifest,
  relativePath,
  managedFile,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills,
  selectedDatabaseSkills,
  selectedMcpServers,
}: {
  rootPath: string;
  manifest: TemplateManifest;
  relativePath: string;
  managedFile: ManagedFileState;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
  selectedDatabaseSkills: SelectableDatabaseSkill[];
  selectedMcpServers: SelectableMcpServer[];
}): SyncPreview {
  if (managedFile.status === 'unmanaged') {
    return { relativePath, managedFile, status: 'unmanaged', recordedTemplateVersion: managedFile.templateVersion, changes: [] };
  }

  const template = manifest.templates[managedFile.template];

  if (!template) {
    return { relativePath, managedFile, status: 'unknown-template', recordedTemplateVersion: managedFile.templateVersion, changes: [] };
  }

  const targetPath = path.join(rootPath, relativePath);
  const hasLocalFile = fs.existsSync(targetPath);
  const hasLocalEdits = hasLocalFile ? sha256(fs.readFileSync(targetPath, 'utf8')) !== managedFile.sha256 : false;
  const hasTemplateUpdate = managedFile.templateVersion !== template.version && !hasReviewedTemplateVersion(managedFile, template.version);
  const hasSelectionUpdate = hasRenderedSelectionUpdate({
    relativePath,
    currentPath: targetPath,
    managedFile,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers,
  });
  const hasUpdate = hasTemplateUpdate || hasSelectionUpdate;
  const changes = hasTemplateUpdate ? template.changes : [getSelectionRefreshChange(managedFile.template)];

  if (!hasLocalFile) {
    return {
      relativePath,
      managedFile,
      status: 'missing',
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes: template.changes,
      hasLocalFile,
    };
  }

  if (hasLocalEdits && hasUpdate) {
    return {
      relativePath,
      managedFile,
      status: 'modified-with-update',
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes,
      hasLocalFile,
    };
  }

  if (hasLocalEdits) {
    return {
      relativePath,
      managedFile,
      status: 'modified',
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes: [],
      hasLocalFile,
    };
  }

  if (hasUpdate) {
    return {
      relativePath,
      managedFile,
      status: 'update-available',
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes,
      hasLocalFile,
    };
  }

  return {
    relativePath,
    managedFile,
    status: 'up-to-date',
    recordedTemplateVersion: managedFile.templateVersion,
    currentTemplateVersion: template.version,
    changes: [],
    hasLocalFile,
  };
}

function getSelectionRefreshChange(templateRelativePath: string): string {
  if (templateRelativePath === '.codex/config.toml' || templateRelativePath === 'mcp/claude/.mcp.json' || templateRelativePath === 'mcp/gemini/settings.json') {
    return 'Refreshes generated MCP configuration for the current selected MCP servers.';
  }

  return 'Refreshes generated skill routing for the current selected skills.';
}

function hasRenderedSelectionUpdate({
  relativePath,
  currentPath,
  managedFile,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills,
  selectedDatabaseSkills,
  selectedMcpServers,
}: {
  relativePath: string;
  currentPath: string;
  managedFile: ManagedFileState;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
  selectedDatabaseSkills: SelectableDatabaseSkill[];
  selectedMcpServers: SelectableMcpServer[];
}): boolean {
  if (relativePath !== 'AGENTS.md' && selectedMcpServers.length === 0) {
    return false;
  }

  const renderedContents = renderTemplateForSync({
    templateRelativePath: managedFile.template,
    currentPath,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
    selectedMcpServers,
  });

  return sha256(renderedContents) !== managedFile.sha256;
}
