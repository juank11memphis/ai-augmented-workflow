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
  'skills/scrum-master-planner/SKILL.md',
  'skills/ai-implementation-planner/SKILL.md',
  'skills/ai-implementation-planner-toolbox/SKILL.md',
  'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
  'skills/ai-implementation-plan-executor/SKILL.md',
  'skills/ai-implementation-executor-toolbox/SKILL.md',
];
const architecture = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!;

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
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-verification-handoff-'));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [SUPPORTED_AGENTS[0]!],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => architecture,
      askForProjectOverview: async () => 'Disposable verification handoff project.',
    });
  } finally {
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

test('verification handoff templates install with current bytes and healthy state', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  for (const template of templates) {
    const relativePath = `.agents/${template}`;
    assert.equal(fs.readFileSync(path.join(rootPath, relativePath), 'utf8'), installedSource(template));
    assert.equal(state.managedFiles[relativePath]?.templateVersion, manifest.templates[template]?.version);
    assert.equal(state.managedFiles[relativePath]?.status, 'managed');
  }
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('stale managed handoff guidance offers a current note and updates safely', async (t) => {
  const { rootPath, state } = await initialize(t);
  const template = templates[4]!;
  const relativePath = `.agents/${template}`;
  const stale = '# Previous synthetic guidance\n';
  fs.writeFileSync(path.join(rootPath, relativePath), stale);
  state.managedFiles[relativePath] = { template, templateVersion: '71', sha256: sha256(stale), status: 'managed' };
  const manifest = readTemplateManifest();
  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === relativePath);
  assert.ok(preview);
  assert.equal(preview.status, 'update-available');
  assert.deepEqual(preview.changes, manifest.templates[template]?.changes);
  assert.match(preview.changes.join(' '), /Starts the first unintegrated Story.*separate human start prompt/i);
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
  assert.equal(fs.readFileSync(path.join(rootPath, relativePath), 'utf8'), installedSource(template));
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});

test('reviewing a customized handoff template preserves its bytes and ownership', async (t) => {
  const { rootPath, state } = await initialize(t);
  const template = templates[4]!;
  const relativePath = `.agents/${template}`;
  const customized = `${fs.readFileSync(path.join(rootPath, relativePath), 'utf8')}\nLocal synthetic customization.\n`;
  fs.writeFileSync(path.join(rootPath, relativePath), customized);
  state.managedFiles[relativePath]!.templateVersion = '71';
  const manifest = readTemplateManifest();
  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === relativePath);
  assert.ok(preview);
  assert.equal(preview.status, 'modified-with-update');
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });
  assert.equal(fs.readFileSync(path.join(rootPath, relativePath), 'utf8'), customized);
  assert.equal(result.state.managedFiles[relativePath]?.status, 'customized');
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});
