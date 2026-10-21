import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import { applySyncAction, getSyncPreviews } from '../sync-review-orchestrator/index.js';
import { diagnoseState } from '../workflow-health-inspector/index.js';
import { handleInitProject } from '../workflow-installer/index.js';
import { readTemplateManifest, renderTemplateForSync, SELECTABLE_ARCHITECTURE_SKILLS, SUPPORTED_AGENTS } from './index.js';

const templates = [
  'skills/ai-implementation-planner/SKILL.md',
  'skills/ai-implementation-planner-toolbox/SKILL.md',
  'skills/ai-implementation-plan-executor/SKILL.md',
  'skills/ai-implementation-executor-toolbox/SKILL.md',
  'skills/eval-authoring/SKILL.md',
];
const architecture = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!;
const manifest = readTemplateManifest();

function installedPath(template: string): string {
  return `.agents/${template}`;
}

function installedSource(template: string): string {
  return renderTemplateForSync({
    templateRelativePath: template,
    currentPath: 'missing-agents.md',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill: architecture,
  });
}

async function initialize(t: TestContext): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-decision-reuse-'));
  t.after(() => {
    fs.rmSync(rootPath, { recursive: true, force: true });
    assert.equal(fs.existsSync(rootPath), false, 'disposable project is removed');
  });
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [SUPPORTED_AGENTS[0]!],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => architecture,
      askForProjectOverview: async () => 'Disposable Feature Decision reuse project.',
    });
  } finally {
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

function preview(rootPath: string, state: SibuState, template: string) {
  const found = getSyncPreviews({ rootPath, state, manifest })
    .find((item) => item.relativePath === installedPath(template));
  assert.ok(found, template);
  return found;
}

test('fresh init distributes current bytes and versions for all five decision-reuse skills; doctor is healthy', async (t) => {
  const { rootPath, state } = await initialize(t);
  for (const template of templates) {
    const relativePath = installedPath(template);
    assert.equal(fs.readFileSync(path.join(rootPath, relativePath), 'utf8'), installedSource(template), template);
    assert.equal(state.managedFiles[relativePath]?.template, template);
    assert.equal(state.managedFiles[relativePath]?.templateVersion, manifest.templates[template]?.version, template);
    assert.equal(state.managedFiles[relativePath]?.status, 'managed', template);
    assert.equal(preview(rootPath, state, template).status, 'up-to-date', template);
  }
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('stale managed copies of all five skills show current sync notes, update safely, and leave doctor healthy', async (t) => {
  const { rootPath, state } = await initialize(t);
  for (const template of templates) {
    const relativePath = installedPath(template);
    const stale = `# Previous synthetic guidance for ${template}\n`;
    fs.writeFileSync(path.join(rootPath, relativePath), stale);
    state.managedFiles[relativePath] = { template, templateVersion: '1', sha256: sha256(stale), status: 'managed' };
  }
  let current = state;
  for (const template of templates) {
    const change = preview(rootPath, current, template);
    assert.equal(change.status, 'update-available', template);
    assert.deepEqual(change.changes, manifest.templates[template]?.changes, template);
    assert.equal(change.changes.length, 1, template);
    assert.match(
      change.changes[0] ?? '',
      template.endsWith('/ai-implementation-plan-executor/SKILL.md')
        ? /Starts the first unintegrated Story.*separate human start prompt/i
        : /Feature Decision|eval targets and coverage/i,
      template,
    );
    current = applySyncAction({ rootPath, state: current, manifest, preview: change, action: 'apply-update' }).state;
    assert.equal(fs.readFileSync(path.join(rootPath, installedPath(template)), 'utf8'), installedSource(template), template);
    assert.equal(current.managedFiles[installedPath(template)]?.templateVersion, manifest.templates[template]?.version, template);
    assert.equal(current.managedFiles[installedPath(template)]?.status, 'managed', template);
  }
  assert.deepEqual(diagnoseState({ rootPath, state: current }), []);
});

test('sync review preserves bytes and customized ownership for all five changed skills', async (t) => {
  const { rootPath, state } = await initialize(t);
  const custom = new Map<string, string>();
  for (const template of templates) {
    const relativePath = installedPath(template);
    const bytes = `${fs.readFileSync(path.join(rootPath, relativePath), 'utf8')}\nLocal synthetic customization.\n`;
    custom.set(template, bytes);
    fs.writeFileSync(path.join(rootPath, relativePath), bytes);
    state.managedFiles[relativePath]!.templateVersion = '1';
  }
  let current = state;
  for (const template of templates) {
    const change = preview(rootPath, current, template);
    assert.equal(change.status, 'modified-with-update', template);
    current = applySyncAction({ rootPath, state: current, manifest, preview: change, action: 'mark-reviewed' }).state;
    assert.equal(fs.readFileSync(path.join(rootPath, installedPath(template)), 'utf8'), custom.get(template), template);
    assert.equal(current.managedFiles[installedPath(template)]?.status, 'customized', template);
  }
  assert.deepEqual(diagnoseState({ rootPath, state: current }), []);
});

test('disposable project fixture cleanup removes its project tree', async (t) => {
  const { rootPath } = await initialize(t);
  assert.equal(fs.existsSync(rootPath), true);
  fs.rmSync(rootPath, { recursive: true, force: true });
  assert.equal(fs.existsSync(rootPath), false);
});
