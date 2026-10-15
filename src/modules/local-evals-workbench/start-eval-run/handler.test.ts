import assert from 'node:assert/strict';
import test from 'node:test';
import { startEvalRun } from './handler.js';
import type { StartEvalRunCommand } from './command.js';
import type { StartEvalRunDependencies } from './ports.js';
import { queued } from '../run-history/test-fixtures.js';
import { previewEvalRun } from '../preview-eval-run/handler.js';

const one = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'input' } }], toolMocks: [],
  assertions: [{ id: 'check', type: 'output-contains' as const, expected: 'answer' }], graders: [] };
const suite = { version: 2 as const, kind: 'sibu-eval-suite' as const, id: 'suite', name: 'Suite', description: '',
  defaultTestedModel: 'fake', defaultJudgeModel: 'judge',
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
function previewPorts(h: ReturnType<typeof harness>) {
  return { suites: h.ports.suites, runner: h.ports.runner, artifacts: h.ports.artifacts, inputs: h.ports.inputs };
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

test('rejects invalid suite identity before creating a run', async () => {
  const invalid = harness();
  assert.deepEqual(await startEvalRun({ ...command, suiteId: '' }, invalid.ports), { status: 'blocked', reason: 'input-unsafe' });
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

test('mixed full-suite start stores and schedules complete ordered Judge choices', async () => {
  const h = harness();
  const rubric = { ...one, id: 'rubric', graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  const last = { ...one, id: 'last' };
  h.ports.suites.load = async () => ({ ...suite, testCases: [one, rubric, last] });
  h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn', 'rubric'] as const,
    models: ['fake'], judgeModels: ['judge'], requiredEnvironment: [] } });
  let created: unknown;
  const create = h.ports.store.create;
  h.ports.store.create = async input => { created = input; return create(input); };
  const preview = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, previewPorts(h));
  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') return;
  assert.equal((await startEvalRun({ suiteId: 'suite', scope: { type: 'all' }, previewToken: preview.previewToken }, h.ports)).status, 'queued');
  const expected = [{ caseId: 'case', testedModel: 'fake', judgeModel: null },
    { caseId: 'rubric', testedModel: 'fake', judgeModel: 'judge' }, { caseId: 'last', testedModel: 'fake', judgeModel: null }];
  assert.deepEqual((created as { caseSelections: unknown }).caseSelections, expected);
  assert.deepEqual((h.schedules[0] as { caseSelections: unknown }).caseSelections, expected);
  assert.equal(h.events.filter(item => item === 'create').length, 1);
  assert.equal(h.events.filter(item => item === 'schedule').length, 1);
});

test('inconsistent resolved inputs block before artifact creation or dispatch', async () => {
  const h = harness();
  h.ports.inputs.resolve = async () => ({ status: 'ready', value: [] });
  assert.deepEqual(await startEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, h.ports), { status: 'blocked', reason: 'invalid-input' });
  assert.equal(h.events.includes('create'), false);
  assert.equal(h.events.includes('schedule'), false);
});

test('missing or unavailable rubric Judge stops the entire mixed scope before a runner call', async () => {
  const rubric = { ...one, id: 'rubric', graders: [{ id: 'quality', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
  for (const judge of [undefined, 'judge']) {
    const h = harness();
    h.ports.suites.load = async () => ({ ...suite, defaultJudgeModel: judge, testCases: [one, rubric] });
    h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn', 'rubric'] as const,
      models: ['fake'], judgeModels: [], requiredEnvironment: [] } });
    const result = await startEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, h.ports);
    assert.equal(result.status, 'blocked');
    if (result.status === 'blocked') assert.deepEqual([result.caseId, result.role], ['rubric', 'judge']);
    assert.equal(h.events.includes('create'), false);
    assert.equal(h.events.includes('schedule'), false);
  }
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
  assert.deepEqual(await startEvalRun({ ...command, reference: secret }, blocked.ports), { status: 'blocked', reason: 'runner-unavailable' });
  assert.equal(blocked.events.filter(event => event === 'schedule').length, 0);
  assert.ok(!JSON.stringify(blocked.diagnostics).includes(secret));
  const queued = harness();
  assert.deepEqual(await startEvalRun(command, { ...queued.ports, logger: { record() { throw new Error(secret); } } }),
    { status: 'queued', suiteId: 'suite', runId: 'run-1' });
  assert.deepEqual(queued.events.slice(-2), ['create', 'schedule']);
});

test('preview and start resolve the same saved pair; rerun needs no repeated model choice', async () => {
  const h = harness();
  const preview = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, previewPorts(h));
  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') return;
  assert.deepEqual({ model: preview.model, judgeModel: preview.judgeModel }, { model: 'fake', judgeModel: null });
  let created: unknown;
  const create = h.ports.store.create;
  h.ports.store.create = async configuration => { created = configuration; return create(configuration); };
  assert.equal((await startEvalRun({ suiteId: 'suite', scope: { type: 'all' }, previewToken: preview.previewToken }, h.ports)).status, 'queued');
  assert.deepEqual({ model: (created as { testedModel: string }).testedModel, judgeModel: (created as { judgeModel: string | null }).judgeModel },
    { model: preview.model, judgeModel: preview.judgeModel });
  assert.equal((await startEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, h.ports)).status, 'queued');
  assert.equal(h.schedules.length, 2);
});

test('missing or unavailable saved defaults block before artifact creation and paid scheduling', async () => {
  for (const changed of [
    { ...suite, defaultTestedModel: undefined },
    { ...suite, defaultTestedModel: 'not/advertised' },
  ]) {
    const h = harness();
    h.ports.suites.load = async () => changed;
    const preview = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, previewPorts(h));
    const start = await startEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, h.ports);
    assert.equal(preview.status, 'blocked');
    assert.equal(start.status, 'blocked');
    assert.equal(h.events.includes('create'), false);
    assert.equal(h.events.includes('schedule'), false);
  }
});

test('changed suite or catalog after preview requires a new explicit Start with no queue', async () => {
  for (const change of ['suite', 'catalog'] as const) {
    const h = harness();
    let currentSuite = suite;
    let models = ['fake', 'other'];
    h.ports.suites.load = async () => currentSuite;
    h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn'] as const,
      models, judgeModels: [], requiredEnvironment: [] } });
    const preview = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' } }, previewPorts(h));
    assert.equal(preview.status, 'ready');
    if (preview.status !== 'ready') return;
    if (change === 'suite') currentSuite = { ...suite, name: 'edited suite' };
    else models = ['other', 'fake'];
    assert.deepEqual(await startEvalRun({ suiteId: 'suite', scope: { type: 'all' }, previewToken: preview.previewToken }, h.ports),
      { status: 'blocked', reason: 'suite-changed' });
    assert.equal(h.events.includes('create'), false);
    assert.equal(h.events.includes('schedule'), false);
  }
});

test('single-case run-only choice travels to actual queued evidence without mutating the suite', async () => {
  const h = harness();
  const before = JSON.stringify(suite);
  h.ports.runner.describe = async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: ['single-turn'] as const,
    models: ['fake', 'temporary'], judgeModels: [], requiredEnvironment: [] } });
  const scope = { type: 'test_case' as const, testCaseId: 'case' };
  const runOnly = { testedModel: 'temporary' };
  const preview = await previewEvalRun({ suiteId: 'suite', scope, runOnly }, previewPorts(h));
  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') return;
  assert.equal(preview.model, 'temporary');
  let created: unknown;
  const create = h.ports.store.create;
  h.ports.store.create = async configuration => { created = configuration; return create(configuration); };
  assert.equal((await startEvalRun({ suiteId: 'suite', scope, runOnly, previewToken: preview.previewToken }, h.ports)).status, 'queued');
  assert.equal((created as { testedModel: string }).testedModel, 'temporary');
  assert.equal((h.schedules[0] as { model: string }).model, 'temporary');
  assert.equal(JSON.stringify(suite), before);
  assert.equal((await startEvalRun({ suiteId: 'suite', scope: { type: 'all' }, runOnly }, h.ports)).status, 'blocked');
  assert.equal(h.schedules.length, 1);
});
