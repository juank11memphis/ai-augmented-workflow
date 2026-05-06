import fs from 'node:fs';
import path from 'node:path';

import { sha256 } from '../../shared/hash.js';
import { hasReviewedTemplateVersion } from '../workflow-state-registry/index.js';
import { renderTemplateForSync } from '../template-catalog-rendering/index.js';
import type { SibuState, ManagedFileState, SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SelectableWorkflowSkill, TemplateManifest } from '../../shared/types.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowTargets,
} from '../workflow-target-planning/index.js';

export type SyncPreview = {
  relativePath: string;
  status: 'up-to-date' | 'new-template' | 'missing' | 'modified' | 'update-available' | 'modified-with-update' | 'unknown-template' | 'unmanaged';
  managedFile: ManagedFileState;
  recordedTemplateVersion?: string;
  currentTemplateVersion?: string;
  changes: string[];
  hasLocalFile?: boolean;
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
  const previews = Object.entries(state.managedFiles).map(([relativePath, managedFile]) =>
    getManagedFileSyncPreview({
      rootPath,
      manifest,
      relativePath,
      managedFile,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
    })
  );

  const expectedTargets = getWorkflowTargets(
    rootPath,
    getSelectedAgentsFromState(state),
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills
  );

  for (const target of expectedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);

    if (state.managedFiles[relativePath]) {
      continue;
    }

    const template = manifest.templates[target.templateRelativePath];

    if (!template) {
      previews.push({
        relativePath,
        managedFile: {
          template: target.templateRelativePath,
          templateVersion: 'unknown',
          sha256: '',
        },
        status: 'unknown-template',
        changes: [],
        hasLocalFile: fs.existsSync(target.targetPath),
      });
      continue;
    }

    previews.push({
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
    });
  }

  return previews;
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
}: {
  rootPath: string;
  manifest: TemplateManifest;
  relativePath: string;
  managedFile: ManagedFileState;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
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
  });
  const hasUpdate = hasTemplateUpdate || hasSelectionUpdate;
  const changes = hasTemplateUpdate ? template.changes : ['Refreshes generated skill routing for the current selected skills.'];

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

function hasRenderedSelectionUpdate({
  relativePath,
  currentPath,
  managedFile,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills,
}: {
  relativePath: string;
  currentPath: string;
  managedFile: ManagedFileState;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
}): boolean {
  if (relativePath !== 'AGENTS.md') {
    return false;
  }

  const renderedContents = renderTemplateForSync({
    templateRelativePath: managedFile.template,
    currentPath,
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
  });

  return sha256(renderedContents) !== managedFile.sha256;
}
