import assert from 'node:assert/strict';
import { it } from 'node:test';

import { FakeLocalHttpServer, readyDiscovery, runtimeDependencies, withOfflineWorkbench } from './local-server-starter-test-fixture.js';
import { StartReferenceRegistry } from './start-reference-registry.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import type { StartEvalRunDependencies } from '../start-eval-run/ports.js';
import { queued } from '../run-history/test-fixtures.js';

const first = '123e4567-e89b-42d3-a456-426614174000';
const second = '123e4567-e89b-42d3-a456-426614174001';
const missing = '123e4567-e89b-42d3-a456-426614174002';

it('returns a confirmed queue reference and resolves only its exact History association', async () => {
  await withOfflineWorkbench(async ({ post, get }) => {
    const selection = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/available' };
    const payload = selection;
    const [a, b] = await Promise.all([post('/api/eval-runs/start', payload, first), post('/api/eval-runs/start', payload, second)]);
    assert.equal(a.code, 202);
    assert.equal(a.payload.reference, first);
    assert.equal(a.headers.get('x-sibu-request-reference'), first);
    assert.match(String(a.payload.runId), /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);

    const unrelated = await get(`/api/eval-runs/history?suiteId=offline&reference=${missing}`);
    assert.deepEqual(unrelated.payload, { status: 'unconfirmed' });
    assert.equal(b.code, 202);
    assert.notEqual(a.payload.runId, b.payload.runId);
    const aMatch = await get(`/api/eval-runs/history?suiteId=offline&reference=${first}`);
    const bMatch = await get(`/api/eval-runs/history?suiteId=offline&reference=${second}`);
    assert.deepEqual(aMatch.payload, { status: 'confirmed', runId: a.payload.runId, suiteId: 'offline', reference: first });
    assert.deepEqual(bMatch.payload, { status: 'confirmed', runId: b.payload.runId, suiteId: 'offline', reference: second });
    assert.deepEqual((await get(`/api/eval-runs/history?suiteId=other&reference=${first}`)).payload, { status: 'unconfirmed' });

    const reused = await post('/api/eval-runs/start', payload, first);
    assert.equal(reused.code, 409);
    assert.equal((reused.payload.issue as { category: string }).category, 'reference-reused');
    assert.deepEqual((await get(`/api/eval-runs/history?suiteId=offline&reference=${first}`)).payload, { status: 'ambiguous' });
    const invalid = await get('/api/eval-runs/history?suiteId=offline&reference=OPENAI_API_KEY%3Dsk-secret');
    assert.equal(invalid.code, 400);
    assert.deepEqual(invalid.payload, { status: 'unconfirmed' });
  });
});

it('rejects obsolete review payloads and malformed input without reflecting secrets', async () => {
  await withOfflineWorkbench(async ({ post, get }) => {
    const bad = await post('/api/eval-runs/start', { token: 'OPENAI_API_KEY=sk-secret', prompt: 'private prompt' }, 'injected-sk-secret');
    assert.equal(bad.code, 400);
    assert.equal((bad.payload.issue as { category: string }).category, 'invalid-request');
    assert.match(String(bad.payload.reference), /^[a-f0-9-]{36}$/);
    assert.doesNotMatch(JSON.stringify(bad.payload) + JSON.stringify([...bad.headers]), /sk-secret|private prompt|injected/);

    const legacy = await post('/api/eval-runs/start', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available',
      review: { selectedCaseIds: ['first'] } }, first);
    assert.equal(legacy.code, 400);
    const issue = legacy.payload.issue as Record<string, unknown>;
    assert.deepEqual([issue.stage, issue.outcome, issue.category, issue.reference], ['run-start', 'blocked', 'invalid-request', first]);
    assert.ok(issue.title && issue.explanation && issue.nextStep && issue.recoveryAction);
    assert.deepEqual((await get(`/api/eval-runs/history?suiteId=offline&reference=${first}`)).payload, { status: 'unconfirmed' });
  });
});

it('uses only bounded transient associations and makes reuse permanently ambiguous until eviction', () => {
  const registry = new StartReferenceRegistry();
  assert.equal(registry.reserve(first, 'offline'), true);
  assert.deepEqual(registry.resolve(first, 'offline'), { status: 'unconfirmed' });
  registry.confirm(first, 'offline', 'run-1');
  assert.deepEqual(new StartReferenceRegistry().resolve(first, 'offline'), { status: 'unconfirmed' });
  assert.equal(registry.reserve(first, 'offline'), false);
  assert.deepEqual(registry.resolve(first, 'offline'), { status: 'ambiguous' });
  for (let i = 0; i < 256; i++) registry.reserve(`reference-${i}`, 'offline');
  assert.deepEqual(registry.resolve(first, 'offline'), { status: 'unconfirmed' });
});

it('keeps blocked and queued HTTP outcomes unchanged when the terminal logger throws', async () => {
  const brokenLogger = { info: () => { throw new Error('sk-secret'); }, warn: () => { throw new Error('sk-secret'); }, error: () => { throw new Error('sk-secret'); } };
  await withOfflineWorkbench(async ({ post }) => {
    const selection = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/available' };
    const invalid = await post('/api/eval-runs/start', { prompt: 'private prompt' }, first);
    assert.equal(invalid.code, 400);
    assert.equal((invalid.payload.issue as { category: string }).category, 'invalid-request');
    const queued = await post('/api/eval-runs/start', selection, second);
    assert.equal(queued.code, 202);
    assert.equal(queued.payload.reference, second);
    assert.doesNotMatch(JSON.stringify(queued.payload) + JSON.stringify(invalid.payload), /sk-secret|private prompt/);
  }, brokenLogger);
});

it('does not rewrite a queued run as blocked when response writing fails', async () => {
  const fake = new FakeLocalHttpServer(4321);
  const cases = [{ id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'secret prompt' } }],
    toolMocks: [], assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'answer' }], graders: [] }];
  const suite = { version: 2 as const, kind: 'sibu-eval-suite' as const, id: 'suite', name: 'Suite', description: '',
    target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' }, coverage: { categories: [], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: cases };
  let scheduled = 0;
  const events: unknown[] = [];
  const start: StartEvalRunDependencies = {
    suites: { load: async () => suite },
    runner: { describe: async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn'], models: ['fake'],
      judgeModels: [], requiredEnvironment: [] } }) },
    artifacts: { check: async () => ({ status: 'ready', value: null }) },
    inputs: { resolve: async () => ({ status: 'ready', value: cases }) },
    store: { create: async () => ({ status: 'ok', value: { ...queued(), runId: 'run-1' } }),
      start: async () => ({ status: 'blocked', reason: 'unavailable' }), append: async () => ({ status: 'blocked', reason: 'unavailable' }),
      finalize: async () => ({ status: 'ok', value: queued() }) },
    scheduler: { schedule: () => { scheduled++; } },
  };
  const starter = new NodeLocalWorkbenchServerStarter(handler => { fake.handler = handler; return fake; },
    () => ({ ...runtimeDependencies(), start }), { info: event => events.push(event), warn: event => events.push(event), error: event => events.push(event) });
  const server = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
  try {
    const listeners = new Map<string, Function>();
    let writes = 0;
    const request = { url: '/api/eval-runs/start', method: 'POST', headers: { 'x-sibu-request-reference': first },
      on: (event: string, callback: Function) => { listeners.set(event, callback); } };
    fake.handler?.(request, { writeHead: () => { writes++; throw new Error('sk-secret response closed'); }, end: () => assert.fail('closed response') });
    listeners.get('data')?.(JSON.stringify({ suiteId: 'suite', model: 'fake', scope: { type: 'all' } }));
    listeners.get('end')?.();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scheduled, 1);
    assert.equal(writes, 1);
    assert.deepEqual(events, [
      { event: 'local_evals_workbench_run_start_queued', stage: 'run-start', outcome: 'queued', reference: first, runId: 'run-1' },
      { event: 'local_evals_workbench_run_start_response_failed', stage: 'run-start', outcome: 'uncertain', reason: 'response-write-failed', reference: first, runId: 'run-1' },
    ]);
    const lookup = fake.renderResponse(`/api/eval-runs/history?suiteId=suite&reference=${first}`);
    assert.deepEqual(JSON.parse(lookup.body), { status: 'confirmed', runId: 'run-1', suiteId: 'suite', reference: first });
  } finally { await server.stop?.(); }
});
