import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { sha256 } from '../../shared/hash.js';
import type { SibuState, SupportedAgent } from '../../shared/types.js';
import { handleInitProject } from '../workflow-installer/index.js';
import { diagnoseState } from '../workflow-health-inspector/index.js';
import { applySyncAction, getSyncPreviews } from '../sync-review-orchestrator/index.js';
import { readTemplate, readTemplateManifest, SELECTABLE_ARCHITECTURE_SKILLS, SUPPORTED_AGENTS } from './index.js';

const templates = ['skills/eval-authoring/SKILL.md', 'skills/eval-authoring/references/version-2-contract.md',
  'skills/eval-authoring/scripts/check-preview-contract.mjs'];
const target = (template: string) => `.agents/${template}`;
async function initialize(t: TestContext, selectedAgents: SupportedAgent[]): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-authoring-lifecycle-'));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => selectedAgents,
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!,
      askForProjectOverview: async () => 'Synthetic authoring lifecycle project.',
    });
  } finally { process.chdir(previous); }
  return { rootPath, state: JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState };
}
function preview(rootPath: string, state: SibuState, template: string) {
  const found = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() }).find((item) => item.relativePath === target(template));
  assert.ok(found); return found;
}
function apply(rootPath: string, state: SibuState, template: string, action: 'apply-update' | 'mark-reviewed') {
  const result = applySyncAction({ rootPath, state, manifest: readTemplateManifest(), preview: preview(rootPath, state, template), action });
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), JSON.stringify(result.state));
  return result.state;
}

test('fresh init installs eval-authoring guidance and preview checker for all agents', async (t) => {
  for (const selected of [...SUPPORTED_AGENTS.map((agent) => [agent]), SUPPORTED_AGENTS]) {
    const { rootPath, state } = await initialize(t, selected);
    for (const template of templates) {
      assert.equal(fs.readFileSync(path.join(rootPath, target(template)), 'utf8'), readTemplate(template));
      assert.equal(state.managedFiles[target(template)]?.template, template);
      assert.equal(preview(rootPath, state, template).status, 'up-to-date');
    }
    assert.deepEqual(diagnoseState({ rootPath, state }), []);
  }
});
test('fresh doctor distinguishes a genuinely unknown recorded skill', async (t) => {
  const { rootPath, state } = await initialize(t, SUPPORTED_AGENTS);
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
  state.managedFiles['.agents/skills/unknown-skill/SKILL.md'] = {
    template: 'skills/unknown-skill/SKILL.md', templateVersion: '1', sha256: 'recorded', status: 'managed',
  };
  assert.deepEqual(diagnoseState({ rootPath, state }).map((issue) => issue.retirement),
    [{ kind: 'unrecognized', skillId: 'unknown-skill' }]);
});



test('missing and newly introduced references are offered and safely repaired/adopted', async (t) => {
  let { rootPath, state } = await initialize(t, [SUPPORTED_AGENTS[0]!]);
  const template = templates[1]!;
  fs.unlinkSync(path.join(rootPath, target(template)));
  assert.equal(preview(rootPath, state, template).status, 'missing');
  state = apply(rootPath, state, template, 'apply-update');
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
  fs.unlinkSync(path.join(rootPath, target(template)));
  delete state.managedFiles[target(template)];
  assert.equal(preview(rootPath, state, template).status, 'new-template');
  state = apply(rootPath, state, template, 'apply-update');
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});
