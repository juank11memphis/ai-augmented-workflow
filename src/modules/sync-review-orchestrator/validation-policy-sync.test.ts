import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SUPPORTED_AGENTS,
  getWorkflowTargets,
  readTemplateManifest,
  renderMissingWorkflowFiles,
} from '../template-catalog/index.js';
import { writeSibuState } from '../workflow-state-ledger/index.js';
import { applySyncAction } from './apply-action.js';
import { getSyncPreviews } from './sync-preview.js';

const VALIDATION_SKILL_CASES = [
  skillCase('ai-implementation-planner', '23'),
  skillCase('ai-implementation-planner-toolbox', '10'),
  skillCase('ai-implementation-plan-executor', '36'),
  skillCase('ai-implementation-executor-toolbox', '14'),
] as const;
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('repository-aware validation guidance lifecycle', () => {
  it('offers meaningful notes and safely applies all four managed skill updates', () => {
    for (const validationSkill of VALIDATION_SKILL_CASES) {
      const rootPath = createInitializedProject();
      const state = readState(rootPath);
      const staleContents = seedManagedStaleContent(rootPath, state, validationSkill);

      const preview = findManagedPreview(rootPath, state, validationSkill);
      assert.equal(preview.status, 'update-available');
      assert.match(preview.changes.join('\n'), /verified story-specific|foreground progress|Removes|reviewers|architecture review packet|plan review of the exact Story version|checked.Task|next Story or Epic|Milestone|human decision|expected touchpoints|owning area|adjacent Task files/i);

      const applied = applySyncAction({
        rootPath,
        state,
        manifest: readTemplateManifest(),
        preview,
        action: 'apply-update',
      });

      const installed = fs.readFileSync(path.join(rootPath, validationSkill.path), 'utf8');
      assert.notEqual(installed, staleContents);
      assert.match(installed, /## Repository-aware validation policy/);
      assert.equal(applied.state.managedFiles[validationSkill.path]?.status, 'managed');
      assert.equal(applied.state.managedFiles[validationSkill.path]?.templateVersion, preview.currentTemplateVersion);
      assert.equal(applied.state.managedFiles[validationSkill.path]?.sha256, sha256(installed));
    }
  });

  it('preserves customized bytes while recording review of the current policy', () => {
    for (const validationSkill of VALIDATION_SKILL_CASES) {
      const rootPath = createInitializedProject();
      const state = readState(rootPath);
      const targetPath = path.join(rootPath, validationSkill.path);
      const staleContents = seedManagedStaleContent(rootPath, state, validationSkill);
      const customizedContents = `${staleContents}\nLocal validation policy.\n`;
      fs.writeFileSync(targetPath, customizedContents, 'utf8');

      const preview = findManagedPreview(rootPath, state, validationSkill);
      assert.equal(preview.status, 'modified-with-update');

      const reviewed = applySyncAction({
        rootPath,
        state,
        manifest: readTemplateManifest(),
        preview,
        action: 'mark-reviewed',
      });

      assert.equal(reviewed.changedFiles, false);
      assert.equal(reviewed.state.managedFiles[validationSkill.path]?.status, 'customized');
      assert.equal(reviewed.state.managedFiles[validationSkill.path]?.lastReviewedTemplateVersion, preview.currentTemplateVersion);
      assert.equal(reviewed.state.managedFiles[validationSkill.path]?.sha256, sha256(customizedContents));
      assert.equal(fs.readFileSync(targetPath, 'utf8'), customizedContents);
    }
  });
});

function skillCase(skillName: string, previousVersion: string) {
  return {
    path: `.agents/skills/${skillName}/SKILL.md`,
    template: `skills/${skillName}/SKILL.md`,
    previousVersion,
  } as const;
}

function seedManagedStaleContent(
  rootPath: string,
  state: SibuState,
  validationSkill: (typeof VALIDATION_SKILL_CASES)[number],
): string {
  const staleContents = `# Pre-update fixture\n\nStale managed content for ${validationSkill.template}.\n`;
  fs.writeFileSync(path.join(rootPath, validationSkill.path), staleContents, 'utf8');
  state.managedFiles[validationSkill.path] = {
    template: validationSkill.template,
    templateVersion: validationSkill.previousVersion,
    sha256: sha256(staleContents),
    status: 'managed',
  };
  return staleContents;
}

function createInitializedProject(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-validation-policy-sync-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [SUPPORTED_AGENTS.find(({ id }) => id === 'codex')!];
  const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS.find(({ id }) => id === 'command-pattern');
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Validation policy lifecycle fixture.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }
  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill,
    targets,
  });
  return rootPath;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function findManagedPreview(
  rootPath: string,
  state: SibuState,
  validationSkill: (typeof VALIDATION_SKILL_CASES)[number],
) {
  const preview = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() })
    .find(({ relativePath }) => relativePath === validationSkill.path);
  assert.ok(preview);
  assert.equal(preview.managedFile.template, validationSkill.template);
  return preview;
}
