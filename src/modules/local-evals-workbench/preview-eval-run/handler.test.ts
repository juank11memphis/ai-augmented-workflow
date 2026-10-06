import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { previewEvalRun } from './handler.js';
import type { PreviewEvalRunDependencies } from './handler.js';
import type { PreviewStage } from './result.js';

const command = { suiteId: 'suite', scope: { type: 'all' as const }, model: 'fake/target' };

const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'Hi' }], graders: [] }],
};
const description = { runnerId: 'fake', capabilities: ['single-turn'] as const, models: ['fake/target'], judgeModels: [], requiredEnvironment: [] };
function dependencies(): PreviewEvalRunDependencies {
  return {
    suites: { load: async () => suite }, artifacts: { check: async () => ({ status: 'ready', value: null }) },
    inputs: { resolve: async (cases) => ({ status: 'ready', value: cases }) },
    runner: {
      describe: async () => ({ status: 'ready', value: description }),
    },
  };
}
test('preview returns selected cases without invoking the model', async () => {
  const deps = dependencies();
  const result = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' }, model: 'fake/target' }, deps);
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') {
    assert.deepEqual(result.selectedCaseIds, ['case']);
  }
});
test('selection and readiness blocks before queueing', async () => {
  for (const command of [
    { suiteId: 'suite', scope: { type: 'test_case' as const, testCaseId: 'missing' }, model: 'fake/target' },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'wrong' },
  ]) {
    const deps = dependencies();
    assert.equal((await previewEvalRun(command, deps)).status, 'blocked');
  }
  const deps = dependencies();
  deps.artifacts.check = async () => ({ status: 'blocked', reason: 'artifact-unsafe' });
  assert.deepEqual(await previewEvalRun(command, deps), { status: 'blocked', stage: 'artifact-readiness', reason: 'artifact-unsafe' });
});
test('rubric suites keep Judge readiness explicit even for a deterministic case', async () => {
  const rubricSuite: NormalizedEvalSuite = { ...suite, testCases: [...suite.testCases, {
    id: 'rubric', name: 'Rubric', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }],
    toolMocks: [], assertions: [], graders: [{ id: 'tone', type: 'rubric', rubric: { type: 'inline', text: 'Kind' }, threshold: 0.8 }],
  }] };
  const deps = dependencies();
  deps.suites.load = async () => rubricSuite;
  assert.deepEqual(await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/target' }, deps),
    { status: 'blocked', stage: 'description', reason: 'capability-unsupported' });
  deps.runner.describe = async () => ({ status: 'ready', value: { ...description, capabilities: ['single-turn', 'rubric'], judgeModels: ['fake/judge'] } });
  assert.deepEqual(await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' }, model: 'fake/target' }, deps),
    { status: 'blocked', stage: 'description', reason: 'judge-unavailable' });
  const ready = await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' }, model: 'fake/target', judgeModel: 'fake/judge' }, deps);
  assert.equal(ready.status, 'ready');
  if (ready.status === 'ready') assert.equal(ready.judgeModel, 'fake/judge');
});

test('known blocks retain their observed stage and narrow reason', async () => {
  const cases: readonly {
    stage: PreviewStage; reason: string; prepare: (deps: PreviewEvalRunDependencies) => void;
  }[] = [
    { stage: 'selection', reason: 'suite-unavailable', prepare: deps => { deps.suites.load = async () => undefined; } },
    { stage: 'description', reason: 'runner-timeout', prepare: deps => { deps.runner.describe = async () => ({ status: 'blocked', reason: 'runner-timeout' }); } },
    { stage: 'description', reason: 'input-unsafe', prepare: deps => { deps.runner.describe = async () => ({ status: 'blocked', reason: 'input-unsafe' }); } },
    { stage: 'description', reason: 'required-setting-rejected', prepare: deps => { deps.runner.describe = async () => ({ status: 'blocked', reason: 'required-setting-rejected' }); } },
    { stage: 'artifact-readiness', reason: 'artifact-not-ignored', prepare: deps => { deps.artifacts.check = async () => ({ status: 'blocked', reason: 'artifact-not-ignored' }); } },
    { stage: 'resolved-inputs', reason: 'input-unsafe', prepare: deps => { deps.inputs.resolve = async () => ({ status: 'blocked', reason: 'input-unsafe' }); } },
  ];
  for (const example of cases) {
    const deps = dependencies();
    example.prepare(deps);
    const result = await previewEvalRun(command, deps);
    assert.deepEqual(result, { status: 'blocked', stage: example.stage, reason: example.reason });
  }
});

test('unexpected exceptions identify only the observed stage and unknown cause', async () => {
  const failures: readonly { stage: PreviewStage; prepare: (deps: PreviewEvalRunDependencies) => void }[] = [
    { stage: 'selection', prepare: deps => { deps.suites.load = async () => { throw new Error('SECRET_MARKER'); }; } },
    { stage: 'description', prepare: deps => { deps.runner.describe = async () => { throw new Error('SECRET_MARKER'); }; } },
    { stage: 'artifact-readiness', prepare: deps => { deps.artifacts.check = async () => { throw new Error('SECRET_MARKER'); }; } },
    { stage: 'resolved-inputs', prepare: deps => { deps.inputs.resolve = async () => { throw new Error('SECRET_MARKER'); }; } },
  ];
  for (const failure of failures) {
    const deps = dependencies();
    const events: unknown[] = [];
    failure.prepare(deps);
    assert.deepEqual(await previewEvalRun(command, { ...deps, logger: { record: (event: unknown) => { events.push(event); } } }),
      { status: 'error', stage: failure.stage, reason: 'unknown-cause' });
    assert.equal(events.length, 2);
    assert.deepEqual(events.map(event => (event as { outcome: string }).outcome), ['started', 'failed']);
    assert.equal(JSON.stringify(events).includes('SECRET_MARKER'), false);
  }
});

test('ready preview has one private terminal outcome', async () => {
  const deps = dependencies();
  const events: unknown[] = [];
  const privateSuite: NormalizedEvalSuite = {
    ...suite,
    testCases: [{ ...suite.testCases[0], turns: [{ role: 'user', content: { type: 'inline', text: 'SECRET_MARKER' } }] }],
  };
  deps.suites.load = async () => privateSuite;
  deps.inputs.resolve = async () => ({ status: 'ready', value: privateSuite.testCases });
  const result = await previewEvalRun(command, { ...deps, logger: { record: (event: unknown) => { events.push(event); } } });
  assert.equal(result.status, 'ready');
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(event => (event as { outcome: string }).outcome), ['started', 'completed']);
  assert.equal(JSON.stringify(events).includes('SECRET_MARKER'), false);
  assert.equal(JSON.stringify(events).includes('suite'), false);

  const blockedDeps = dependencies();
  const blockedEvents: unknown[] = [];
  blockedDeps.inputs.resolve = async () => ({ status: 'blocked', reason: 'input-unsafe' });
  assert.deepEqual(await previewEvalRun(command, { ...blockedDeps, logger: { record: (event: unknown) => { blockedEvents.push(event); } } }),
    { status: 'blocked', stage: 'resolved-inputs', reason: 'input-unsafe' });
  assert.deepEqual(blockedEvents.map(event => (event as { outcome: string }).outcome), ['started', 'blocked']);
});

test('log-sink failures cannot change blocked or ready outcomes', async () => {
  const deps = dependencies();
  const logger = { record: () => { throw new Error('SECRET_MARKER'); } };
  const ready = await previewEvalRun(command, { ...deps, logger });
  assert.equal(ready.status, 'ready');
  deps.artifacts.check = async () => ({ status: 'blocked', reason: 'artifact-unsafe' });
  assert.deepEqual(await previewEvalRun(command, { ...deps, logger }), { status: 'blocked', stage: 'artifact-readiness', reason: 'artifact-unsafe' });
});
