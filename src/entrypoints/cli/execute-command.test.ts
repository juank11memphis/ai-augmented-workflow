import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
          discover: async () => ({ status: 'ready', suites: [], diagnostics: [] }),
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

const noopLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
