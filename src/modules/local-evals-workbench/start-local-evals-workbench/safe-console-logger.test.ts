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

it('allows only safe run-start correlation fields and contains sink failures', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message?: unknown) => messages.push(String(message));
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    logger.info(Object.assign({ event: 'local_evals_workbench_run_start_queued' as const, stage: 'run-start' as const,
      outcome: 'queued' as const, reference: '123e4567-e89b-42d3-a456-426614174000', runId: 'run-1' },
    { credential: 'sk-secret', prompt: 'private prompt', stderr: 'private stderr', modelOutput: 'private model output' }));
    logger.warn(Object.assign({ event: 'local_evals_workbench_request_issue' as const, stage: 'run-start' as const,
      outcome: 'blocked' as const, reason: 'review-stale' as const, reference: 'injected-sk-secret' }, { token: 'sk-secret' }));
    logger.warn(Object.assign({ event: 'local_evals_workbench_run_start_response_failed' as const, stage: 'run-start' as const,
      outcome: 'uncertain' as const, reason: 'response-write-failed' as const, reference: '123e4567-e89b-42d3-a456-426614174000', runId: 'run-1' },
    { exception: 'sk-secret response closed' }));
  } finally { console.error = original; }
  assert.deepEqual(JSON.parse(messages[0] ?? '{}'), { level: 'info', event: 'local_evals_workbench_run_start_queued',
    stage: 'run-start', outcome: 'queued', reference: '123e4567-e89b-42d3-a456-426614174000', runId: 'run-1' });
  assert.equal(JSON.parse(messages[1] ?? '{}').reference, undefined);
  assert.deepEqual(JSON.parse(messages[2] ?? '{}'), { level: 'warn', event: 'local_evals_workbench_run_start_response_failed',
    stage: 'run-start', outcome: 'uncertain', reason: 'response-write-failed', reference: '123e4567-e89b-42d3-a456-426614174000', runId: 'run-1' });
  assert.doesNotMatch(messages.join(' '), /sk-secret|private prompt|private stderr|private model output/);
  console.error = () => { throw new Error('sink failed'); };
  try { assert.doesNotThrow(() => new SafeConsoleLocalEvalsLogger().info({ event: 'local_evals_workbench_run_start_queued',
    stage: 'run-start', outcome: 'queued', reference: '123e4567-e89b-42d3-a456-426614174000', runId: 'run-1' })); }
  finally { console.error = original; }
});

it('allowlists read issue stage, reason, reference, and drops private extras', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = message => messages.push(String(message));
  try {
    new SafeConsoleLocalEvalsLogger().warn(Object.assign({ event: 'local_evals_workbench_read_issue' as const,
      stage: 'history' as const, outcome: 'blocked' as const, reason: 'corrupt' as const,
      reference: '123e4567-e89b-42d3-a456-426614174000' }, { artifact: 'sk-secret private artifact' }));
  } finally { console.error = original; }
  assert.deepEqual(JSON.parse(messages[0] ?? '{}'), { level: 'warn', event: 'local_evals_workbench_read_issue',
    stage: 'history', outcome: 'blocked', reason: 'corrupt', reference: '123e4567-e89b-42d3-a456-426614174000' });
  assert.doesNotMatch(messages.join(' '), /sk-secret|private artifact/);
});

it('allowlists analysis event categories and references without private fields', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = message => messages.push(String(message));
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    logger.info(Object.assign({ event: 'failure_analysis_requested' as const, stage: 'analysis' as const,
      outcome: 'started' as const, reference }, { prompt: 'private prompt', rawId: 'private-id' }));
    logger.error(Object.assign({ event: 'failure_analysis_finished' as const, stage: 'analysis' as const,
      outcome: 'failed' as const, reason: 'provider-timeout' as const, durationMs: 5, reference },
    { key: 'sk-secret', output: 'private output', providerBody: 'private body', projectContent: 'private project', model: 'private-model' }));
    logger.warn(Object.assign({ event: 'local_evals_workbench_analysis_boundary_issue' as const, stage: 'analysis' as const,
      outcome: 'blocked' as const, reason: 'invalid-request' as const, reference }, { error: 'sk-secret' }));
  } finally { console.error = original; }
  assert.deepEqual(messages.map(message => JSON.parse(message)), [
    { level: 'info', event: 'failure_analysis_requested', stage: 'analysis', outcome: 'started', reference },
    { level: 'error', event: 'failure_analysis_finished', stage: 'analysis', outcome: 'failed', reason: 'provider-timeout', reference, durationMs: 5 },
    { level: 'warn', event: 'local_evals_workbench_analysis_boundary_issue', stage: 'analysis', outcome: 'blocked', reason: 'invalid-request', reference },
  ]);
  assert.doesNotMatch(messages.join(' '), /private|sk-secret/);
});

it('allowlists apply diagnostics and bounds changed-file counts', () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = value => lines.push(String(value));
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    logger.error(Object.assign({ event: 'local_evals_workbench_apply_event' as const, stage: 'repair-apply' as const,
      outcome: 'uncertain' as const, reason: 'sk-secret arbitrary error', reference, changedFileCount: 999999 },
    { proposalId: 'sk-secret', safeTargetPaths: ['/private/sk-secret'], unsafePaths: ['/private/sk-secret'], content: 'sk-secret' }));
    logger.warn(Object.assign({ event: 'local_evals_workbench_apply_response_failed' as const,
      stage: 'repair-apply' as const, outcome: 'uncertain' as const, reason: 'response-write-failed' as const, reference },
    { error: 'sk-secret' }));
  } finally { console.error = original; }
  assert.deepEqual(JSON.parse(lines[0]!), { level: 'error', event: 'local_evals_workbench_apply_event',
    stage: 'repair-apply', outcome: 'uncertain', reason: 'unknown', reference, changedFileCount: 10000 });
  assert.deepEqual(JSON.parse(lines[1]!), { level: 'warn', event: 'local_evals_workbench_apply_response_failed',
    stage: 'repair-apply', outcome: 'uncertain', reason: 'response-write-failed', reference });
  assert.doesNotMatch(lines.join(' '), /sk-secret|private|proposalId|TargetPaths|unsafePaths/);
});
