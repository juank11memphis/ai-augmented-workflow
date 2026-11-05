import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { formatStartLocalEvalsWorkbenchResult, handleStartLocalEvalsWorkbenchCommand } from '../../modules/local-evals-workbench/index.js';
import { renderRetirementFinding } from './doctor-presentation.js';
import { inspectWorkflow } from '../../modules/workflow-health-inspector/retirement-inspection.js';
import { lookupSkillIdentity, parseSkillRetirements } from '../../modules/template-catalog/retirements.js';
import { reviewRetiredSkills } from '../../modules/sync-review-orchestrator/retired-skill-review-adapters.js';
import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import type { RetiredSkillReviewChoice } from '../../modules/sync-review-orchestrator/retired-skill-review-command.js';

describe('retired-skill CLI presentation and disposable lifecycle', () => {
  it('matches compact/wide doctor and unknown mockups without terminal imports in the inspector', () => {
    const retired = { severity: 'warning' as const, message: 'not used for rendering', retirement: {
      kind: 'retired' as const, skillId: 'YYY', explanation: 'Sibu no longer provides this skill.',
    } };
    assert.deepEqual(renderRetirementFinding(retired, 50), [
      'Retired skill: YYY', 'Sibu no longer provides this skill.', '',
      'Run `sibu sync` to review cleanup.', 'Doctor changed nothing.',
    ]);
    assert.deepEqual(renderRetirementFinding(retired, 120), [
      'Retired skill: YYY — Sibu no longer provides this skill.',
      'Installed in this project; cleanup requires your choice.', '',
      'Run `sibu sync` to review cleanup. Doctor changed nothing.',
    ]);
    assert.deepEqual(renderRetirementFinding({ severity: 'warning', message: '', retirement: {
      kind: 'unrecognized', skillId: 'YYY',
    } }, 50), ['Unrecognized skill: YYY', 'Sibu cannot confirm whether this skill is current or retired.',
      'It will not be offered for retired-skill cleanup.']);
    const source = fs.readFileSync('src/modules/workflow-health-inspector/handler.ts', 'utf8');
    assert.doesNotMatch(source, /@clack\/prompts|chalk|process\.stdout|process\.stdin|doctor-presentation/);
    assert.match(fs.readFileSync('src/entrypoints/cli/execute-command.ts', 'utf8'), /doctor-presentation\.js/);
  });

  it('keeps, cancels, and cleans mandatory/optional copies across two agents without touching user files or architecture', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-retired-cli-'));
    const statePath = path.join(root, '.sibu/state.json');
    const records = parseSkillRetirements({ schemaVersion: 1, retirements: [
      ...(['old-mandatory', 'old-optional'] as const).map((id) => ({
        id, category: id === 'old-mandatory' ? 'mandatory' : 'workflow', explanation: `${id} was retired.`,
        formerTemplateRelativePath: `skills/${id}/SKILL.md`,
        formerTargetsByAgent: { codex: [`.agents/skills/${id}/SKILL.md`],
          gemini: [`.gemini/skills/${id}/SKILL.md`], claude: [`.claude/skills/${id}/SKILL.md`] },
        generatedRoutingTargetsByAgent: { codex: ['AGENTS.md'], gemini: ['GEMINI.md'], claude: ['CLAUDE.md'] },
      })),
    ] });
    const state: SibuState = { sibuVersion: 'test', templateVersion: 'test', generatedAt: 'test', updatedAt: 'test',
      selectedAgents: ['codex', 'gemini'], selectedArchitectureSkill: 'command-pattern',
      selectedWorkflowSkills: ['old-optional', 'unknown-skill'] as unknown as SibuState['selectedWorkflowSkills'], managedFiles: {} };
    const write = (relativePath: string, bytes: string) => {
      const target = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    };
    for (const id of ['old-mandatory', 'old-optional']) {
      const codexPath = `.agents/skills/${id}/SKILL.md`;
      write(codexPath, `${id}\n`);
      state.managedFiles[codexPath] = { template: `skills/${id}/SKILL.md`, templateVersion: '1', sha256: sha256(`${id}\n`) };
    }
    const editedPath = '.gemini/skills/old-optional/SKILL.md';
    write(editedPath, 'Locally edited old optional guidance.\n');
    state.managedFiles[editedPath] = { template: 'skills/old-optional/SKILL.md', templateVersion: '1',
      sha256: sha256('original guidance\n') };
    write('README.md', 'My user-created reference to old-optional stays.\n');
    write('.agents/skills/user-created/SKILL.md', 'My skill stays.\n');
    write('.sibu/state.json', `${JSON.stringify(state, null, 2)}\n`);
    const inspect = (current: SibuState) => inspectWorkflow({ type: 'inspect-workflow' }, current, {
      retirements: () => records, resolveSkill: (id) => lookupSkillIdentity(id, records),
      exists: (relativePath) => fs.existsSync(path.join(root, relativePath)),
      readText: (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8'),
    });
    const read = () => JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;
    const manualReview: string[] = [];
    const run = async (choices: RetiredSkillReviewChoice[]) => reviewRetiredSkills(root, statePath, {
      retirements: () => records, inspect: (current) => inspect(current), interaction: {
        summary: () => {}, choose: async (preview) => {
          manualReview.push(...preview.reviewYourself.map((effect) => effect.path));
          return choices.shift()!;
        }, outcome: () => {},
      },
    });
    try {
      const before = fs.readFileSync(statePath, 'utf8');
      await run(['keep', 'keep']);
      assert.equal(fs.readFileSync(statePath, 'utf8'), before);
      assert.deepEqual(inspect(read()).findings.map((item) => item.skillId), ['old-optional', 'unknown-skill', 'old-mandatory']);
      await run(['cancel']);
      assert.equal(fs.readFileSync(statePath, 'utf8'), before);
      await run(['clean-up', 'clean-up']);
      assert.equal(fs.existsSync(path.join(root, '.agents/skills/old-mandatory/SKILL.md')), false);
      assert.equal(fs.existsSync(path.join(root, '.agents/skills/old-optional/SKILL.md')), false);
      assert.equal(fs.readFileSync(path.join(root, editedPath), 'utf8'), 'Locally edited old optional guidance.\n');
      assert.equal(read().managedFiles[editedPath]?.status, 'unmanaged');
      assert.equal(read().selectedArchitectureSkill, 'command-pattern');
      assert.deepEqual(read().selectedWorkflowSkills, ['unknown-skill']);
      assert.deepEqual(inspect(read()).findings.map((item) => item.skillId), ['unknown-skill']);
      assert.ok(manualReview.includes('README.md'));
      assert.equal(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), 'My user-created reference to old-optional stays.\n');
      assert.equal(fs.readFileSync(path.join(root, '.agents/skills/user-created/SKILL.md'), 'utf8'), 'My skill stays.\n');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

describe('local evals CLI handler', () => {

  it('routes evals commands through the CLI dispatcher', () => {
    const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-evals-route-'));
    const executeCommandPath = path.resolve('bin/entrypoints/cli/execute-command.js');
    const script = `import(${JSON.stringify(executeCommandPath)}).then(({ executeCliCommand }) => executeCliCommand({ type: 'evals', projectRoot: process.cwd() }))`;

    try {
      assert.throws(
        () => execFileSync(process.execPath, ['-e', script], { cwd: tempProject, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
        /Command failed/
      );
    } finally {
      fs.rmSync(tempProject, { recursive: true, force: true });
    }
  });

  it('prints the local URL for a started workbench result', async () => {
    const lines: string[] = [];

    await handleStartLocalEvalsWorkbenchCommand(
      { type: 'evals', projectRoot: '/repo' },
      {
        workflowStateReader: { readWorkflowState: () => ({ status: 'valid' }) },
        serverStarter: { startServer: async () => ({ url: 'http://127.0.0.1:1234/', host: '127.0.0.1', port: 1234 }) },
        suiteDiscovery: {
          discover: async () => ({ status: 'ready', suites: [], definitions: [], diagnostics: [] }),
        },
        logger: noopLogger,
        writeLine: (message) => lines.push(message),
      }
    );

    assert.deepEqual(lines, [
      'Sibu local evals workbench is running.',
      'URL: http://127.0.0.1:1234/',
      'Open this local URL in your browser to use the Sibu evals workbench.',
    ]);
  });

  it('prints setup guidance and marks failure when state is missing', async () => {
    const lines: string[] = [];
    let exitCode = 0;

    await handleStartLocalEvalsWorkbenchCommand(
      { type: 'evals', projectRoot: '/repo' },
      {
        workflowStateReader: { readWorkflowState: () => ({ status: 'missing', message: '.sibu/state.json is missing.' }) },
        serverStarter: { startServer: async () => { throw new Error('must not start'); } },
        logger: noopLogger,
        writeLine: (message) => lines.push(message),
        setExitCode: (code) => (exitCode = code),
      }
    );

    assert.equal(exitCode, 1);
    assert.match(lines.join('\n'), /sibu init/);
  });

  it('formats blocked invalid-state repair guidance', () => {
    assert.deepEqual(
      formatStartLocalEvalsWorkbenchResult({
        status: 'blocked',
        reason: 'invalid-workflow-state',
        message: '.sibu/state.json could not be parsed.',
        guidance: ['Run `sibu doctor` to inspect the workflow state.', 'Run `sibu sync` to review and repair managed workflow files.'],
      }),
      ['.sibu/state.json could not be parsed.', 'Run `sibu doctor` to inspect the workflow state.', 'Run `sibu sync` to review and repair managed workflow files.']
    );
  });

  it('prints distinct observed-stage guidance for discovery and server failures', () => {
    const discovery = formatStartLocalEvalsWorkbenchResult({ status: 'failed', reason: 'discovery-failed', message: 'Eval suite discovery failed; the cause is unknown.', guidance: ['Check project access and retry discovery.'] });
    const server = formatStartLocalEvalsWorkbenchResult({ status: 'failed', reason: 'server-start-failed', message: 'Local server startup failed; the cause is unknown.', guidance: ['Retry startup.'] });
    assert.match(discovery.join(' '), /discovery.*unknown/);
    assert.match(server.join(' '), /server startup.*unknown/);
    assert.doesNotMatch(discovery.join(' '), /port/);
  });
});

describe('model route CLI', () => {
  const executable = path.resolve('bin/sibu.js');
  const keyFlags = ['--agent', 'codex', '--role', 'implementation-executor', '--workload', 'bounded', '--json'];
  it('runs bare guided models with keyboard input without changing routes on exit', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-guided-'));
    const statePath = path.join(root, '.sibu', 'state.json');
    fs.mkdirSync(path.dirname(statePath));
    fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: [], managedFiles: {} }));
    try {
      const before = fs.readFileSync(statePath, 'utf8');
      const run = spawnSync(process.execPath, [executable, 'models'], { cwd: root, encoding: 'utf8', input: '17\n' });
      assert.equal(run.status, 0);
      assert.match(run.stdout, /Model routes/);
      assert.match(run.stdout, /16\. Reset routes\n17\. Exit/);
      assert.equal(fs.readFileSync(statePath, 'utf8'), before);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  it('emits one JSON object, persists explicit choice, and detects conflict', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-cli-'));
    const statePath = path.join(root, '.sibu', 'state.json');
    fs.mkdirSync(path.dirname(statePath));
    fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: [], managedFiles: {} }));
    try {
      const resolve = spawnSync(process.execPath, [executable, 'models', 'resolve', ...keyFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(resolve.status, 0);
      assert.equal(resolve.stderr, '');
      const initial = JSON.parse(resolve.stdout);
      assert.equal(initial.schemaVersion, 1);
      assert.equal(initial.status, 'missing');
      assert.equal(resolve.stdout.trim().split('\n').length, 1);
      const setFlags = [...keyFlags, '--model', 'external-model', '--reasoning', 'high', '--catalog-version', initial.catalog.catalogVersion, '--state-basis', initial.stateBasis];
      const save = spawnSync(process.execPath, [executable, 'models', 'set', ...setFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(save.status, 0);
      assert.equal(JSON.parse(save.stdout).status, 'saved');
      const after = spawnSync(process.execPath, [executable, 'models', 'resolve', ...keyFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(JSON.parse(after.stdout).route.model, 'external-model');
      assert.equal(JSON.parse(after.stdout).route.reasoningEffort, 'high');
      const stale = spawnSync(process.execPath, [executable, 'models', 'set', ...setFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(JSON.parse(stale.stdout).status, 'conflict');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects malformed flags without JSON stdout', () => {
    const result = spawnSync(process.execPath, [executable, 'models', 'set', '--json'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /required option/);
  });

  it('returns structured unsupported and workflow-unavailable outcomes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-unavailable-'));
    try {
      const unavailable = spawnSync(process.execPath, [executable, 'models', 'resolve', ...keyFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(unavailable.status, 0);
      assert.equal(JSON.parse(unavailable.stdout).status, 'workflow-unavailable');
      const unsupported = spawnSync(process.execPath, [executable, 'models', 'resolve', '--agent', 'unknown', '--role', 'implementation-executor', '--workload', 'bounded', '--json'], { cwd: root, encoding: 'utf8' });
      assert.equal(unsupported.status, 0);
      assert.equal(JSON.parse(unsupported.stdout).status, 'unsupported');
      assert.equal(unsupported.stderr, '');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('reports a real post-staging write failure without state change and permits a retry', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-cli-failure-'));
    const statePath = path.join(root, '.sibu', 'state.json');
    const preloadPath = path.join(root, 'inject.cjs');
    fs.mkdirSync(path.dirname(statePath));
    fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: [], managedFiles: {} }));
    fs.writeFileSync(preloadPath, "const fs = require('node:fs'); fs.renameSync = () => { throw new Error('injected replacement failure'); };\n");
    try {
      const initial = JSON.parse(spawnSync(process.execPath, [executable, 'models', 'resolve', ...keyFlags], { cwd: root, encoding: 'utf8' }).stdout);
      const flags = [...keyFlags, '--model', 'external-model', '--reasoning', 'high', '--catalog-version', initial.catalog.catalogVersion, '--state-basis', initial.stateBasis];
      const before = fs.readFileSync(statePath, 'utf8');
      const failed = spawnSync(process.execPath, ['--require', preloadPath, executable, 'models', 'set', ...flags], { cwd: root, encoding: 'utf8' });
      assert.equal(failed.status, 1);
      assert.equal(JSON.parse(failed.stdout).status, 'failed');
      assert.equal(failed.stdout.trim().split('\n').length, 1);
      assert.equal(fs.readFileSync(statePath, 'utf8'), before);
      assert.deepEqual(fs.readdirSync(path.dirname(statePath)), ['state.json']);
      const retry = spawnSync(process.execPath, [executable, 'models', 'set', ...flags], { cwd: root, encoding: 'utf8' });
      assert.equal(retry.status, 0);
      assert.equal(JSON.parse(retry.stdout).status, 'saved');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('keeps unexpected exceptions off JSON stdout and exits non-zero', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-model-cli-unexpected-'));
    const preloadPath = path.join(root, 'inject.cjs');
    fs.writeFileSync(preloadPath, "const write = process.stdout.write; process.stdout.write = function (data, ...rest) { if (String(data).includes('schemaVersion')) throw new Error('injected output failure'); return write.call(this, data, ...rest); };\n");
    try {
      const result = spawnSync(process.execPath, ['--require', preloadPath, executable, 'models', 'resolve', ...keyFlags], { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /model route operation failed/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

const noopLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
