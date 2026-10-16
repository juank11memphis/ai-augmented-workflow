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
    for (const id of ['ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox',
      'ai-implementation-architecture-reviewer-toolbox']) {
      const template = `skills/${id}/SKILL.md`;
      assert.equal(state.managedFiles[target(template)]?.template, template);
      assert.equal(fs.existsSync(path.join(rootPath, target(template))), true);
    }
    assert.deepEqual(diagnoseState({ rootPath, state }), []);
  }
});

test('fresh doctor distinguishes a genuinely unknown recorded skill from installed toolboxes', async (t) => {
  const { rootPath, state } = await initialize(t, SUPPORTED_AGENTS);
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
  state.managedFiles['.agents/skills/unknown-skill/SKILL.md'] = {
    template: 'skills/unknown-skill/SKILL.md', templateVersion: '1', sha256: 'recorded', status: 'managed',
  };
  assert.deepEqual(diagnoseState({ rootPath, state }).map((issue) => issue.retirement),
    [{ kind: 'unrecognized', skillId: 'unknown-skill' }]);
});

test('stale managed guidance gets meaningful updates and healthy doctor state', async (t) => {
  let { rootPath, state } = await initialize(t, [SUPPORTED_AGENTS[0]!]);
  for (const template of templates) {
    const stale = '# Stale synthetic guidance\n';
    fs.writeFileSync(path.join(rootPath, target(template)), stale);
    state.managedFiles[target(template)] = { template, templateVersion: '0', sha256: sha256(stale), status: 'managed' };
    const change = preview(rootPath, state, template);
    assert.equal(change.status, 'update-available');
    assert.match(change.changes.join(' '), /suite defaults|preview|case model|override/i);
    state = apply(rootPath, state, template, 'apply-update');
    assert.equal(fs.readFileSync(path.join(rootPath, target(template)), 'utf8'), readTemplate(template));
  }
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
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

test('customized skill/reference bytes survive reviewed updates and unrecorded adoption', async (t) => {
  let { rootPath, state } = await initialize(t, [SUPPORTED_AGENTS[0]!]);
  for (const template of templates) {
    const custom = `${readTemplate(template)}\nLocal synthetic customization.\n`;
    state.managedFiles[target(template)]!.templateVersion = '0';
    fs.writeFileSync(path.join(rootPath, target(template)), custom);
    assert.equal(preview(rootPath, state, template).status, 'modified-with-update');
    state = apply(rootPath, state, template, 'mark-reviewed');
    assert.equal(fs.readFileSync(path.join(rootPath, target(template)), 'utf8'), custom);
    assert.equal(state.managedFiles[target(template)]?.status, 'customized');
  }
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
  const reference = templates[1]!;
  delete state.managedFiles[target(reference)];
  const unrecorded = preview(rootPath, state, reference);
  assert.equal(unrecorded.status, 'new-template');
  assert.equal(unrecorded.hasLocalFile, true);
  state = apply(rootPath, state, reference, 'mark-reviewed');
  assert.match(fs.readFileSync(path.join(rootPath, target(reference)), 'utf8'), /Local synthetic customization/);
  assert.deepEqual(diagnoseState({ rootPath, state }), []);
});

test('installed preview checker uses saved defaults and blocks missing defaults without execution', async (t) => {
  const cli = path.resolve('bin/sibu.js');
  const { rootPath } = await initialize(t, [SUPPORTED_AGENTS[0]!]);
  fs.mkdirSync(path.join(rootPath, 'evals'));
  fs.mkdirSync(path.join(rootPath, 'src'));
  fs.writeFileSync(path.join(rootPath, '.gitignore'), '/evals/artifacts/\n');
  fs.writeFileSync(path.join(rootPath, 'src/target.mjs'), 'export const target = null;\n');
  fs.writeFileSync(path.join(rootPath, 'evals/runner.mjs'), `let body = '';
process.stdin.on('data', chunk => body += chunk);
process.stdin.on('end', () => {
  const request = JSON.parse(body);
  if (request.operation !== 'describe' || process.env.SIBU_EVAL_MODE !== '1') {
    throw new Error('Preview must not execute the runner');
  }
  const data = { runnerId: 'fixture', capabilities: ['single-turn', 'rubric'],
    models: ['fake/tested'], judgeModels: ['fake/judge'], requiredEnvironment: [] };
  process.stdout.write(JSON.stringify({ protocolVersion: 1, requestId: request.requestId,
    sequence: 0, type: 'description', runId: null, caseId: null, attempt: null, data }) + '\\n');
});\n`);
  const suite = {
    version: 2, kind: 'sibu-eval-suite', id: 'emd-defaults-ready', name: 'Saved defaults',
    description: 'Synthetic saved-choice fixture', defaultTestedModel: 'fake/tested', defaultJudgeModel: 'fake/judge',
    target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'happy-path', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [{ id: 'case', name: 'Synthetic case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hello' } }],
      toolMocks: [], assertions: [], graders: [{ id: 'quality', type: 'rubric',
        rubric: { type: 'inline', text: 'Synthetic quality.' }, threshold: 0.8 }] }],
  };
  const readyPath = path.join(rootPath, 'evals/emd-defaults-ready.json');
  const missingPath = path.join(rootPath, 'evals/emd-defaults-missing.json');
  fs.writeFileSync(readyPath, JSON.stringify(suite));
  fs.writeFileSync(missingPath, JSON.stringify({ ...suite, id: 'emd-defaults-missing', defaultTestedModel: undefined }));
  execFileSync('git', ['init', '-q'], { cwd: rootPath });
  const script = path.join(rootPath, '.agents/skills/eval-authoring/scripts/check-preview-contract.mjs');
  const check = (args: string[]) => spawnSync('node', [script, ...args], {
    cwd: rootPath, encoding: 'utf8', env: { ...process.env, SIBU_CLI: cli }, timeout: 30_000,
  });
  const before = [fs.readFileSync(readyPath, 'utf8'), fs.readFileSync(missingPath, 'utf8')];
  const ready = check(['--suite', 'emd-defaults-ready']);
  assert.equal(ready.status, 0, ready.stderr);
  assert.deepEqual(JSON.parse(ready.stdout), { status: 'ready', suiteId: 'emd-defaults-ready', selectedCaseIds: ['case'] });
  const missing = check(['--suite', 'emd-defaults-missing']);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /preview-blocked:missing-suite-default:tested/);
  const fullSuiteOverride = check(['--suite', 'emd-defaults-ready', '--model', 'fake/tested']);
  assert.equal(fullSuiteOverride.status, 1);
  assert.match(fullSuiteOverride.stderr, /use --suite ID \[--case ID/);
  assert.deepEqual([fs.readFileSync(readyPath, 'utf8'), fs.readFileSync(missingPath, 'utf8')], before);
  assert.equal(fs.existsSync(path.join(rootPath, 'evals/artifacts')), false);
});
