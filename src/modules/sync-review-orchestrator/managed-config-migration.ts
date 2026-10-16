import fs from 'node:fs';
import path from 'node:path';

import { isSharedAgentConfig, managedConfigHasLocalEdits, managedConfigSnapshot } from '../agent-tool-configuration/managed-config.js';
import { renderTemplateForSync } from '../template-catalog/index.js';
import {
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
} from '../template-catalog/index.js';
import type { SibuState, TemplateManifest } from '../../shared/types.js';

export function addSafeManagedConfigSnapshots(rootPath: string, state: SibuState, manifest: TemplateManifest): boolean {
  let changed = false;
  for (const [relativePath, record] of Object.entries(state.managedFiles)) {
    if (!isSharedAgentConfig(record.template) || record.status === 'unmanaged' || record.managedEntries) continue;
    if (record.templateVersion !== manifest.templates[record.template]?.version) continue;
    const currentPath = path.join(rootPath, relativePath);
    if (!fs.existsSync(currentPath)) continue;
    const expectedContents = renderTemplateForSync({
      templateRelativePath: record.template,
      currentPath,
      selectedLanguageSkills: getSelectedLanguageSkillsFromState(state),
      selectedFrameworkSkills: getSelectedFrameworkSkillsFromState(state),
      selectedArchitectureSkill: getSelectedArchitectureSkillFromState(state),
      selectedWorkflowSkills: getSelectedWorkflowSkillsFromState(state),
      selectedDatabaseSkills: getSelectedDatabaseSkillsFromState(state),
      selectedMcpServers: getSelectedMcpServersFromState(state),
    });
    if (managedConfigHasLocalEdits({
      template: record.template,
      currentContents: fs.readFileSync(currentPath, 'utf8'),
      expectedContents,
      recordedVersionIsCurrent: true,
      recordedFileHash: record.sha256,
    })) continue;
    record.managedEntries = managedConfigSnapshot(record.template, expectedContents);
    record.managedRenderedEntries = managedConfigSnapshot(record.template, expectedContents);
    record.managedEntriesProtected = false;
    changed = true;
  }
  return changed;
}
