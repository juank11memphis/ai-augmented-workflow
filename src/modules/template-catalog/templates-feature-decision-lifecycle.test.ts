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

const template = 'skills/software-design-writer/SKILL.md';
const installedPath = `.agents/${template}`;

async function initialize(t: TestContext): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-feature-decision-'));
  t.after(() => {
    fs.rmSync(rootPath, { recursive: true, force: true });
    assert.equal(fs.existsSync(rootPath), false, 'temporary fixture is removed');
  });
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [SUPPORTED_AGENTS[0]!],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!,
      askForProjectOverview: async () => 'Synthetic Feature Decision lifecycle project.',
    });
  } finally {
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

function preview(rootPath: string, state: SibuState) {
  const found = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() })
    .find((item) => item.relativePath === installedPath);
  assert.ok(found);
  return found;
}

function apply(rootPath: string, state: SibuState, action: 'apply-update' | 'mark-reviewed'): SibuState {
  const result = applySyncAction({ rootPath, state, manifest: readTemplateManifest(), preview: preview(rootPath, state), action });
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), JSON.stringify(result.state));
  return result.state;
}

test('fresh init installs exact Feature Decision guidance and doctor is healthy', async (t) => {
  const { rootPath, state } = await initialize(t);
  assert.equal(fs.readFileSync(path.join(rootPath, installedPath), 'utf8'), readTemplate(template));
  assert.equal(state.managedFiles[installedPath]?.template, template);
  assert.equal(preview(rootPath, state).status, 'up-to-date');
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('stale managed guidance receives current sync notes and a healthy safe update', async (t) => {
  let { rootPath, state } = await initialize(t);
  const stale = '# Prior synthetic SDD guidance\n';
  fs.writeFileSync(path.join(rootPath, installedPath), stale);
  state.managedFiles[installedPath] = { template, templateVersion: '2', sha256: sha256(stale), status: 'managed' };

  const change = preview(rootPath, state);
  assert.equal(change.status, 'update-available');
  assert.equal(change.changes.join(' '), readTemplateManifest().templates[template]?.changes.join(' '));
  assert.match(change.changes.join(' '), /applicable feature-specific decision gates/);
  assert.match(change.changes.join(' '), /separate eval target and coverage approvals/);
  assert.match(change.changes.join(' '), /specific unanswered decision/);
  assert.match(change.changes.join(' '), /sync preserves local ownership review/);

  state = apply(rootPath, state, 'apply-update');
  assert.equal(fs.readFileSync(path.join(rootPath, installedPath), 'utf8'), readTemplate(template));
  assert.equal(state.managedFiles[installedPath]?.templateVersion, '3');
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('customized Feature Decision guidance survives sync review without overwrite', async (t) => {
  let { rootPath, state } = await initialize(t);
  const custom = `${readTemplate(template)}\nLocal synthetic customization.\n`;
  fs.writeFileSync(path.join(rootPath, installedPath), custom);
  state.managedFiles[installedPath]!.templateVersion = '2';

  assert.equal(preview(rootPath, state).status, 'modified-with-update');
  state = apply(rootPath, state, 'mark-reviewed');
  assert.equal(fs.readFileSync(path.join(rootPath, installedPath), 'utf8'), custom);
  assert.equal(state.managedFiles[installedPath]?.status, 'customized');
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});
