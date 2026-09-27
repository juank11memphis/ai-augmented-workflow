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
const review = { selectedCaseIds: ['case'], targetCalls: 1, judgeCalls: 0, totalCalls: 1,
  cost: { status: 'unavailable' as const, reason: 'Provider pricing unavailable.' } };
const command: StartEvalRunCommand = { suiteId: 'suite', model: 'fake', scope: { type: 'all' }, repeats: 1, judgeModel: null, review };

function harness() {
  const events: string[] = [];
  let next = 0;
  const ports: StartEvalRunDependencies = {
    suites: { async load() { events.push('load'); return suite; } },
    runner: { async describe() { events.push('describe'); return { status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn'] as const,
      models: ['fake'], judgeModels: [], requiredEnvironment: [], costEstimation: true } }; },
      async estimate() { events.push('estimate'); return { status: 'ready', value: { targetCalls: 1, judgeCalls: 0, totalCalls: 1, cost: review.cost } }; } },
    artifacts: { async check() { events.push('readiness'); return { status: 'ready', value: null }; } },
    inputs: { async resolve(cases) { events.push('resolve'); return { status: 'ready', value: cases }; } },
    store: { async create() { events.push('create'); return { status: 'ok', value: { ...queued(), runId: 'run-' + ++next } }; },
      async start() { return { status: 'blocked', reason: 'unavailable' }; }, async append() { return { status: 'blocked', reason: 'unavailable' }; },
      async finalize() { events.push('finalize'); return { status: 'ok', value: queued() }; } },
    scheduler: { schedule() { events.push('schedule'); } },
  };
  return { ports, events };
}

test('freshly validates and queues before scheduling independent run identities', async () => {
  const h = harness();
  const first = await startEvalRun(command, h.ports);
  const second = await startEvalRun(command, h.ports);
  assert.equal(first.status, 'queued'); assert.equal(second.status, 'queued');
  if (first.status !== 'queued' || second.status !== 'queued') return;
  assert.notEqual(first.runId, second.runId);
  assert.deepEqual(h.events.slice(0, 7), ['load', 'describe', 'readiness', 'resolve', 'estimate', 'create', 'schedule']);
});

test('rejects stale review and unsupported checks before creating a run', async () => {
  const stale = harness();
  assert.deepEqual(await startEvalRun({ ...command, review: { ...review, totalCalls: 2 } }, stale.ports), { status: 'blocked', reason: 'review-stale' });
  assert.ok(!stale.events.includes('create'));
  const invalid = harness();
  assert.deepEqual(await startEvalRun({ ...command, repeats: 21 }, invalid.ports), { status: 'blocked', reason: 'input-unsafe' });
  assert.deepEqual(invalid.events, []);
});

test('reviewed repeats and Judge Model reach queued configuration and scheduler', async () => {
  const h = harness();
  const rubricCase = { ...one, graders: [{ id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'good' }, threshold: 0.8 }] };
  h.ports.suites.load = async () => ({ ...suite, testCases: [rubricCase] });
  h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn', 'rubric'] as const,
    models: ['fake'], judgeModels: ['judge'], requiredEnvironment: [], costEstimation: true } });
  h.ports.runner.estimate = async (_suite, input) => ({ status: 'ready', value: { targetCalls: input.repeats,
    judgeCalls: input.repeats, totalCalls: input.repeats * 2, cost: review.cost } });
  let created: unknown;
  let scheduled: unknown;
  const originalCreate = h.ports.store.create;
  h.ports.store.create = async input => { created = input; return originalCreate(input); };
  h.ports.scheduler.schedule = selection => { scheduled = selection; };
  const deepReview = { ...review, targetCalls: 2, judgeCalls: 2, totalCalls: 4 };
  const result = await startEvalRun({ ...command, judgeModel: 'judge', repeats: 2, review: deepReview }, h.ports);
  assert.equal(result.status, 'queued');
  assert.deepEqual(created && { judgeModel: (created as { judgeModel: string }).judgeModel, repeats: (created as { repeats: number }).repeats }, { judgeModel: 'judge', repeats: 2 });
  assert.deepEqual(scheduled && { judgeModel: (scheduled as { judgeModel: string }).judgeModel, repeats: (scheduled as { repeats: number }).repeats }, { judgeModel: 'judge', repeats: 2 });
});

test('scheduler failure marks the queued run error, not started', async () => {
  const h = harness();
  h.ports.scheduler.schedule = () => { throw new Error('synthetic'); };
  assert.deepEqual(await startEvalRun(command, h.ports), { status: 'blocked', reason: 'schedule-failed' });
  assert.deepEqual(h.events.slice(-2), ['create', 'finalize']);
});
