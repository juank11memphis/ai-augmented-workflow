import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { DiscoveredEvalSuiteRegistry, UnavailableVersion2EvalSuiteRunner } from './eval-suite-runner-adapter.js';

describe('DiscoveredEvalSuiteRegistry', () => {
  it('rejects a direct version-1 registry entry', async () => {
    const legacy = { ...definition(), version: 1, output: 'legacy predefined output' } as unknown as NormalizedEvalSuite;
    const registry = new DiscoveredEvalSuiteRegistry([legacy]);

    assert.equal(await registry.findSuite('/repo', 'suite'), null);
  });

  it('exposes only version-2 run selection metadata without contract contents', async () => {
    const registry = new DiscoveredEvalSuiteRegistry([definition()]);

    const suite = await registry.findSuite('/repo', 'suite');

    assert.deepEqual(suite, {
      version: 2,
      id: 'suite',
      name: 'Suite',
      modelOptions: [],
      testCases: [{ id: 'case', name: 'Case' }],
    });
    assert.doesNotMatch(JSON.stringify(suite), /private prompt|private-runner|private-tool|src\/target/);
  });
});

describe('UnavailableVersion2EvalSuiteRunner', () => {
  it('blocks execution until the version-2 runner slice exists', async () => {
    const outcome = await new UnavailableVersion2EvalSuiteRunner().runSuite();

    assert.equal(outcome.status, 'blocked');
    assert.match(JSON.stringify(outcome), /version-2-runner-unavailable/);
  });
});

function definition(): NormalizedEvalSuite {
  return {
    version: 2,
    kind: 'sibu-eval-suite',
    id: 'suite',
    name: 'Suite',
    description: 'Description',
    target: { id: 'target', kind: 'agent', path: 'src/target.ts' },
    coverage: { categories: [{ id: 'happy', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/private-runner.mjs'], requiredEnvironment: [] },
    testCases: [{
      id: 'case',
      name: 'Case',
      turns: [{ role: 'user', content: { type: 'inline', text: 'private prompt' } }],
      toolMocks: [{ id: 'mock', tool: 'private-tool', input: {}, outcome: { type: 'result', value: null } }],
      assertions: [{ id: 'assertion', type: 'output-contains', expected: 'safe' }],
      graders: [],
    }],
  };
}
