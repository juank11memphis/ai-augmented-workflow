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
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner }), {
    status: 'blocked', reason: 'environment-undeclared', undeclaredEnvironmentName: 'KEY',
  });
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner: { describe: async () => { throw Error('secret'); } } }), { status: 'blocked', reason: 'runner-unavailable' });
});

test('Sibu-owned eval mode is compatible even when the runner lists it', async () => {
  const runner = { describe: async () => ({ status: 'ready' as const, value: { ...description, requiredEnvironment: ['SIBU_EVAL_MODE'] } }) };
  const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner });
  assert.equal(result.status, 'ready');
});

test('undeclared setting names are shared only when safe', async () => {
  for (const [name, expected] of [
    ['MODEL_API_KEY', 'MODEL_API_KEY'], ['BAD-NAME', undefined], ['KEY=secret-value', undefined], ['A'.repeat(129), undefined],
  ] as const) {
    const runner = { describe: async () => ({ status: 'ready' as const, value: { ...description, requiredEnvironment: [name] } }) };
    const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, { suites: { load: async () => suite }, runner });
    assert.deepEqual(result, { status: 'blocked', reason: 'environment-undeclared',
      ...(expected ? { undeclaredEnvironmentName: expected } : {}) });
    assert.doesNotMatch(JSON.stringify(result), /secret-value|BAD-NAME/);
  }
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
  const runnerReasons = [
    'runner-unavailable', 'runner-invalid', 'runner-timeout',
    'runner-request-too-large', 'input-unsafe',
  ] as const;
  for (const reason of runnerReasons) {
    const records: unknown[] = [];
    const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
      suites: { load: async () => suite },
      runner: { describe: async () => ({ status: 'blocked', reason, missingEnvironmentName: 'SECRET_KEY', stderr: 'secret-value', providerContent: 'secret-value' }) },
      logger: { record: (event) => { records.push(event); } },
    });
    assert.deepEqual(result, { status: 'blocked', reason });
    assert.doesNotMatch(JSON.stringify([result, records]), /SECRET_KEY|secret-value/);
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

test('rejected setting carries only a declared, bounded safe name', async () => {
  const declaredSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: ['VALID_KEY', 'NODE_OPTIONS', 'A'.repeat(129)] } };
  const records: unknown[] = [];
  const dependencies = (rejectedSettingName: unknown) => ({
    suites: { load: async () => declaredSuite },
    runner: { describe: async () => ({ status: 'blocked' as const, reason: 'required-setting-rejected' as const, rejectedSettingName: rejectedSettingName as string, stderr: 'secret-value', providerContent: 'secret-value' }) },
    logger: { record: (event: unknown) => { records.push(event); } },
  });
  assert.deepEqual(await describeEvalSuiteRuntime({ suiteId: 'suite' }, dependencies('NODE_OPTIONS')), {
    status: 'blocked', reason: 'required-setting-rejected', rejectedSettingName: 'NODE_OPTIONS',
  });
  for (const name of ['UNDECLARED_KEY', 'BAD-NAME', 'KEY=secret-value', 'A'.repeat(129), '', 123, undefined]) {
    const result = await describeEvalSuiteRuntime({ suiteId: 'suite' }, dependencies(name));
    assert.deepEqual(result, { status: 'blocked', reason: 'required-setting-rejected' });
    assert.doesNotMatch(JSON.stringify(result), /secret-value|UNDECLARED_KEY|BAD-NAME/);
  }
  assert.doesNotMatch(JSON.stringify(records), /NODE_OPTIONS|UNDECLARED_KEY|secret-value|providerContent|stderr/);
});

test('a failed log sink never changes the describe outcome', async () => {
  const logger = { record: () => { throw Error('secret-value'); } };
  const ready = await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
    suites: { load: async () => suite }, runner: { describe: async () => ({ status: 'ready', value: description }) }, logger,
  });
  assert.equal(ready.status, 'ready');
  const blocked = await describeEvalSuiteRuntime({ suiteId: 'suite' }, {
    suites: { load: async () => suite }, runner: { describe: async () => ({ status: 'blocked', reason: 'runner-request-too-large' }) }, logger,
  });
  assert.deepEqual(blocked, { status: 'blocked', reason: 'runner-request-too-large' });
});
