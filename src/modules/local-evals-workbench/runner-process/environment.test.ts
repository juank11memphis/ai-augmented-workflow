import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { runnerEnvironment } from './environment.js';
const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: ['TEST_KEY'] },
  testCases: [],
};
test('forwards declared names plus minimal base and eval marker only', () => {
  const result = runnerEnvironment(suite, { PATH: '/usr/bin', HOME: '/tmp', TEST_KEY: 'secret-123', UNRELATED: 'not-forwarded', NODE_OPTIONS: '--require attacker' });
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') assert.deepEqual(result.value.values, { SIBU_EVAL_MODE: '1', PATH: '/usr/bin', HOME: '/tmp', TEST_KEY: 'secret-123' });
});
test('missing declared name is reported without its value or other environment data', () => {
  const result = runnerEnvironment(suite, { PATH: '/private/runner', UNRELATED: 'secret-value' });
  assert.deepEqual(result, { status: 'blocked', reason: 'environment-missing', missingEnvironmentName: 'TEST_KEY' });
  assert.doesNotMatch(JSON.stringify(result), /private|secret-value|UNRELATED/);
});
test('Sibu supplies its eval marker even when a suite redundantly declares it', () => {
  const input: NormalizedEvalSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: ['SIBU_EVAL_MODE'] } };
  const result = runnerEnvironment(input, { SIBU_EVAL_MODE: 'untrusted' });
  assert.deepEqual(result, { status: 'ready', value: { values: { SIBU_EVAL_MODE: '1' }, secrets: [] } });
});
test('protected safe names are reported, but unchecked names and values are not', () => {
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'TEST_KEY=secret-value', 'lowercase']) {
    const input: NormalizedEvalSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: [name] } };
    const result = runnerEnvironment(input, { [name]: 'SYNTHETIC_SECRET_VALUE' });
    assert.deepEqual(result, { status: 'blocked', reason: 'required-setting-rejected',
      ...(/^[A-Z_][A-Z0-9_]*$/.test(name) ? { rejectedSettingName: name } : {}) });
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_SECRET_VALUE|secret-value|lowercase/);
  }
});
