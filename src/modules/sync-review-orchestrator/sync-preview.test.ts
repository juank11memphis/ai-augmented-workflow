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
import { addSafeManagedConfigSnapshots } from './managed-config-migration.js';
import { getSyncPreviews } from './sync-preview.js';
import { getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';

const SAD_SKILL_PATH = '.agents/skills/software-architecture-writer/SKILL.md';
const SAD_TEMPLATE_PATH = 'skills/software-architecture-writer/SKILL.md';
const SAD_DOCUMENT_PATH = 'docs/architecture.md';
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getSyncPreviews', () => {
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

  it('ignores host-added Codex approvals and preserves them during a managed template update', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const configPath = path.join(rootPath, '.codex/config.toml');
    fs.appendFileSync(configPath, '\n[mcp_servers.github.tools.create_pull_request]\napproval_mode = "approve"\n', 'utf8');
    const state = readState(rootPath);
    assert.equal(getSyncPreview(rootPath, state, '.codex/config.toml').status, 'up-to-date');

    const manifest = readTemplateManifest();
    manifest.templates['.codex/config.toml'] = { ...manifest.templates['.codex/config.toml']!, version: '999' };
    const preview = getSyncPreview(rootPath, state, '.codex/config.toml', manifest);
    assert.equal(preview.status, 'update-available');
    const applied = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
    assert.match(fs.readFileSync(configPath, 'utf8'), /\[mcp_servers\.github\.tools\.create_pull_request\]\napproval_mode = "approve"/);
    assert.equal(applied.state.managedFiles['.codex/config.toml']?.templateVersion, '999');
  });

  it('migrates legacy Codex config ownership without including host-added approvals', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const configPath = path.join(rootPath, '.codex/config.toml');
    fs.appendFileSync(configPath, '\n[mcp_servers.github.tools.create_pull_request]\napproval_mode = "approve"\n', 'utf8');
    const state = readState(rootPath);
    delete state.managedFiles['.codex/config.toml'].managedEntries;
    const manifest = readTemplateManifest();

    assert.equal(addSafeManagedConfigSnapshots(rootPath, state, manifest), true);
    assert.equal(getSyncPreview(rootPath, state, '.codex/config.toml', manifest).status, 'up-to-date');
    assert.equal(Object.keys(state.managedFiles['.codex/config.toml'].managedEntries ?? {}).some((key) => key.includes('create_pull_request')), false);
  });

  it('keeps a reviewed edit to a Sibu-owned setting without repeated prompts or unsafe updates', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const configPath = path.join(rootPath, '.codex/config.toml');
    fs.writeFileSync(configPath, fs.readFileSync(configPath, 'utf8').replace('enabled = true', 'enabled = false'));
    const state = readState(rootPath);
    const manifest = readTemplateManifest();
    const preview = getSyncPreview(rootPath, state, '.codex/config.toml', manifest);
    assert.equal(preview.status, 'modified');

    const reviewed = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });
    assert.equal(reviewed.state.managedFiles['.codex/config.toml']?.managedEntriesProtected, true);
    assert.equal(getSyncPreview(rootPath, reviewed.state, '.codex/config.toml', manifest).status, 'up-to-date');

    manifest.templates['.codex/config.toml'] = { ...manifest.templates['.codex/config.toml']!, version: '999' };
    assert.equal(getSyncPreview(rootPath, reviewed.state, '.codex/config.toml', manifest).status, 'modified-with-update');
    assert.match(fs.readFileSync(configPath, 'utf8'), /enabled = false/);
  });

  it('requires review before removing a selected MCP server that still has host approvals', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const configPath = path.join(rootPath, '.codex/config.toml');
    fs.appendFileSync(configPath, '\n[mcp_servers.github.tools.merge_pull_request]\napproval_mode = "approve"\n', 'utf8');
    const state = readState(rootPath);
    state.selectedMcpServers = [];

    const preview = getSyncPreview(rootPath, state, '.codex/config.toml');
    assert.equal(preview.status, 'modified-with-update');
    assert.match(fs.readFileSync(configPath, 'utf8'), /merge_pull_request/);
  });

  it('respects unmanaged status for selected MCP config files', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    fs.rmSync(path.join(rootPath, '.mcp.json'));
    const state = readState(rootPath);
    state.managedFiles['.mcp.json'].status = 'unmanaged';

    const preview = getSyncPreview(rootPath, state, '.mcp.json');

    assert.equal(preview.status, 'unmanaged');
  });

  it('reports stale MCP-managed setting evidence as a local edit', () => {
    const rootPath = createCleanInitializedRepoWithGithubMcp();
    const state = readState(rootPath);
    const managedEntries = state.managedFiles['.mcp.json'].managedEntries;
    assert.ok(managedEntries);
    managedEntries[Object.keys(managedEntries)[0]!] = 'old-hash';

    const preview = getSyncPreview(rootPath, state, '.mcp.json');

    assert.equal(preview.status, 'modified');
    assert.deepEqual(preview.changes, []);
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
      changes: ['Requires a human decision after every specialist review and authorized repair.'],
    };

    const preview = getSyncPreview(rootPath, state, relativePath, manifest);

    assert.equal(preview.status, 'modified-with-update');
    assert.deepEqual(preview.changes, ['Requires a human decision after every specialist review and authorized repair.']);

    const reviewed = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });

    assert.equal(reviewed.changedFiles, false);
    assert.equal(reviewed.state.managedFiles[relativePath]?.status, 'customized');
    assert.equal(reviewed.state.managedFiles[relativePath]?.lastReviewedTemplateVersion, '999');
    assert.match(fs.readFileSync(targetPath, 'utf8'), /Local executor customization/);
  });

  it('previews the current SDD writer update and preserves reviewed local guidance', () => {
    const rootPath = createCleanInitializedRepo();
    const state = readState(rootPath);
    const manifest = readTemplateManifest();
    const relativePath = '.agents/skills/software-design-writer/SKILL.md';
    const templatePath = 'skills/software-design-writer/SKILL.md';
    const targetPath = path.join(rootPath, relativePath);
    const currentTemplate = manifest.templates[templatePath];
    assert.ok(currentTemplate);
    assert.match(currentTemplate.changes.join(' '), /individual Mermaid diagrams/);
    state.managedFiles[relativePath].templateVersion = '1';
    fs.appendFileSync(targetPath, '\nLocal SDD writer guidance.\n', 'utf8');
    const localBytes = fs.readFileSync(targetPath);

    const preview = getSyncPreview(rootPath, state, relativePath, manifest);

    assert.equal(preview.status, 'modified-with-update');
    assert.equal(preview.managedFile.template, templatePath);
    assert.equal(preview.currentTemplateVersion, currentTemplate.version);
    assert.deepEqual(preview.changes, currentTemplate.changes);

    const reviewed = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });

    assert.equal(reviewed.changedFiles, false);
    assert.equal(reviewed.changedState, true);
    assert.deepEqual(fs.readFileSync(targetPath), localBytes);
    assert.equal(reviewed.state.managedFiles[relativePath]?.status, 'customized');
    assert.equal(reviewed.state.managedFiles[relativePath]?.lastReviewedTemplateVersion, currentTemplate.version);
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
