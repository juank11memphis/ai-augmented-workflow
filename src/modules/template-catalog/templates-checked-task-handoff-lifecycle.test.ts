import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';

import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import { handleInitProject } from '../workflow-installer/index.js';
import { diagnoseState } from '../workflow-health-inspector/index.js';
import { applySyncAction, getSyncPreviews } from '../sync-review-orchestrator/index.js';
import { readTemplate, readTemplateManifest, SELECTABLE_ARCHITECTURE_SKILLS, SUPPORTED_AGENTS } from './index.js';

const template = 'skills/ai-implementation-plan-executor/SKILL.md';
const installed = `.agents/${template}`;

async function initialize(t: TestContext): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-task-handoff-'));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const prior = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [SUPPORTED_AGENTS[0]!],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!,
      askForProjectOverview: async () => 'Synthetic local setup.',
    });
  } finally {
    process.chdir(prior);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

test('manifest versions and current sync note describe checked-Task output delivery', () => {
  const manifest = readTemplateManifest();
  assert.equal(manifest.templateVersion, '260');
  assert.equal(manifest.templates[template]?.version, '84');
  assert.deepEqual(manifest.templates[template]?.changes, [
    'Clarifies compact, medium, and wide checked Task handoff messages and pauses honestly on partial publication.',
  ]);
});

test('fake init and doctor install current guidance locally without GitHub access', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  assert.equal(fs.readFileSync(path.join(rootPath, installed), 'utf8'), readTemplate(template));
  assert.equal(state.managedFiles[installed]?.templateVersion, manifest.templates[template]?.version);
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('fake sync delivers current note and managed update without GitHub access', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  const oldBody = '# Prior synthetic handoff guidance\n';
  fs.writeFileSync(path.join(rootPath, installed), oldBody);
  state.managedFiles[installed] = {
    template, templateVersion: '83', sha256: sha256(oldBody), status: 'managed',
  };
  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === installed);
  assert.ok(preview);
  assert.equal(preview.status, 'update-available');
  assert.deepEqual(preview.changes, manifest.templates[template]?.changes);
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
  assert.equal(fs.readFileSync(path.join(rootPath, installed), 'utf8'), readTemplate(template));
  assert.equal(result.state.managedFiles[installed]?.templateVersion, '84');
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});

test('fake sync protects customized guidance from automatic overwrite', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  const customBody = `${readTemplate(template)}\nLocal customization.\n`;
  fs.writeFileSync(path.join(rootPath, installed), customBody);
  state.managedFiles[installed]!.templateVersion = '83';
  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === installed);
  assert.ok(preview);
  assert.equal(preview.status, 'modified-with-update');
  assert.deepEqual(preview.changes, manifest.templates[template]?.changes);
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });
  assert.equal(fs.readFileSync(path.join(rootPath, installed), 'utf8'), customBody);
  assert.equal(result.state.managedFiles[installed]?.status, 'customized');
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});
