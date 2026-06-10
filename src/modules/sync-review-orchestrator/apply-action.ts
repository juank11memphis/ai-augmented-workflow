import fs from 'node:fs';
import path from 'node:path';

import { log } from '@clack/prompts';

import { sha256 } from '../../shared/hash.js';
import { getSideTemplatePath } from '../../shared/paths.js';
import { cloneState } from '../workflow-state-ledger/index.js';
import { getTemplateVersion } from '../template-catalog/index.js';
import { renderTemplateForSync } from '../template-catalog/index.js';
import type { SibuState, TemplateManifest } from '../../shared/types.js';
import {
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
} from '../template-catalog/index.js';
import type { SyncAction } from './action-prompt.js';
import type { SyncPreview } from './sync-preview.js';

export function applySyncAction({
  rootPath,
  state,
  manifest,
  preview,
  action,
}: {
  rootPath: string;
  state: SibuState;
  manifest: TemplateManifest;
  preview: SyncPreview;
  action: SyncAction;
}): { state: SibuState; changedFiles: boolean; changedState: boolean } {
  const nextState = cloneState(state);
  const managedFile = nextState.managedFiles[preview.relativePath] ?? preview.managedFile;
  const targetPath = path.join(rootPath, preview.relativePath);
  const currentTemplateVersion = preview.currentTemplateVersion ?? getTemplateVersion(manifest, managedFile.template);

  switch (action) {
    case 'apply-update': {
      recordImpliedWorkflowSkill(nextState, preview);
      const contents = renderTemplateForSync({
        templateRelativePath: managedFile.template,
        currentPath: targetPath,
        selectedLanguageSkills: getSelectedLanguageSkillsFromState(nextState),
        selectedFrameworkSkills: getSelectedFrameworkSkillsFromState(nextState),
        selectedArchitectureSkill: getSelectedArchitectureSkillFromState(nextState),
        selectedWorkflowSkills: getSelectedWorkflowSkillsFromState(nextState),
        selectedDatabaseSkills: getSelectedDatabaseSkillsFromState(nextState),
        selectedMcpServers: getSelectedMcpServersFromState(nextState),
      });
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, contents, 'utf8');
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        template: managedFile.template,
        templateVersion: currentTemplateVersion,
        sha256: sha256(contents),
        status: 'managed',
      };
      log.success(`Applied latest template to ${preview.relativePath}`);
      return { state: nextState, changedFiles: true, changedState: true };
    }
    case 'mark-reviewed': {
      recordImpliedWorkflowSkill(nextState, preview);
      const contents = fs.readFileSync(targetPath, 'utf8');
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        ...managedFile,
        sha256: sha256(contents),
        status: 'customized',
        lastReviewedTemplateVersion: currentTemplateVersion,
      };
      log.success(`Marked ${preview.relativePath} as reviewed.`);
      return { state: nextState, changedFiles: false, changedState: true };
    }
    case 'write-side-template': {
      const sideTemplatePath = getSideTemplatePath(rootPath, preview.relativePath, currentTemplateVersion);
      const contents = renderTemplateForSync({
        templateRelativePath: managedFile.template,
        currentPath: targetPath,
        selectedLanguageSkills: getSelectedLanguageSkillsFromState(state),
        selectedFrameworkSkills: getSelectedFrameworkSkillsFromState(state),
        selectedArchitectureSkill: getSelectedArchitectureSkillFromState(state),
        selectedWorkflowSkills: getSelectedWorkflowSkillsFromState(state),
        selectedDatabaseSkills: getSelectedDatabaseSkillsFromState(state),
        selectedMcpServers: getSelectedMcpServersFromState(state),
      });
      fs.mkdirSync(path.dirname(sideTemplatePath), { recursive: true });
      fs.writeFileSync(sideTemplatePath, contents, 'utf8');
      log.success(`Wrote latest template to ${path.relative(rootPath, sideTemplatePath)}`);
      log.info('Review it and copy over anything you want.');
      return { state, changedFiles: true, changedState: false };
    }
    case 'stop-managing': {
      const contents = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        ...managedFile,
        sha256: sha256(contents),
        status: 'unmanaged',
        lastReviewedTemplateVersion: currentTemplateVersion,
        reason: 'user opted out',
      };
      log.success(`Stopped managing ${preview.relativePath}.`);
      return { state: nextState, changedFiles: false, changedState: true };
    }
    case 'skip':
      return { state, changedFiles: false, changedState: false };
  }
}

function recordImpliedWorkflowSkill(state: SibuState, preview: SyncPreview): void {
  if (!preview.impliedWorkflowSkillId) {
    return;
  }

  if (state.selectedWorkflowSkills?.includes(preview.impliedWorkflowSkillId)) {
    return;
  }

  state.selectedWorkflowSkills = [...(state.selectedWorkflowSkills ?? []), preview.impliedWorkflowSkillId];
}
