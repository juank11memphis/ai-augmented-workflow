import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { formatStartLocalEvalsWorkbenchResult, handleStartLocalEvalsWorkbenchCommand } from '../../modules/local-evals-workbench/index.js';

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
});

describe('model route CLI', () => {
  const executable = path.resolve('bin/sibu.js');
  const keyFlags = ['--agent', 'codex', '--role', 'implementation-executor', '--workload', 'bounded', '--json'];
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
