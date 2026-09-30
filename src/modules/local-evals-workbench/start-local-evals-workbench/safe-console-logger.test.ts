import assert from 'node:assert/strict';
import { it } from 'node:test';

import { SafeConsoleLocalEvalsLogger } from './safe-console-logger.js';

it('allowlists structured discovery fields and drops unexpected sensitive payloads', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message?: unknown) => messages.push(String(message));
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    const event = Object.assign({
      event: 'eval_suite_discovery_completed' as const,
      outcome: 'blocked' as const,
      suiteCount: 0,
      diagnosticCount: 1,
      unsupportedCount: 0,
      reasonCodes: ['sensitive-content-detected', 'OPENAI_API_KEY=sk-log-secret'],
      durationMs: -10,
    }, {
      prompt: 'private prompt',
      modelOutput: 'private model output',
      unsafePath: '/private/project/evals/secret.json',
      environmentValue: 'sk-log-secret',
    });
    logger.warn(event);
  } finally {
    console.error = original;
  }

  assert.match(messages[0] ?? '', /eval_suite_discovery_completed/);
  assert.match(messages[0] ?? '', /sensitive-content-detected/);
  assert.match(messages[0] ?? '', /"durationMs":0/);
  assert.doesNotMatch(messages[0] ?? '', /OPENAI_API_KEY|private prompt|model output|private\/project|sk-log-secret/);
  assert.deepEqual(JSON.parse(messages[0] ?? '{}').stage, 'discovery');
});

it('emits only observed startup stage and allowlisted fields', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message?: unknown) => messages.push(String(message));
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    logger.error(Object.assign({ event: 'local_evals_workbench_start_failed' as const, reason: 'discovery-failed' as const }, {
      path: '/repo/private.json', error: 'OPENAI_API_KEY=secret', payload: 'private prompt',
    }));
    logger.info(Object.assign({ event: 'local_evals_workbench_started' as const, host: '127.0.0.1' as const, port: 4321, suiteCount: 2, discoveryStatus: 'ready' as const }, {
      token: 'secret', requestRef: 'invented-ref',
    }));
  } finally {
    console.error = original;
  }
  assert.deepEqual(JSON.parse(messages[0] ?? '{}'), { level: 'error', event: 'local_evals_workbench_start_failed', stage: 'discovery', outcome: 'failed', reason: 'discovery-failed' });
  assert.equal(JSON.parse(messages[1] ?? '{}').stage, 'server-start');
  assert.doesNotMatch(messages.join(' '), /private|OPENAI_API_KEY|secret|invented-ref|requestRef|port/);
});

it('contains a throwing terminal sink', () => {
  const original = console.error;
  console.error = () => { throw new Error('sink failed'); };
  try {
    assert.doesNotThrow(() => new SafeConsoleLocalEvalsLogger().info({ event: 'local_evals_workbench_start_requested' }));
  } finally {
    console.error = original;
  }
});
