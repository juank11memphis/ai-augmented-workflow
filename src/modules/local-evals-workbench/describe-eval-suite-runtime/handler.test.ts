import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { describeEvalSuiteRuntime } from './handler.js';

const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'Hi' }], graders: [] }],
};
const description = { runnerId: 'fake', capabilities: ['single-turn'] as const, models: ['fake/target'], judgeModels: [], requiredEnvironment: [], costEstimation: false };
test('describe exposes independent compatible choices without calling execution', async () => {
  const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner: { describe: async () => ({ status: 'ready', value: description }) } });
  assert.deepEqual(result, { status: 'ready', suiteId: 'suite', models: ['fake/target'], judgeModels: [], rubricRequired: false, rubricCaseIds: [], costEstimation: false });
});
test('rubric suite requires compatible judge and capability', async () => {
  const rubric = { ...suite, testCases: [{ ...suite.testCases[0]!, graders: [{ id: 'r', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'Safe' }, threshold: 0.8 }] }] };
  const runner = { describe: async () => ({ status: 'ready' as const, value: { ...description, capabilities: ['single-turn', 'rubric'] as const } }) };
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => rubric }, runner }), { status: 'blocked', reason: 'judge-unavailable' });
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => rubric }, runner: { describe: async () => ({ status: 'ready', value: description }) } }), { status: 'blocked', reason: 'capability-unsupported' });
  const ready = await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => rubric }, runner: { describe: async () => ({ status: 'ready', value: { ...description, capabilities: ['single-turn', 'rubric'], judgeModels: ['fake/judge'] } }) } });
  assert.equal(ready.status, 'ready');
  if (ready.status === 'ready') assert.deepEqual(ready.rubricCaseIds, ['case']);
});
test('suite, environment and runner failures are focused blocks', async () => {
  const runner = { describe: async () => ({ status: 'ready' as const, value: { ...description, requiredEnvironment: ['KEY'] } }) };
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'none' }, { suites: { load: async () => undefined }, runner }), { status: 'blocked', reason: 'suite-unavailable' });
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner }), { status: 'blocked', reason: 'environment-undeclared' });
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner: { describe: async () => { throw Error('secret'); } } }), { status: 'blocked', reason: 'runner-unavailable' });
});

test('only a declared missing environment name crosses the Describe boundary', async () => {
  const declaredSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: ['VALID_KEY'] } };
  const records: unknown[] = [];
  const logger = { record: (event: unknown) => { records.push(event); } };
  const describe = (missingEnvironmentName: string) => describeEvalSuiteRuntime(
    { suiteId: 'suite' },
    { suites: { load: async () => declaredSuite }, runner: { describe: async () => ({ status: 'blocked' as const, reason: 'environment-missing' as const, missingEnvironmentName, secretValue: 'secret-value' }) }, logger }
  );
  assert.deepEqual(await describe('VALID_KEY'), { status: 'blocked', reason: 'environment-missing', missingEnvironmentName: 'VALID_KEY' });
  for (const name of ['OTHER_KEY', 'VALID_KEY=secret-value', 'INVALID-KEY', '']) {
    assert.deepEqual(await describe(name), { status: 'blocked', reason: 'environment-missing' });
  }
  assert.doesNotMatch(JSON.stringify(records), /secret-value|VALID_KEY|OTHER_KEY/);
});

test('distinct runner and compatibility blockers remain stable and do not invent a credential', async () => {
  const runnerReasons = ['runner-unavailable', 'runner-invalid', 'runner-timeout'] as const;
  for (const reason of runnerReasons) {
    const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
      suites: { load: async () => suite },
      runner: { describe: async () => ({ status: 'blocked', reason, missingEnvironmentName: 'SECRET_KEY', stderr: 'secret-value' }) },
    });
    assert.deepEqual(result, { status: 'blocked', reason });
  }
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
    suites: { load: async () => suite },
    runner: { describe: async () => ({ status: 'ready', value: { ...description, models: [] } }) },
  }), { status: 'blocked', reason: 'model-unavailable' });
  const unsupported = { ...suite, testCases: [{ ...suite.testCases[0]!, turns: [...suite.testCases[0]!.turns, ...suite.testCases[0]!.turns] }] };
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
    suites: { load: async () => unsupported },
    runner: { describe: async () => ({ status: 'ready', value: description }) },
  }), { status: 'blocked', reason: 'capability-unsupported' });
});
