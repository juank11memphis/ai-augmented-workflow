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
import { readTemplate, readTemplateManifest, SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_WORKFLOW_SKILLS, SUPPORTED_AGENTS } from './index.js';

const templates = [
  { path: 'AGENTS.md', installed: 'AGENTS.md' },
  { path: 'skills/business-requirements-writer/SKILL.md', installed: '.agents/skills/business-requirements-writer/SKILL.md' },
  { path: 'skills/ux-expert/SKILL.md', installed: '.agents/skills/ux-expert/SKILL.md' },
  { path: 'skills/software-design-writer/SKILL.md', installed: '.agents/skills/software-design-writer/SKILL.md' },
] as const;

async function initialize(t: TestContext): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-feature-terminal-'));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [SUPPORTED_AGENTS[0]!],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [],
      askForWorkflowSkills: async () => SELECTABLE_WORKFLOW_SKILLS.filter((skill) => skill.id === 'ux-expert'),
      askForArchitectureSkill: async () => SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!,
      askForProjectOverview: async () => 'Synthetic local setup.',
    });
  } finally {
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}


test('fake sync updates stale managed guidance and preserves customized guidance', async (t) => {
  const { rootPath, state } = await initialize(t);
  const manifest = readTemplateManifest();
  const customized = templates[0];
  const customBody = `${readTemplate(customized.path)}\nLocal customization.\n`;
  fs.writeFileSync(path.join(rootPath, customized.installed), customBody);
  state.managedFiles[customized.installed]!.templateVersion = '1';

  for (const template of templates.slice(1)) {
    const prior = '# Prior synthetic guidance\n';
    fs.writeFileSync(path.join(rootPath, template.installed), prior);
    state.managedFiles[template.installed] = {
      template: template.path, templateVersion: '1', sha256: sha256(prior), status: 'managed',
    };
    const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === template.installed);
    assert.ok(preview);
    assert.equal(preview.status, 'update-available');
    assert.deepEqual(preview.changes, manifest.templates[template.path]?.changes);
    const result = applySyncAction({ rootPath, state, manifest, preview, action: 'apply-update' });
    Object.assign(state, result.state);
    assert.equal(fs.readFileSync(path.join(rootPath, template.installed), 'utf8'), readTemplate(template.path));
  }

  const preview = getSyncPreviews({ rootPath, state, manifest }).find((item) => item.relativePath === customized.installed);
  assert.ok(preview);
  assert.equal(preview.status, 'modified-with-update');
  const result = applySyncAction({ rootPath, state, manifest, preview, action: 'mark-reviewed' });
  assert.equal(fs.readFileSync(path.join(rootPath, customized.installed), 'utf8'), customBody);
  assert.equal(result.state.managedFiles[customized.installed]?.status, 'customized');
  assert.deepEqual(diagnoseState({ rootPath, state: result.state }), []);
});
