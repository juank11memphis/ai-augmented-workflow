import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPLY_APPROVED_REPAIR_MARKER } from '../apply-approved-eval-repair/index.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { FakeLocalHttpServer, analysisPayload, applyRepairDependencies, readyDiscovery, runtimeDependencies } from './local-server-starter-test-fixture.js';

const reference = '123e4567-e89b-42d3-a456-426614174000';

test('oversized apply payload exposes only safe issue fields and cannot mutate', async () => {
  const server = new FakeLocalHttpServer(4321);
  const calls: unknown[] = [];
  const events: unknown[] = [];
  const logger = { info: (event: unknown) => events.push(event), warn: (event: unknown) => events.push(event), error: (event: unknown) => events.push(event) };
  const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; },
    () => runtimeDependencies({ applyRepair: applyRepairDependencies({ mutationCalls: calls }) }), logger);
  const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
  try {
    const response = await server.renderRawResponse('/api/repair-proposals/apply', 'sk-secret'.repeat(10000), reference);
    const payload = JSON.parse(response.body) as { issue: Record<string, string> };
    assert.equal(response.statusCode, 400);
    assert.deepEqual(Object.keys(payload.issue).sort(), ['category', 'explanation', 'nextStep', 'outcome', 'recoveryAction', 'reference', 'stage', 'title']);
    assert.deepEqual({ stage: payload.issue.stage, outcome: payload.issue.outcome, category: payload.issue.category,
      reference: payload.issue.reference }, { stage: 'repair-apply', outcome: 'blocked', category: 'invalid-request', reference });
    assert.deepEqual(calls, []);
    assert.doesNotMatch(response.body + JSON.stringify(events), /sk-secret|private|prompts\//);
  } finally { await started.stop?.(); }
});

test('apply response-write failure records uncertainty rather than claiming delivery', async () => {
  const server = new FakeLocalHttpServer(4321);
  const calls: unknown[] = [];
  const events: unknown[] = [];
  const logger = { info: (event: unknown) => events.push(event), warn: (event: unknown) => events.push(event), error: (event: unknown) => events.push(event) };
  const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; },
    () => runtimeDependencies({ applyRepair: applyRepairDependencies({ mutationCalls: calls }) }), logger);
  const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
  try {
    const listeners = new Map<string, Function>();
    server.handler?.({ url: '/api/repair-proposals/apply', method: 'POST', headers: { 'x-sibu-request-reference': reference },
      on: (event, listener) => { listeners.set(event, listener); } },
    { writeHead: () => undefined, end: () => { throw new Error('sk-secret closed response'); } });
    listeners.get('data')?.(JSON.stringify({ ...analysisPayload(), proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER }));
    listeners.get('end')?.();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 1);
    const last = events.at(-1) as { event: string; outcome: string; reason: string; reference: string };
    assert.deepEqual(last, { event: 'local_evals_workbench_apply_response_failed', stage: 'repair-apply',
      outcome: 'uncertain', reason: 'response-write-failed', reference });
    assert.doesNotMatch(JSON.stringify(events), /sk-secret|prompts\/|proposalId/);
  } finally { await started.stop?.(); }
});

test('throwing apply diagnostic sink cannot change a confirmed blocked response', async () => {
  const server = new FakeLocalHttpServer(4321);
  const logger = { info: () => { throw new Error('sk-secret sink'); }, warn: () => { throw new Error('sk-secret sink'); },
    error: () => { throw new Error('sk-secret sink'); } };
  const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; },
    () => runtimeDependencies({ applyRepair: applyRepairDependencies() }), logger);
  const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
  try {
    const response = await server.renderJsonResponse('/api/repair-proposals/apply', {
      ...analysisPayload(), proposalId: 'repair_1', approvalMarker: 'not-approved' }, reference);
    assert.equal(response.statusCode, 422);
    assert.equal((JSON.parse(response.body) as { issue: { category: string } }).issue.category, 'missing-approval');
    assert.doesNotMatch(response.body, /sk-secret/);
  } finally { await started.stop?.(); }
});
