import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { previewEvalRun } from './handler.js';
import type { PreviewEvalRunDependencies } from './handler.js';

const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'Hi' }], graders: [] }],
};
const description = { runnerId: 'fake', capabilities: ['single-turn'] as const, models: ['fake/target'], judgeModels: [], requiredEnvironment: [], costEstimation: false };
function dependencies(): PreviewEvalRunDependencies & { calls: { estimate: number } } {
  const calls = { estimate: 0 };
  return {
    calls, suites: { load: async () => suite }, artifacts: { check: async () => ({ status: 'ready', value: null }) },
    inputs: { resolve: async (cases) => ({ status: 'ready', value: cases }) },
    runner: {
      describe: async () => ({ status: 'ready', value: description }),
      estimate: async () => { calls.estimate++; return { status: 'ready', value: { targetCalls: 1, judgeCalls: 0, totalCalls: 1, cost: { status: 'unavailable', reason: 'Provider pricing unavailable.' } } }; },
    },
  };
}
test('preview returns reviewable unavailable cost and defaults to one repeat', async () => {
  const deps = dependencies();
  const result = await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' }, model: 'fake/target' }, deps);
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') {
    assert.equal(result.repeats, 1);
    assert.deepEqual(result.selectedCaseIds, ['case']);
    assert.deepEqual(result.cost, { status: 'unavailable', reason: 'Provider pricing unavailable.' });
    assert.equal(result.requiresConfirmation, true);
  }
  assert.equal(deps.calls.estimate, 1);
});
test('selection and readiness blocks skip estimate', async () => {
  for (const command of [
    { suiteId: 'suite', scope: { type: 'test_case' as const, testCaseId: 'missing' }, model: 'fake/target' },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'wrong' },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'fake/target', repeats: 0 },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'fake/target', repeats: 21 },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'fake/target', repeats: 1.5 },
    { suiteId: 'suite', scope: { type: 'all' as const }, model: 'fake/target', repeats: Infinity },
  ]) {
    const deps = dependencies();
    assert.equal((await previewEvalRun(command, deps)).status, 'blocked');
    assert.equal(deps.calls.estimate, 0);
  }
  const deps = dependencies();
  deps.artifacts.check = async () => ({ status: 'blocked', reason: 'artifact-unsafe' });
  assert.deepEqual(await previewEvalRun({ suiteId: 'suite', scope: { type: 'all' }, model: 'fake/target' }, deps), { status: 'blocked', reason: 'artifact-unsafe' });
  assert.equal(deps.calls.estimate, 0);
});
test('rubric suites keep Judge readiness explicit even for a deterministic case', async () => {
  const rubricSuite: NormalizedEvalSuite = { ...suite, testCases: [...suite.testCases, {
    id: 'rubric', name: 'Rubric', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }],
    toolMocks: [], assertions: [], graders: [{ id: 'tone', type: 'rubric', rubric: { type: 'inline', text: 'Kind' }, threshold: 0.8 }],
  }] };
  const deps = dependencies();
  deps.suites.load = async () => rubricSuite;
  assert.deepEqual(await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/target' }, deps),
    { status: 'blocked', reason: 'capability-unsupported' });
  assert.equal(deps.calls.estimate, 0);
  deps.runner.describe = async () => ({ status: 'ready', value: { ...description, capabilities: ['single-turn', 'rubric'], judgeModels: ['fake/judge'] } });
  assert.deepEqual(await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' }, model: 'fake/target' }, deps),
    { status: 'blocked', reason: 'judge-unavailable' });
  const ready = await previewEvalRun({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' }, model: 'fake/target', judgeModel: 'fake/judge' }, deps);
  assert.equal(ready.status, 'ready');
  if (ready.status === 'ready') assert.equal(ready.judgeModel, 'fake/judge');
});
