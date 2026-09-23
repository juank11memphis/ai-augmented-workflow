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

const TIMING_SKILL_CASES = [
  {
    path: '.agents/skills/ai-implementation-plan-executor/SKILL.md',
    template: 'skills/ai-implementation-plan-executor/SKILL.md',
    previousVersion: '35',
    expectedContents: /## Automated-run timing contract/,
  },
  {
    path: '.agents/skills/ai-implementation-planner-toolbox/SKILL.md',
    template: 'skills/ai-implementation-planner-toolbox/SKILL.md',
    previousVersion: '9',
    expectedContents: /timing-only child evidence item/,
  },
  {
    path: '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
    template: 'skills/ai-implementation-executor-toolbox/SKILL.md',
    previousVersion: '13',
    expectedContents: /### Timing evidence/,
  },
] as const;
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('implementation timing managed lifecycle', () => {
  it('offers timing-specific notes and safely applies every timing skill update', () => {
    for (const timingSkill of TIMING_SKILL_CASES) {
      const rootPath = createInitializedProject();
      const state = readState(rootPath);
      const staleContents = seedManagedStaleContent(rootPath, state, timingSkill);

      const preview = findManagedPreview(rootPath, state, timingSkill.path, timingSkill.template);
      assert.equal(preview.status, 'update-available');
      assert.ok(preview.changes.some((change) => change.trim().length > 0));

      const applied = applySyncAction({
        rootPath,
        state,
        manifest: readTemplateManifest(),
        preview,
        action: 'apply-update',
      });

      const installed = fs.readFileSync(path.join(rootPath, timingSkill.path), 'utf8');
      assert.notEqual(installed, staleContents);
      assert.match(installed, timingSkill.expectedContents);
      assert.equal(applied.state.managedFiles[timingSkill.path]?.status, 'managed');
      assert.equal(applied.state.managedFiles[timingSkill.path]?.templateVersion, preview.currentTemplateVersion);
      assert.equal(applied.state.managedFiles[timingSkill.path]?.sha256, sha256(installed));
      assert.equal(JSON.stringify(applied.state).includes('startedAtEpochMs'), false);
      assert.equal(JSON.stringify(applied.state).includes('phases'), false);
    }
  });

  it('protects customized stale timing skills while recording review of current timing notes', () => {
    for (const timingSkill of TIMING_SKILL_CASES) {
      const rootPath = createInitializedProject();
      const state = readState(rootPath);
      const targetPath = path.join(rootPath, timingSkill.path);
      const staleContents = seedManagedStaleContent(rootPath, state, timingSkill);
      const customizedContents = `${staleContents}\nLocal workflow policy for ${timingSkill.path}.\n`;
      fs.writeFileSync(targetPath, customizedContents, 'utf8');

      const preview = findManagedPreview(rootPath, state, timingSkill.path, timingSkill.template);
      assert.equal(preview.status, 'modified-with-update');

      const reviewed = applySyncAction({
        rootPath,
        state,
        manifest: readTemplateManifest(),
        preview,
        action: 'mark-reviewed',
      });

      assert.equal(reviewed.changedFiles, false);
      assert.equal(reviewed.state.managedFiles[timingSkill.path]?.status, 'customized');
      assert.equal(reviewed.state.managedFiles[timingSkill.path]?.lastReviewedTemplateVersion, preview.currentTemplateVersion);
      assert.equal(reviewed.state.managedFiles[timingSkill.path]?.sha256, sha256(customizedContents));
      assert.equal(fs.readFileSync(targetPath, 'utf8'), customizedContents);
    }
  });
});

function seedManagedStaleContent(
  rootPath: string,
  state: SibuState,
  timingSkill: (typeof TIMING_SKILL_CASES)[number],
): string {
  const staleContents = `# Pre-update timing fixture\n\nStale managed content for ${timingSkill.template}.\n`;
  fs.writeFileSync(path.join(rootPath, timingSkill.path), staleContents, 'utf8');
  state.managedFiles[timingSkill.path] = {
    template: timingSkill.template,
    templateVersion: timingSkill.previousVersion,
    sha256: sha256(staleContents),
    status: 'managed',
  };
  return staleContents;
}

function createInitializedProject(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-timing-sync-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [SUPPORTED_AGENTS.find(({ id }) => id === 'codex')!];
  const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS.find(({ id }) => id === 'command-pattern');
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Timing lifecycle fixture.',
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

function findManagedPreview(rootPath: string, state: SibuState, managedPath: string, templatePath: string) {
  const preview = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() })
    .find(({ relativePath }) => relativePath === managedPath);
  assert.ok(preview);
  assert.equal(preview.managedFile.template, templatePath);
  return preview;
}
