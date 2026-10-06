import assert from 'node:assert/strict';
import test from 'node:test';
import { startEvalRun } from './handler.js';
import type { StartEvalRunCommand } from './command.js';
import type { StartEvalRunDependencies } from './ports.js';
import { queued } from '../run-history/test-fixtures.js';

const one = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'input' } }], toolMocks: [],
  assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'answer' }], graders: [] };
const suite = { version: 2 as const, kind: 'sibu-eval-suite' as const, id: 'suite', name: 'Suite', description: '',
  target: { id: 'target', kind: 'integration' as const, path: 'src/target.mjs' }, coverage: { categories: [], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: [one] };
const command: StartEvalRunCommand = { suiteId: 'suite', model: 'fake', scope: { type: 'all' }, judgeModel: null };

function harness() {
  const events: string[] = [];
  const diagnostics: unknown[] = [];
  const schedules: unknown[] = [];
  const finalized: unknown[] = [];
  let next = 0;
  const ports: StartEvalRunDependencies = {
    suites: { async load() { events.push('load'); return suite; } },
    runner: { async describe() { events.push('describe'); return { status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn'] as const,
      models: ['fake'], judgeModels: [], requiredEnvironment: [] } }; } },
    artifacts: { async check() { events.push('readiness'); return { status: 'ready', value: null }; } },
    inputs: { async resolve(cases) { events.push('resolve'); return { status: 'ready', value: cases }; } },
    store: { async create() { events.push('create'); return { status: 'ok', value: { ...queued(), runId: 'run-' + ++next } }; },
      async start() { return { status: 'blocked', reason: 'unavailable' }; }, async append() { return { status: 'blocked', reason: 'unavailable' }; },
      async finalize(suiteId, runId, state, reasons) { events.push('finalize'); finalized.push({ suiteId, runId, state, reasons });
        return { status: 'ok', value: queued() }; } },
    scheduler: { schedule(selection) { events.push('schedule'); schedules.push(selection); } },
    logger: { record(event) { diagnostics.push(event); } },
  };
  return { ports, events, diagnostics, schedules, finalized };
}

test('freshly validates and queues before scheduling independent run identities', async () => {
  const h = harness();
  const first = await startEvalRun(command, h.ports);
  const second = await startEvalRun(command, h.ports);
  assert.equal(first.status, 'queued'); assert.equal(second.status, 'queued');
  if (first.status !== 'queued' || second.status !== 'queued') return;
  assert.notEqual(first.runId, second.runId);
  assert.deepEqual(h.events.slice(0, 6), ['load', 'describe', 'readiness', 'resolve', 'create', 'schedule']);
  assert.equal(h.events.filter(event => event === 'create').length, 2);
  assert.equal(h.events.filter(event => event === 'schedule').length, 2);
  assert.deepEqual(h.diagnostics.map(event => (event as { outcome: string }).outcome), ['queued', 'queued']);
});

test('rejects invalid selection before creating a run', async () => {
  const invalid = harness();
  assert.deepEqual(await startEvalRun({ ...command, model: '' }, invalid.ports), { status: 'blocked', reason: 'input-unsafe' });
  assert.deepEqual(invalid.events, []);
});

test('selected Judge Model reaches queued configuration and scheduler', async () => {
  const h = harness();
  const rubricCase = { ...one, graders: [{ id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'good' }, threshold: 0.8 }] };
  h.ports.suites.load = async () => ({ ...suite, testCases: [rubricCase] });
  h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn', 'rubric'] as const,
    models: ['fake'], judgeModels: ['judge'], requiredEnvironment: [] } });
  let created: unknown;
  let scheduled: unknown;
  const originalCreate = h.ports.store.create;
  h.ports.store.create = async input => { created = input; return originalCreate(input); };
  h.ports.scheduler.schedule = selection => { scheduled = selection; };
  const result = await startEvalRun({ ...command, judgeModel: 'judge' }, h.ports);
  assert.equal(result.status, 'queued');
  assert.deepEqual(created && { judgeModel: (created as { judgeModel: string }).judgeModel }, { judgeModel: 'judge' });
  assert.deepEqual(scheduled && { judgeModel: (scheduled as { judgeModel: string }).judgeModel }, { judgeModel: 'judge' });
});

test('scheduler failure marks the queued run error, not started', async () => {
  const h = harness();
  h.ports.scheduler.schedule = () => { throw new Error('synthetic'); };
  assert.deepEqual(await startEvalRun(command, h.ports), { status: 'blocked', reason: 'schedule-failed' });
  assert.deepEqual(h.events.slice(-2), ['create', 'finalize']);
  assert.deepEqual(h.finalized, [{ suiteId: 'suite', runId: 'run-1', state: 'error', reasons: ['schedule-failed'] }]);
  assert.equal(h.events.filter(event => event === 'schedule').length, 0);
  assert.deepEqual(h.diagnostics.map(event => (event as { outcome: string; reason: string }).outcome + ':' + (event as { reason: string }).reason), ['blocked:schedule-failed']);
});

test('accepted reference reaches generated run handoff and diagnostics omit private inputs', async () => {
  const h = harness();
  const secret = 'SYNTHETIC_SECRET_DO_NOT_LOG';
  const reference = '123e4567-e89b-42d3-a456-426614174000';
  h.ports.suites.load = async () => ({ ...suite, name: secret, testCases: [{ ...one, name: secret }] });
  const result = await startEvalRun({ ...command, reference }, h.ports);
  assert.deepEqual(result, { status: 'queued', suiteId: 'suite', runId: 'run-1' });
  assert.equal(h.schedules.length, 1);
  assert.deepEqual(h.schedules.map(selection => ({ reference: (selection as { reference: string }).reference,
    runId: (selection as { runId: string }).runId })), [{ reference, runId: 'run-1' }]);
  assert.deepEqual(h.diagnostics, [{ event: 'eval_run_queued', stage: 'run-start', outcome: 'queued', reference,
    runId: 'run-1', durationMs: (h.diagnostics[0] as { durationMs: number }).durationMs }]);
  assert.ok(!JSON.stringify(h.diagnostics).includes(secret));
  assert.ok(!JSON.stringify(h.diagnostics).includes('suiteId'));
  assert.ok(!JSON.stringify(h.diagnostics).includes('testCases'));
});

test('unsafe reference and thrown secret never enter events; logging failures do not change outcome', async () => {
  const secret = 'SYNTHETIC_SECRET_DO_NOT_LOG';
  const blocked = harness();
  blocked.ports.runner.describe = async () => { throw new Error(secret); };
  assert.deepEqual(await startEvalRun({ ...command, reference: secret }, blocked.ports), { status: 'blocked', reason: 'unavailable' });
  assert.equal(blocked.events.filter(event => event === 'schedule').length, 0);
  assert.ok(!JSON.stringify(blocked.diagnostics).includes(secret));
  const queued = harness();
  assert.deepEqual(await startEvalRun(command, { ...queued.ports, logger: { record() { throw new Error(secret); } } }),
    { status: 'queued', suiteId: 'suite', runId: 'run-1' });
  assert.deepEqual(queued.events.slice(-2), ['create', 'schedule']);
});
