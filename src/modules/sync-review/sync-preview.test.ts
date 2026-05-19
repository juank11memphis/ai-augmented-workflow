import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SELECTABLE_MCP_SERVERS, SUPPORTED_AGENTS } from '../workflow-target-planning/index.js';
import { readTemplateManifest } from '../template-catalog-rendering/index.js';
import type { McpServerId, SibuState, SupportedAgent } from '../../shared/types.js';
import { applySyncAction } from './apply-action.js';
import { getSyncPreviews } from './sync-preview.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../workflow-target-planning/index.js';

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

  it('reports selected MCP config as a new managed template when older state has no record', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const state = readState(rootPath);
    delete state.managedFiles['.mcp.json'];

    const preview = getSyncPreview(rootPath, state, '.mcp.json');

    assert.equal(preview.status, 'new-template');
    assert.equal(preview.managedFile.template, 'mcp/claude/.mcp.json');
    assert.equal(preview.hasLocalFile, true);
  });

  it('reports selected MCP config as missing when the managed file is removed', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    fs.rmSync(path.join(rootPath, '.mcp.json'));

    const preview = getSyncPreview(rootPath, readState(rootPath), '.mcp.json');

    assert.equal(preview.status, 'missing');
    assert.equal(preview.managedFile.template, 'mcp/claude/.mcp.json');
    assert.equal(preview.hasLocalFile, false);
  });

  it('reports selected MCP config as modified when the managed file has local edits', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    fs.appendFileSync(path.join(rootPath, '.mcp.json'), '\nLocal edit.\n', 'utf8');

    const preview = getSyncPreview(rootPath, readState(rootPath), '.mcp.json');

    assert.equal(preview.status, 'modified');
    assert.equal(preview.managedFile.template, 'mcp/claude/.mcp.json');
    assert.equal(preview.hasLocalFile, true);
  });

  it('respects unmanaged status for selected MCP config files', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    fs.rmSync(path.join(rootPath, '.mcp.json'));
    const state = readState(rootPath);
    state.managedFiles['.mcp.json'].status = 'unmanaged';

    const preview = getSyncPreview(rootPath, state, '.mcp.json');

    assert.equal(preview.status, 'unmanaged');
  });

  it('renders selected MCP config content for stale MCP managed files', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const state = readState(rootPath);
    state.managedFiles['.mcp.json'].sha256 = 'old-hash';

    const preview = getSyncPreview(rootPath, state, '.mcp.json');

    assert.equal(preview.status, 'modified-with-update');
    assert.deepEqual(preview.changes, ['Refreshes generated MCP configuration for the current selected MCP servers.']);
  });

  it('offers Export to GitHub adoption when GitHub MCP is already selected', () => {
    const rootPath = createCleanInitializedRepoWithSelectedMcpServers(['github']);
    const state = readState(rootPath);

    const skillPreview = getSyncPreview(rootPath, state, '.agents/skills/export-to-github/SKILL.md');
    const agentsPreview = getSyncPreview(rootPath, state, 'AGENTS.md');

    assert.equal(skillPreview.status, 'new-template');
    assert.equal(skillPreview.managedFile.template, 'skills/export-to-github/SKILL.md');
    assert.equal(skillPreview.impliedWorkflowSkillId, 'export-to-github');
    assert.equal(skillPreview.hasLocalFile, false);
    assert.equal(agentsPreview.status, 'update-available');
    assert.deepEqual(agentsPreview.changes, ['Refreshes generated skill routing for the current selected skills.']);
  });

  it('offers Export to Notion adoption when Notion MCP is already selected', () => {
    const rootPath = createCleanInitializedRepoWithSelectedMcpServers(['notion']);
    const state = readState(rootPath);

    const skillPreview = getSyncPreview(rootPath, state, '.agents/skills/export-to-notion/SKILL.md');
    const agentsPreview = getSyncPreview(rootPath, state, 'AGENTS.md');

    assert.equal(skillPreview.status, 'new-template');
    assert.equal(skillPreview.managedFile.template, 'skills/export-to-notion/SKILL.md');
    assert.equal(skillPreview.impliedWorkflowSkillId, 'export-to-notion');
    assert.equal(skillPreview.hasLocalFile, false);
    assert.equal(agentsPreview.status, 'update-available');
    assert.deepEqual(agentsPreview.changes, ['Refreshes generated skill routing for the current selected skills.']);
  });

  it('records the implied exporter skill only when sync adoption is applied', () => {
    const rootPath = createCleanInitializedRepoWithSelectedMcpServers(['github']);
    const state = readState(rootPath);
    const manifest = readTemplateManifest();
    const skillPreview = getSyncPreview(rootPath, state, '.agents/skills/export-to-github/SKILL.md');

    const skipped = applySyncAction({ rootPath, state, manifest, preview: skillPreview, action: 'skip' });
    const applied = applySyncAction({ rootPath, state, manifest, preview: skillPreview, action: 'apply-update' });

    assert.equal(skipped.changedState, false);
    assert.deepEqual(skipped.state.selectedWorkflowSkills, []);
    assert.deepEqual(applied.state.selectedWorkflowSkills, ['export-to-github']);
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/export-to-github/SKILL.md')), true);
    assert.ok(applied.state.managedFiles['.agents/skills/export-to-github/SKILL.md']);
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

function createCleanInitializedRepoWithGithubMcp(): string {
  return createCleanInitializedRepoWithSelectedMcpServers(SELECTABLE_MCP_SERVERS.map((server) => server.id));
}

function createCleanInitializedRepoWithSelectedMcpServers(selectedMcpServerIds: McpServerId[]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-preview-mcp-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini'), getSupportedAgent('windsurf')];
  const selectedMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => selectedMcpServerIds.includes(server.id));
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], undefined, [], [], selectedMcpServers);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedMcpServers,
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
    selectedMcpServers,
    targets,
  });

  return rootPath;
}

function getProductContextSkillPreview(rootPath: string, state: SibuState) {
  const preview = getSyncPreview(rootPath, state, DEEP_MODULE_SKILL_PATH);

  const previews = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() });
  assert.equal(previews.some((syncPreview) => syncPreview.relativePath === DEEP_MODULE_MAP_PATH), false);

  return preview;
}

function getSyncPreview(rootPath: string, state: SibuState, relativePath: string) {
  const previews = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() });
  const preview = previews.find((syncPreview) => syncPreview.relativePath === relativePath);

  assert.ok(preview, `Missing sync preview for ${relativePath}`);

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
