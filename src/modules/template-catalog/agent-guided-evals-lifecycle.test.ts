import assert from 'node:assert/strict';
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

const template = 'skills/agent-guided-evals/SKILL.md';
const target = `.agents/${template}`;
const hosts = SUPPORTED_AGENTS.filter((agent) => agent.id === 'codex' || agent.id === 'claude');

function assertSuiteGuidance(rootPath: string): void {
  const installed = fs.readFileSync(path.join(rootPath, target), 'utf8');
  assert.equal(installed, readTemplate(template));
  assert.match(installed, /sibu evals run <suite>` for all cases, without `--case` or run-wide model flags/);
  assert.match(installed, /partial or incomplete attempts without failed assertions/);
  assert.match(installed, /assertion-based `--field` read is not required/);
  assert.match(installed, /request explicit authorization before any paid rerun/);
  assert.match(installed, /rerun the full suite exactly as originally scoped, without `--case`/);
  assert.match(installed, /originally selected single case, retain the focused outcome/);
  assert.match(installed, /\*\*Conversation example:\*\*.*actual originator/);
  assert.match(installed, /\*\*Problem:\*\*.*likely layer/);
  assert.match(installed, /\*\*Proposed fix:\*\*.*evidence-supported fix/);
}

async function initialize(t: TestContext, agent: SupportedAgent): Promise<{ rootPath: string; state: SibuState }> {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), `sibu-guided-${agent.id}-`));
  t.after(() => fs.rmSync(rootPath, { recursive: true, force: true }));
  const previous = process.cwd();
  try {
    process.chdir(rootPath);
    await handleInitProject({ type: 'init' }, {
      renderIntro: async () => {}, askForSupportedAgents: async () => [agent],
      askForMcpServers: async () => [], askForNotionDocsParentPage: async () => '',
      askForLanguageSkills: async () => [], askForFrameworkSkills: async () => [],
      askForDatabaseSkills: async () => [], askForWorkflowSkills: async () => [],
      askForArchitectureSkill: async () => SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!,
      askForProjectOverview: async () => 'Synthetic guided-eval lifecycle project.',
    });
  } finally {
    process.chdir(previous);
  }
  const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
  return { rootPath, state };
}

function preview(rootPath: string, state: SibuState) {
  const found = getSyncPreviews({ rootPath, state, manifest: readTemplateManifest() })
    .find((item) => item.relativePath === target);
  assert.ok(found);
  return found;
}

function apply(rootPath: string, state: SibuState, action: 'apply-update' | 'mark-reviewed'): SibuState {
  const result = applySyncAction({ rootPath, state, manifest: readTemplateManifest(), preview: preview(rootPath, state), action });
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), JSON.stringify(result.state));
  return result.state;
}

for (const host of hosts) {
  test(`${host.id} init and doctor install healthy shared guided-eval guidance`, async (t) => {
    const { rootPath, state } = await initialize(t, host);
    assertSuiteGuidance(rootPath);
    assert.equal(state.managedFiles[target]?.template, template);
    assert.equal(state.managedFiles[target]?.templateVersion, '6');
    assert.equal(preview(rootPath, state).status, 'up-to-date');
    assert.deepEqual(diagnoseState({ rootPath, state }), []);
  });

  test(`${host.id} sync updates stale guidance and adopts a newly introduced skill`, async (t) => {
    let { rootPath, state } = await initialize(t, host);
    const stale = '# Stale synthetic guided-eval guidance\n';
    fs.writeFileSync(path.join(rootPath, target), stale);
    state.managedFiles[target] = { template, templateVersion: '0', sha256: sha256(stale), status: 'managed' };
    assert.equal(preview(rootPath, state).status, 'update-available');
    state = apply(rootPath, state, 'apply-update');
    assertSuiteGuidance(rootPath);
    assert.equal(state.managedFiles[target]?.templateVersion, '6');
    fs.unlinkSync(path.join(rootPath, target));
    delete state.managedFiles[target];
    assert.equal(preview(rootPath, state).status, 'new-template');
    state = apply(rootPath, state, 'apply-update');
    assertSuiteGuidance(rootPath);
    assert.equal(state.managedFiles[target]?.templateVersion, '6');
    assert.deepEqual(diagnoseState({ rootPath, state }), []);
  });

  test(`${host.id} sync preserves customized guided-eval guidance`, async (t) => {
    let { rootPath, state } = await initialize(t, host);
    const custom = `${readTemplate(template)}\nLocal synthetic customization.\n`;
    fs.writeFileSync(path.join(rootPath, target), custom);
    state.managedFiles[target]!.templateVersion = '0';
    assert.equal(preview(rootPath, state).status, 'modified-with-update');
    state = apply(rootPath, state, 'mark-reviewed');
    assert.equal(fs.readFileSync(path.join(rootPath, target), 'utf8'), custom);
    assert.equal(state.managedFiles[target]?.status, 'customized');
    assert.equal(state.managedFiles[target]?.templateVersion, '0');
    assert.equal(state.managedFiles[target]?.lastReviewedTemplateVersion, '6');
    assert.equal(state.managedFiles[target]?.sha256, sha256(custom));
    assert.deepEqual(diagnoseState({ rootPath, state }), []);
  });
}
