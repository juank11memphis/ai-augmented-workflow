import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { FakeLocalHttpServer, readyDiscovery, runtimeDependencies } from './local-server-starter-test-fixture.js';
import { queued } from '../run-history/test-fixtures.js';
import type { LocalWorkbenchRuntimeDependencies } from '../workbench-composition.js';
import { safeExecutionEvent } from '../workbench-composition.js';
import type { ExecutionDiagnostic } from '../execute-eval-run/ports.js';

async function withRoutes(dependencies: LocalWorkbenchRuntimeDependencies, run: (server: FakeLocalHttpServer, events: unknown[]) => Promise<void>, sinkThrows = false): Promise<void> {
  const server = new FakeLocalHttpServer(4321);
  const events: unknown[] = [];
  const logger = { info: () => undefined, warn: (event: unknown) => { if (sinkThrows) throw Error('sk-secret'); events.push(event); }, error: () => undefined };
  const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => dependencies, logger);
  const started = await starter.startServer({ projectRoot: '/private/project', initialDiscoveryResult: readyDiscovery() });
  try { await run(server, events); } finally { await started.stop?.(); }
}

test('status and History contain throwing and absent dependencies behind correlated unknown or unavailable issues', async () => {
  const base = runtimeDependencies();
  await withRoutes({ ...base, get: async () => { throw Error('sk-secret raw runner stderr'); }, list: undefined }, async (server, events) => {
    const status = await server.renderGetResponse('/api/eval-runs/status?suiteId=suite&runId=run-1');
    const history = await server.renderGetResponse('/api/eval-runs/history?suiteId=suite');
    assert.equal(status.statusCode, 500);
    assert.equal(history.statusCode, 503);
    const issue = (JSON.parse(status.body) as { issue: { stage: string; category: string; reference: string } }).issue;
    assert.equal(issue.stage, 'status');
    assert.equal(issue.category, 'unknown');
    assert.equal(status.headers['x-sibu-request-reference'], issue.reference);
    assert.equal((JSON.parse(history.body) as { issue: { category: string } }).issue.category, 'unavailable');
    assert.equal(events.length, 2);
    assert.doesNotMatch(status.body + history.body + JSON.stringify(events) + JSON.stringify(status.headers), /sk-secret|private\/project|raw runner stderr/);
  });
});

test('terminal status copy distinguishes assertion failure, partial, blocked, error, and interrupted', async () => {
  const base = runtimeDependencies();
  const states = [
    ['completed', 'failed', 'assertion-failed', 'failed'], ['partial', 'incomplete', 'incomplete', 'partial'],
    ['blocked', 'incomplete', 'incomplete', 'blocked'], ['error', 'incomplete', 'incomplete', 'failed'],
    ['interrupted', 'incomplete', 'interrupted', 'interrupted'],
  ] as const;
  let index = 0;
  await withRoutes({ ...base, get: async () => ({ status: 'ok', value: { summary: { ...queued(), state: states[index++]![0], outcome: states[index - 1]![1],
    diagnostics: ['sk-secret raw artifact'] }, evidenceStatus: 'not-requested' } }) }, async (server, events) => {
    for (const [, , category, outcome] of states) {
      const response = await server.renderGetResponse('/api/eval-runs/status?suiteId=suite&runId=run-1');
      const issue = (JSON.parse(response.body) as { issue: { category: string; outcome: string; explanation: string } }).issue;
      assert.equal(issue.category, category);
      assert.equal(issue.outcome, outcome);
      assert.doesNotMatch(JSON.stringify(issue) + JSON.stringify(events), /sk-secret|raw artifact|runner stderr/);
    }
    assert.equal(events.length, 0);
  });
});

test('read issues remain safe for forged private reasons and a failing log sink', async () => {
  const base = runtimeDependencies();
  await withRoutes({ ...base, list: async () => ({ status: 'blocked', reason: 'sk-secret raw artifact' as 'unavailable' }) }, async (server) => {
    const response = await server.renderGetResponse('/api/eval-runs/history?suiteId=suite');
    assert.equal(response.statusCode, 422);
    assert.equal((JSON.parse(response.body) as { issue: { category: string } }).issue.category, 'unknown');
    assert.doesNotMatch(response.body + JSON.stringify(response.headers), /sk-secret|raw artifact/);
  }, true);
});

test('background execution event mapping retains real terminal categories without raw runner data', () => {
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  for (const outcome of ['completed', 'blocked', 'partial', 'interrupted', 'failed'] as const) {
    const event: ExecutionDiagnostic = { event: 'eval_run_finished', stage: 'execution', outcome,
      reason: outcome === 'failed' ? 'runner-timeout' : outcome === 'partial' ? 'runner-protocol-invalid' : 'sk-secret raw stderr', durationMs: 1 };
    const safe = safeExecutionEvent(Object.assign(event, { stderr: 'sk-secret raw stderr' }), reference, 'run-1');
    assert.equal(safe.outcome, outcome);
    assert.equal(safe.reference, reference);
    assert.equal(safe.runId, 'run-1');
    assert.equal(safe.reason, outcome === 'failed' ? 'runner-timeout' : outcome === 'partial' ? 'runner-protocol-invalid' : undefined);
    assert.doesNotMatch(JSON.stringify(safe), /sk-secret|raw stderr|private artifact/);
  }
  assert.equal(safeExecutionEvent({ event: 'eval_run_start_blocked', stage: 'execution', outcome: 'blocked', durationMs: 1 }, 'sk-secret', 'sk-secret/path').reference, undefined);
});

test('legacy input-unsafe describe issue stays unclassified without inventing a credential or provider cause', async () => {
  const base = runtimeDependencies();
  const suite = {
    version: 2 as const, kind: 'sibu-eval-suite' as const, id: 'suite', name: 'Suite', description: 'Synthetic',
    target: { id: 'target', kind: 'agent' as const, path: 'src/target.mjs' },
    coverage: { categories: [], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'Hi' } }],
      toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains' as const, expected: 'Hi' }], graders: [] }],
  };
  const describe = {
    suites: { load: async () => suite },
    runner: { describe: async () => ({ status: 'blocked' as const, reason: 'input-unsafe' as const,
      stderr: 'sk-secret private runner stderr', rejectedSettingName: 'PRIVATE_API_KEY', providerContent: 'provider-secret' }) },
  };
  await withRoutes({ ...base, describe }, async (server, events) => {
    const response = await server.renderJsonResponse('/api/eval-suites/describe', { suiteId: 'suite' });
    assert.equal(response.statusCode, 422);
    const payload = JSON.parse(response.body) as { status: string; reason: string; issue: {
      stage: string; outcome: string; category: string; title: string; explanation: string; nextStep: string;
      recoveryAction: string; reference: string;
    } };
    assert.equal(payload.status, 'blocked');
    assert.equal(payload.reason, 'input-unsafe');
    assert.equal(payload.issue.stage, 'model-check');
    assert.equal(payload.issue.outcome, 'blocked');
    assert.equal(payload.issue.category, 'input-unsafe');
    assert.match(payload.issue.title, /model check could not start/i);
    assert.match(payload.issue.explanation, /could not safely check this suite/i);
    assert.match(payload.issue.nextStep, /share the issue details/i);
    assert.equal(payload.issue.recoveryAction, 'retry');
    assert.match(payload.issue.reference, /^[a-f0-9-]{36}$/i);
    assert.equal(response.headers['x-sibu-request-reference'], payload.issue.reference);
    assert.doesNotMatch(response.body + JSON.stringify(events), /sk-secret|PRIVATE_API_KEY|provider-secret|credential|provider failure|missing setting|rejected setting/i);
  });
});
