import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import type { Attempt, Manifest, RunState } from '../run-history/contracts.js';
import type { HeadlessEvalRunDependencies } from './ports.js';
import { headlessEvalRun } from './handler.js';
import { executeEvalRun } from '../execute-eval-run/handler.js';
import { evaluateOutputAssertions } from '../run-execution/output-assertions.js';
import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import { project } from '../run-history/test-project.js';
import { fixture as artifactFixture } from '../run-history/store-fixture.js';
import { FileArtifactReader } from '../run-history/file-artifact-reader.js';

const basic = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'Hi' } }],
  toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains' as const, expected: 'Hi' }], graders: [] };
const suite: NormalizedEvalSuite = { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  defaultTestedModel: 'fake/model',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' }, coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: [basic, { ...basic, id: 'other' }] };
const description = { runnerId: 'fake', capabilities: ['single-turn', 'rubric'] as const, models: ['fake/model'], judgeModels: ['fake/judge'], requiredEnvironment: [] };
const command = { suiteId: 'suite', scope: { type: 'all' as const } };

function manifest(state: RunState, outcome: Manifest['outcome'] = 'passed'): Manifest {
  return { version: 1, suiteId: 'suite', runId: 'run-1', state, outcome, scope: 'all', testedModel: 'fake/model', judgeModel: null,
    caseIds: ['case', 'other'], owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2,
    calls: null, cost: null, diagnostics: [], cases: [{ caseId: 'case', state: 'completed', attempts: [{ number: 1, outcome, durationMs: 1, calls: null, cost: null }] }] };
}

function fixture(overrides: Partial<HeadlessEvalRunDependencies> = {}) {
  let state: RunState = 'completed';
  let outcome: Manifest['outcome'] = 'passed';
  let readCount = 0;
  const selected: string[][] = [];
  const events: unknown[] = [];
  const ports: HeadlessEvalRunDependencies = {
    suites: { load: async () => suite }, runner: { describe: async () => ({ status: 'ready', value: description }) },
    inputs: { resolve: async cases => ({ status: 'ready', value: cases }) }, artifacts: { check: async () => ({ status: 'ready', value: null }) },
    store: { create: async configuration => { selected.push([...configuration.caseIds]); return { status: 'ok', value: manifest('queued') }; } },
    executor: { execute: async () => ({ status: state === 'queued' || state === 'running' ? 'completed' : state, runId: 'run-1',
      ...(state === 'blocked' ? { reason: 'environment-missing' } :
        state === 'partial' ? { reason: 'runner-timeout' } :
        state === 'error' ? { reason: 'runner-protocol-invalid' } :
        state === 'interrupted' ? { reason: 'runner-exited' } : {}) }) },
    reader: { get: async () => { readCount++; return { status: 'ok', value: { summary: manifest(state, outcome), evidenceStatus: 'not-requested' } }; } },
    logger: { record: event => { events.push(event); } }, clock: () => 10, ...overrides,
  };
  return { ports, selected, events, setState: (value: RunState, check: Manifest['outcome'] = 'passed') => { state = value; outcome = check; },
    reads: () => readCount };
}

test('selected and all scopes await execution then persisted readback', async () => {
  const f = fixture();
  assert.deepEqual(await headlessEvalRun(command, f.ports), { status: 'completed', runId: 'run-1', outcome: 'passed',
    cases: [{ caseId: 'case', state: 'completed', attempts: [{ number: 1, outcome: 'passed' }] }], diagnostics: [] });
  assert.equal(f.reads(), 1);
  assert.deepEqual(await headlessEvalRun({ ...command, scope: { type: 'test_case', testCaseId: 'other' } }, f.ports),
    { status: 'completed', runId: 'run-1', outcome: 'passed', cases: [{ caseId: 'case', state: 'completed', attempts: [{ number: 1, outcome: 'passed' }] }], diagnostics: [] });
  assert.deepEqual(f.selected, [['case', 'other'], ['other']]);
});

test('handler remains pending until runner completion and reads artifact afterward', async () => {
  let release: (() => void) | undefined;
  const completion = new Promise<void>(resolve => { release = resolve; });
  const f = fixture({ executor: { execute: async () => { await completion; return { status: 'completed', runId: 'run-1' }; } } });
  const pending = headlessEvalRun(command, f.ports);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(f.reads(), 0);
  release?.();
  assert.equal((await pending).status, 'completed');
  assert.equal(f.reads(), 1);
});

test('invalid scope and full-suite run-only input block before allocation', async () => {
  const f = fixture();
  for (const [input, expected] of [
    [{ ...command, scope: { type: 'test_case' as const, testCaseId: 'missing' } }, { status: 'blocked', reason: 'case-unavailable', caseId: 'missing' }],
    [{ ...command, model: 'missing' }, { status: 'blocked', reason: 'run-only-scope-unsupported' }],
    [{ ...command, judgeModel: 'fake/judge' }, { status: 'blocked', reason: 'run-only-scope-unsupported' }],
  ] as const) assert.deepEqual(await headlessEvalRun(input, f.ports), expected);
  assert.deepEqual(f.selected, []);
});

test('rubric scope requires compatible judge and accepts one', async () => {
  const rubric = { ...basic, id: 'rubric', graders: [{ id: 'judge', type: 'rubric' as const,
    rubric: { type: 'inline' as const, text: 'Safe' }, threshold: 0.8 }] };
  const f = fixture({ suites: { load: async () => ({ ...suite, testCases: [rubric] }) } });
  assert.deepEqual(await headlessEvalRun(command, f.ports), { status: 'blocked', reason: 'missing-suite-default', caseId: 'rubric', role: 'judge' });
  assert.equal((await headlessEvalRun(command, { ...f.ports, suites: { load: async () => ({ ...suite, defaultJudgeModel: 'fake/judge', testCases: [rubric] }) } })).status, 'completed');
});

test('saved and temporary choices share preview selection policy and block before paid execution', async () => {
  let paidCalls = 0;
  const f = fixture({ executor: { execute: async () => { paidCalls++; return { status: 'completed', runId: 'run-1' }; } } });
  const missing = await headlessEvalRun(command, { ...f.ports, suites: { load: async () => ({ ...suite, defaultTestedModel: undefined }) } });
  assert.deepEqual(missing, { status: 'blocked', reason: 'missing-suite-default', caseId: 'case', role: 'tested' });
  const unavailable = await headlessEvalRun(command, { ...f.ports, suites: { load: async () => ({ ...suite, defaultTestedModel: 'retired' }) } });
  assert.deepEqual(unavailable, { status: 'blocked', reason: 'saved-model-unavailable', caseId: 'case', role: 'tested' });
  const temporary = await headlessEvalRun({ ...command, scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/model' }, f.ports);
  assert.equal(temporary.status, 'completed');
  assert.equal(paidCalls, 1);
  assert.deepEqual(f.selected, [['case']]);
});

test('failed assertions are completed, while partial blocked error and interrupted remain distinct', async () => {
  const f = fixture();
  f.setState('completed', 'failed');
  const failed = await headlessEvalRun(command, f.ports);
  assert.equal(failed.status, 'completed'); assert.equal(failed.runId, 'run-1'); assert.equal(failed.outcome, 'failed');
  assert.equal(failed.reason, undefined);
  for (const status of ['partial', 'blocked', 'error', 'interrupted'] as const) {
    f.setState(status, 'incomplete');
    const result = await headlessEvalRun(command, f.ports);
    assert.equal(result.status, status); assert.equal(result.runId, 'run-1'); assert.equal(result.outcome, 'incomplete');
    assert.equal(result.reason, { partial: 'runner-timeout', blocked: 'environment-missing',
      error: 'runner-protocol-invalid', interrupted: 'runner-exited' }[status]);
  }
});

test('missing artifact and nonterminal readback never report success', async () => {
  const missing = fixture({ reader: { get: async () => ({ status: 'blocked', reason: 'not-found' }) } });
  assert.deepEqual(await headlessEvalRun(command, missing.ports), { status: 'blocked', runId: 'run-1', reason: 'missing-artifact' });
  const queued = fixture(); queued.setState('queued');
  assert.deepEqual(await headlessEvalRun(command, queued.ports), { status: 'error', runId: 'run-1', reason: 'nonterminal-artifact' });
});

test('safe structured logger omits raw secrets and cannot change result', async () => {
  const f = fixture({ logger: { record: () => { throw Error('secret-value'); } } });
  assert.equal((await headlessEvalRun(command, f.ports)).status, 'completed');
  const safe = fixture();
  await headlessEvalRun(command, safe.ports);
  assert.deepEqual(safe.events, [{ event: 'headless_eval_run_finished', scope: 'all', status: 'completed', runId: 'run-1', durationMs: 0 }]);
  assert.doesNotMatch(JSON.stringify(safe.events), /secret|output|patch|evidence/i);
});

test('failed run exposes bounded ordered locators, not raw evidence or logs', async () => {
  const f = fixture(); f.setState('completed', 'failed');
  const attempts = Array.from({ length: 33 }, (_, index) => ({ id: `check-${index}`, kind: 'assertion' as const,
    outcome: 'failed' as const, score: null, expected: 'raw-secret', actual: 'raw-secret', diagnostics: ['raw-secret'], turnIds: [], toolIds: [] }));
  const evidence: Attempt = { version: 1, suiteId: 'suite', runId: 'run-1', caseId: 'case', number: 1, outcome: 'failed',
    durationMs: 1, calls: null, cost: null, output: 'raw-secret', truncated: false, diagnostics: ['raw-secret'], turns: [], tools: [], assertions: attempts };
  const reader = { get: async (_suiteId: string, _runId: string, selection?: { caseId: string }) => selection
    ? { status: 'ok' as const, value: { summary: manifest('completed', 'failed'), evidenceStatus: 'available' as const, evidence } }
    : { status: 'ok' as const, value: { summary: manifest('completed', 'failed'), evidenceStatus: 'not-requested' as const } } };
  const result = await headlessEvalRun(command, { ...f.ports, reader });
  const located = result.cases?.[0]?.attempts[0];
  assert.deepEqual(located?.failedAssertionIds, attempts.slice(0, 32).map(item => item.id));
  assert.equal(located?.locatorStatus, 'truncated');
  assert.doesNotMatch(JSON.stringify(result) + JSON.stringify(f.events), /raw-secret|output|turns|tools/);
});

test('missing or corrupt failed attempt yields unavailable while passed attempt has no locator', async () => {
  const f = fixture(); f.setState('partial', 'failed');
  const unavailable = await headlessEvalRun(command, { ...f.ports, reader: { get: async (_suiteId, _runId, selection) => selection
    ? { status: 'blocked', reason: 'corrupt' } as const
    : { status: 'ok', value: { summary: manifest('partial', 'failed'), evidenceStatus: 'not-requested' } } as const } });
  assert.equal(unavailable.status, 'partial');
  assert.deepEqual(unavailable.cases?.[0]?.attempts[0], { number: 1, outcome: 'failed', failedAssertionIds: [], locatorStatus: 'unavailable' });
  f.setState('completed', 'passed');
  assert.deepEqual((await headlessEvalRun(command, f.ports)).cases?.[0]?.attempts[0], { number: 1, outcome: 'passed' });
});

test('headless full-suite carries ordered mixed-Judge choices into one persisted logical run', async () => {
  const p = await project();
  try {
    const rubric = { ...basic, id: 'rubric', graders: [{ id: 'quality', type: 'rubric' as const,
      rubric: { type: 'inline' as const, text: 'quality' }, threshold: 0.8 }] };
    const cases = [{ ...basic, id: 'first' }, rubric, { ...basic, id: 'last' }];
    const mixedSuite = { ...suite, defaultJudgeModel: 'fake/judge', testCases: cases };
    const artifact = artifactFixture(p.root);
    const reader = new FileArtifactReader(artifact.paths, artifact.reader);
    const requests: { ids: string[]; judge: string | null; runId: string }[] = [];
    let interruptMiddle = false;
    const runner = { execute: async (batch: ExecutionSelection, consume: (event: ExecutionEvent) => Promise<void>) => {
      requests.push({ ids: batch.cases.map(item => item.id), judge: batch.judgeModel ?? null, runId: batch.runId });
      if (interruptMiddle && batch.cases[0]?.id === 'rubric') return { status: 'interrupted' as const };
      for (const item of batch.cases) {
        await consume({ type: 'case-started', caseId: item.id });
        await consume({ type: 'turn-completed', caseId: item.id, turnId: `${item.id}-turn`, output: 'Hi' });
        if (item.id === 'rubric') await consume({ type: 'grader-completed', caseId: item.id, attempt: 1,
          checkId: 'quality', grader: 'rubric', passed: true, score: 0.9, threshold: 0.8,
          judgeModel: batch.judgeModel ?? undefined, evidence: 'quality', diagnostics: [] });
        await consume({ type: 'case-completed', caseId: item.id, status: 'completed' });
      }
      await consume({ type: 'run-completed', status: 'completed' });
      return { status: 'completed' as const };
    } };
    const execute = async (selection: ExecutionSelection) => {
      const outcome = await executeEvalRun(selection, { runner, store: artifact.store,
        evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now });
      if (outcome.status === 'queued' || outcome.status === 'running') return { status: 'storage-failed' as const, runId: outcome.runId };
      return { status: outcome.status, runId: outcome.runId, ...(outcome.reason ? { reason: outcome.reason } : {}) };
    };
    const result = await headlessEvalRun(command, {
      suites: { load: async () => mixedSuite }, runner: { describe: async () => ({ status: 'ready', value: description }) },
      inputs: { resolve: async selected => ({ status: 'ready', value: selected }) },
      artifacts: { check: async () => ({ status: 'ready', value: null }) }, store: artifact.store,
      reader: { get: (suiteId, runId, selection) => reader.get(suiteId, runId, selection) },
      executor: { execute },
    });
    assert.equal(result.status, 'completed');
    assert.deepEqual(requests.map(item => item.ids), [['first'], ['rubric'], ['last']]);
    assert.deepEqual(requests.map(item => item.judge), [null, 'fake/judge', null]);
    assert.ok(requests.every(item => item.runId === result.runId));
    const detail = await reader.get('suite', result.runId!);
    assert.equal(detail.status, 'ok');
    if (detail.status === 'ok') assert.deepEqual(detail.value.summary.cases.map(item => item.judgeModel), [null, 'fake/judge', null]);
    requests.length = 0;
    interruptMiddle = true;
    const interrupted = await headlessEvalRun(command, {
      suites: { load: async () => mixedSuite }, runner: { describe: async () => ({ status: 'ready', value: description }) },
      inputs: { resolve: async selected => ({ status: 'ready', value: selected }) },
      artifacts: { check: async () => ({ status: 'ready', value: null }) }, store: artifact.store,
      reader: { get: (suiteId, runId, selection) => reader.get(suiteId, runId, selection) },
      executor: { execute },
    });
    assert.equal(interrupted.status, 'interrupted');
    assert.deepEqual(requests.map(item => item.ids), [['first'], ['rubric']]);
    assert.ok(requests.every(item => item.runId === interrupted.runId));
    const partialDetail = await reader.get('suite', interrupted.runId!);
    assert.equal(partialDetail.status, 'ok');
    if (partialDetail.status === 'ok') {
      assert.equal(partialDetail.value.summary.cases[0]?.state, 'completed');
      assert.equal(partialDetail.value.summary.cases[2]?.state, 'not-run');
    }
  } finally { await p.cleanup(); }
});
