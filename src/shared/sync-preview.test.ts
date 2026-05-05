import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SUPPORTED_AGENTS } from './catalog.js';
import { readTemplateManifest } from '../modules/template-catalog-rendering/index.js';
import type { SibuState, SupportedAgent } from './types.js';
import { getSyncPreviews } from './sync-preview.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from './workflow-targets.js';

const DEEP_MODULE_SKILL_PATH = '.agents/skills/deep-module-map-writer/SKILL.md';
const DEEP_MODULE_TEMPLATE_PATH = 'skills/deep-module-map-writer/SKILL.md';
const DEEP_MODULE_MAP_PATH = 'docs/deep-module-map.md';
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getSyncPreviews', () => {
  it('reports the required Deep Module Map writer as a new managed template for older state', () => {
    const rootPath = createCleanInitializedRepo();
    const statePath = path.join(rootPath, '.sibu/state.json');
    const state = readState(rootPath);
    delete state.managedFiles[DEEP_MODULE_SKILL_PATH];
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

    const preview = getProductContextSkillPreview(rootPath, state);

    assert.equal(preview.status, 'new-template');
    assert.equal(preview.managedFile.template, DEEP_MODULE_TEMPLATE_PATH);
    assert.equal(preview.hasLocalFile, true);
    assert.deepEqual(preview.changes, readTemplateManifest().templates[DEEP_MODULE_TEMPLATE_PATH]?.changes);
  });

  it('reports the required Deep Module Map writer as missing when the managed file is removed', () => {
    const rootPath = createCleanInitializedRepo();
    fs.rmSync(path.join(rootPath, DEEP_MODULE_SKILL_PATH));

    const preview = getProductContextSkillPreview(rootPath, readState(rootPath));

    assert.equal(preview.status, 'missing');
    assert.equal(preview.managedFile.template, DEEP_MODULE_TEMPLATE_PATH);
    assert.equal(preview.hasLocalFile, false);
  });

  it('reports the required Deep Module Map writer as modified when the managed file has local edits', () => {
    const rootPath = createCleanInitializedRepo();
    fs.appendFileSync(path.join(rootPath, DEEP_MODULE_SKILL_PATH), '\nLocal edit.\n', 'utf8');

    const preview = getProductContextSkillPreview(rootPath, readState(rootPath));

    assert.equal(preview.status, 'modified');
    assert.equal(preview.managedFile.template, DEEP_MODULE_TEMPLATE_PATH);
    assert.equal(preview.hasLocalFile, true);
  });
});

function createCleanInitializedRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-preview-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const targets = getWorkflowTargets(rootPath, selectedAgents);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
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
    targets,
  });

  return rootPath;
}

function getProductContextSkillPreview(rootPath: string, state: SibuState) {
  const previews = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() });
  const preview = previews.find((syncPreview) => syncPreview.relativePath === DEEP_MODULE_SKILL_PATH);

  assert.ok(preview, `Missing sync preview for ${DEEP_MODULE_SKILL_PATH}`);
  assert.equal(previews.some((syncPreview) => syncPreview.relativePath === DEEP_MODULE_MAP_PATH), false);

  return preview;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
