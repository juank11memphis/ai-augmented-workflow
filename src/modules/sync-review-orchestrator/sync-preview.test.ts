import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { writeSibuState } from '../workflow-state-ledger/index.js';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_MCP_SERVERS, SELECTABLE_WORKFLOW_SKILLS, SUPPORTED_AGENTS } from '../template-catalog/index.js';
import { readTemplateManifest } from '../template-catalog/index.js';
import type { McpServerId, SibuState, SupportedAgent } from '../../shared/types.js';
import { applySyncAction } from './apply-action.js';
import { getSyncPreviews } from './sync-preview.js';
import { getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';

const SAD_SKILL_PATH = '.agents/skills/software-architecture-writer/SKILL.md';
const SAD_TEMPLATE_PATH = 'skills/software-architecture-writer/SKILL.md';
const SAD_DOCUMENT_PATH = 'docs/architecture.md';
const TIMING_HELPER_PATH = '.agents/scripts/implementation-phase-timing.mjs';
const TIMING_HELPER_TEMPLATE = 'scripts/implementation-phase-timing.mjs';
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getSyncPreviews', () => {
  it('offers and applies the new timing helper for an older initialized project', () => {
    const rootPath = createCleanInitializedRepo();
    const state = readState(rootPath);
    delete state.managedFiles[TIMING_HELPER_PATH];
    fs.rmSync(path.join(rootPath, TIMING_HELPER_PATH));

    const preview = getSyncPreview(rootPath, state, TIMING_HELPER_PATH);

    assert.equal(preview.status, 'new-template');
    assert.equal(preview.managedFile.template, TIMING_HELPER_TEMPLATE);
    assert.equal(preview.hasLocalFile, false);
    assert.deepEqual(preview.changes, readTemplateManifest().templates[TIMING_HELPER_TEMPLATE]?.changes);

    const applied = applySyncAction({
      rootPath,
      state,
      manifest: readTemplateManifest(),
      preview,
      action: 'apply-update',
    });
    assert.equal(fs.existsSync(path.join(rootPath, TIMING_HELPER_PATH)), true);
    assert.equal(applied.state.managedFiles[TIMING_HELPER_PATH]?.template, TIMING_HELPER_TEMPLATE);
    assert.equal(applied.state.managedFiles[TIMING_HELPER_PATH]?.status, 'managed');
  });

  it('reports the required Software Architecture Document writer as a new managed template for older state', () => {
    const rootPath = createCleanInitializedRepo();
    const statePath = path.join(rootPath, '.sibu/state.json');
    const state = readState(rootPath);
    delete state.managedFiles[SAD_SKILL_PATH];
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

    const preview = getProductContextSkillPreview(rootPath, state);

    assert.equal(preview.status, 'new-template');
    assert.equal(preview.managedFile.template, SAD_TEMPLATE_PATH);
    assert.equal(preview.hasLocalFile, true);
    assert.deepEqual(preview.changes, readTemplateManifest().templates[SAD_TEMPLATE_PATH]?.changes);
  });

  it('reports the required Software Architecture Document writer as missing when the managed file is removed', () => {
    const rootPath = createCleanInitializedRepo();
    fs.rmSync(path.join(rootPath, SAD_SKILL_PATH));

    const preview = getProductContextSkillPreview(rootPath, readState(rootPath));

    assert.equal(preview.status, 'missing');
    assert.equal(preview.managedFile.template, SAD_TEMPLATE_PATH);
    assert.equal(preview.hasLocalFile, false);
  });

  it('reports the required Software Architecture Document writer as modified when the managed file has local edits', () => {
    const rootPath = createCleanInitializedRepo();
    fs.appendFileSync(path.join(rootPath, SAD_SKILL_PATH), '\nLocal edit.\n', 'utf8');

    const preview = getProductContextSkillPreview(rootPath, readState(rootPath));

    assert.equal(preview.status, 'modified');
    assert.equal(preview.managedFile.template, SAD_TEMPLATE_PATH);
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

  it('reports managed session-start hooks as missing when removed', () => {
    const rootPath = createCleanInitializedRepo();
    fs.rmSync(path.join(rootPath, '.codex/hooks.json'));

    const preview = getSyncPreview(rootPath, readState(rootPath), '.codex/hooks.json');

    assert.equal(preview.status, 'missing');
    assert.equal(preview.managedFile.template, '.codex/hooks.json');
    assert.equal(preview.hasLocalFile, false);
  });

  it('reports managed session-start hook template updates with manifest change notes', () => {
    const rootPath = createCleanInitializedRepo();
    const state = readState(rootPath);
    const manifest = readTemplateManifest();
    manifest.templates['.codex/hooks.json'] = {
      version: '999',
      description: 'Updated Codex SessionStart hook configuration.',
      changes: ['Refreshes the managed Codex SessionStart hook.'],
    };

    const preview = getSyncPreview(rootPath, state, '.codex/hooks.json', manifest);

    assert.equal(preview.status, 'update-available');
    assert.equal(preview.managedFile.template, '.codex/hooks.json');
    assert.deepEqual(preview.changes, ['Refreshes the managed Codex SessionStart hook.']);
  });

  it('previews executor contract update notes and preserves reviewed customization', () => {
    const rootPath = createCleanInitializedRepo();
    const state = readState(rootPath);
    const manifest = readTemplateManifest();
    const relativePath = '.agents/skills/ai-implementation-plan-executor/SKILL.md';
    const targetPath = path.join(rootPath, relativePath);
    const localCustomization = '\nLocal executor customization.\n';
    fs.appendFileSync(targetPath, localCustomization, 'utf8');
    manifest.templates['skills/ai-implementation-plan-executor/SKILL.md'] = {
      ...manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']!,
      version: '999',
      changes: ['Adds synchronized specialist review and bounded fresh repair.'],
    };

    const preview = getSyncPreview(rootPath, state, relativePath, manifest);

    assert.equal(preview.status, 'modified-with-update');
    assert.deepEqual(preview.changes, ['Adds synchronized specialist review and bounded fresh repair.']);

    const reviewed = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });

    assert.equal(reviewed.changedFiles, false);
    assert.equal(reviewed.state.managedFiles[relativePath]?.status, 'customized');
    assert.equal(reviewed.state.managedFiles[relativePath]?.lastReviewedTemplateVersion, '999');
    assert.match(fs.readFileSync(targetPath, 'utf8'), /Local executor customization/);
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

  it('offers supplemental targets when adopting an implied exporter workflow skill', () => {
    const exportToNotion = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-notion');

    assert.ok(exportToNotion);

    const originalSupplementalTargets = exportToNotion.supplementalTargetsByAgent;
    exportToNotion.supplementalTargetsByAgent = {
      codex: [
        {
          templateRelativePath: 'skills/export-to-notion/SKILL.md',
          targetRelativePath: '.codex/agents/notion-exporter.toml',
        },
      ],
    };

    try {
      const rootPath = createCleanInitializedRepoWithSelectedMcpServers(['notion']);
      const state = readState(rootPath);
      const manifest = readTemplateManifest();
      manifest.templates['skills/export-to-notion/SKILL.md'] = {
        version: 'test',
        description: 'Test supplemental target.',
        changes: ['Adds a test supplemental target.'],
      };

      const supplementalPreview = getSyncPreview(rootPath, state, '.codex/agents/notion-exporter.toml', manifest);

      assert.equal(supplementalPreview.status, 'new-template');
      assert.equal(supplementalPreview.managedFile.template, 'skills/export-to-notion/SKILL.md');
      assert.equal(supplementalPreview.impliedWorkflowSkillId, 'export-to-notion');
      assert.equal(supplementalPreview.hasLocalFile, false);
    } finally {
      exportToNotion.supplementalTargetsByAgent = originalSupplementalTargets;
    }
  });

  it('offers selected architecture guidance and routing previews after missing-architecture repair', () => {
    const rootPath = createCleanInitializedRepo();
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[1];
    const state = {
      ...readState(rootPath),
      selectedArchitectureSkill: selectedArchitectureSkill.id,
    };
    const manifest = readTemplateManifest();
    state.managedFiles['AGENTS.md'].templateVersion = manifest.templates[state.managedFiles['AGENTS.md'].template]?.version ?? state.managedFiles['AGENTS.md'].templateVersion;
    const architectureTargetPath = selectedArchitectureSkill.targetRelativePathsByAgent.codex;
    assert.ok(architectureTargetPath);

    const skillPreview = getSyncPreview(rootPath, state, architectureTargetPath, manifest);
    const agentsPreview = getSyncPreview(rootPath, state, 'AGENTS.md', manifest);

    assert.equal(skillPreview.status, 'new-template');
    assert.equal(skillPreview.managedFile.template, selectedArchitectureSkill.templateRelativePath);
    assert.equal(skillPreview.hasLocalFile, false);
    assert.equal(agentsPreview.status, 'update-available');
    assert.deepEqual(agentsPreview.changes, ['Refreshes generated skill routing for the current selected skills.']);
  });

  it('applies normal sync actions to create repaired architecture guidance', () => {
    const rootPath = createCleanInitializedRepo();
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[1];
    const state = {
      ...readState(rootPath),
      selectedArchitectureSkill: selectedArchitectureSkill.id,
    };
    const manifest = readTemplateManifest();
    const architectureTargetPath = selectedArchitectureSkill.targetRelativePathsByAgent.codex;
    assert.ok(architectureTargetPath);
    const skillPreview = getSyncPreview(rootPath, state, architectureTargetPath, manifest);

    const applied = applySyncAction({ rootPath, state, manifest, preview: skillPreview, action: 'apply-update' });

    assert.equal(applied.changedFiles, true);
    assert.equal(applied.changedState, true);
    assert.equal(fs.existsSync(path.join(rootPath, architectureTargetPath)), true);
    assert.equal(applied.state.selectedArchitectureSkill, selectedArchitectureSkill.id);
    assert.equal(applied.state.managedFiles[architectureTargetPath]?.template, selectedArchitectureSkill.templateRelativePath);
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
  const selectedAgents = [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')];
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
  const preview = getSyncPreview(rootPath, state, SAD_SKILL_PATH);

  const previews = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() });
  assert.equal(previews.some((syncPreview) => syncPreview.relativePath === SAD_DOCUMENT_PATH), false);

  return preview;
}

function getSyncPreview(rootPath: string, state: SibuState, relativePath: string, manifest = readTemplateManifest()) {
  const previews = getSyncPreviews({ rootPath, state, manifest });
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
