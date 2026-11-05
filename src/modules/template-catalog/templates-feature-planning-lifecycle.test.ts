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

const templates = [
  'skills/scrum-master-planner/SKILL.md',
  'skills/ai-implementation-planner/SKILL.md',
  'skills/ai-implementation-plan-executor/SKILL.md',
] as const;

function installedPath(template: string): string {
  return `.agents/${template}`;
}

async function initialize(t: TestContext): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-feature-planning-'));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const previous = process.cwd();
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
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

test('fake init and doctor install current planning handoff guidance without a GitHub gate', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  for (const template of templates) {
    const installed = installedPath(template);
    const body = fs.readFileSync(path.join(rootPath, installed), 'utf8');
    assert.equal(body, readTemplate(template));
    assert.equal(state.managedFiles[installed]?.templateVersion, manifest.templates[template]?.version);
  }
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('fake sync shows current notes, updates managed guidance, and protects customized guidance', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  const customized = installedPath(templates[0]);
  const customBody = `${readTemplate(templates[0])}\nLocal customization.\n`;
  fs.writeFileSync(path.join(rootPath, customized), customBody);
  state.managedFiles[customized]!.templateVersion = '1';

  for (const template of templates.slice(1)) {
    const installed = installedPath(template);
    const prior = '# Prior synthetic guidance\n';
    fs.writeFileSync(path.join(rootPath, installed), prior);
    state.managedFiles[installed] = {
      template, templateVersion: '1', sha256: sha256(prior), status: 'managed',
    };
    const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === installed);
    assert.ok(preview);
    assert.equal(preview.status, 'update-available');
    assert.deepEqual(preview.changes, manifest.templates[template]?.changes);
    const result = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
    Object.assign(state, result.state);
    assert.equal(fs.readFileSync(path.join(rootPath, installed), 'utf8'), readTemplate(template));
  }

  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === customized);
  assert.ok(preview);
  assert.equal(preview.status, 'modified-with-update');
  assert.deepEqual(preview.changes, manifest.templates[templates[0]]?.changes);
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });
  assert.equal(fs.readFileSync(path.join(rootPath, customized), 'utf8'), customBody);
  assert.equal(result.state.managedFiles[customized]?.status, 'customized');
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});

test('fake sync offers the current Scrum guidance to a stale managed installation', async (t) => {
  const { rootPath, state } = await initialize(t);
  const template = templates[0];
  const installed = installedPath(template);
  const prior = '# Prior synthetic Scrum guidance\n';
  fs.writeFileSync(path.join(rootPath, installed), prior);
  state.managedFiles[installed] = {
    template, templateVersion: '1', sha256: sha256(prior), status: 'managed',
  };

  const manifest = readTemplateManifest();
  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === installed);
  assert.ok(preview);
  assert.equal(preview.status, 'update-available');
  assert.deepEqual(preview.changes, manifest.templates[template]?.changes);
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
  assert.equal(fs.readFileSync(path.join(rootPath, installed), 'utf8'), readTemplate(template));
  assert.equal(result.state.managedFiles[installed]?.templateVersion, manifest.templates[template]?.version);
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});
