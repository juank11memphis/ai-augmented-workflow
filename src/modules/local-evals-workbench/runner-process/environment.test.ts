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
test('missing or injection-sensitive declarations block before spawn', () => {
  assert.deepEqual(runnerEnvironment(suite, { PATH: '/usr/bin' }), { status: 'blocked', reason: 'environment-missing' });
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'SIBU_EVAL_MODE']) {
    const input: NormalizedEvalSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: [name] } };
    assert.deepEqual(runnerEnvironment(input, { [name]: 'bad' }), { status: 'blocked', reason: 'input-unsafe' });
  }
});
