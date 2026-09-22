import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { InternalEvalSuiteDiscoveryResult, NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

describe('local server suite contract boundaries', () => {
  it('excludes normalized contract contents from JSON and bootstrapped browser state', async () => {
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery() });

    try {
      const [html, suites] = await Promise.all([
        fetch(server.url).then((response) => response.text()),
        fetch(`${server.url}api/eval-suites`).then((response) => response.text()),
      ]);

      for (const browserPayload of [html, suites]) {
        assert.doesNotMatch(browserPayload, /definitions|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|src\/private-agent/);
      }
      assert.match(html, /Skill authoring checks/);
      assert.equal((JSON.parse(suites) as { status: string }).status, 'ready');
    } finally {
      await server.stop?.();
    }
  });

  it('blocks direct HTTP attempts to execute a version-1 suite', async () => {
    const legacy = { ...definition(), version: 1, output: 'legacy predefined output' } as unknown as NormalizedEvalSuite;
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery([legacy]) });

    try {
      const response = await fetch(`${server.url}api/eval-runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } }),
      });
      const body = await response.text();

      assert.equal(response.status, 422);
      assert.match(body, /invalid-suite-id/);
      assert.doesNotMatch(body, /legacy predefined output/);
    } finally {
      await server.stop?.();
    }
  });
});

function discovery(definitions: readonly NormalizedEvalSuite[] = [definition()]): InternalEvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    suites: [{ id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 1, testCases: [{ id: 'names-artifact', name: 'Names artifact' }], modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] }],
    definitions,
    diagnostics: [],
  };
}

function definition(): NormalizedEvalSuite {
  return {
    version: 2, kind: 'sibu-eval-suite', id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.',
    target: { id: 'target', kind: 'agent', path: 'src/private-agent.ts' },
    coverage: { categories: [{ id: 'happy-path', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runners/private-runner.mjs'], requiredEnvironment: ['PRIVATE_RUNTIME_TOKEN'] },
    testCases: [{ id: 'names-artifact', name: 'Names artifact', turns: [{ role: 'user', content: { type: 'inline', text: 'private prompt content' } }], toolMocks: [{ id: 'mock', tool: 'private-tool', input: { account: 'internal' }, outcome: { type: 'result', value: { result: 'private result' } } }], assertions: [{ id: 'output', type: 'output-contains', expected: 'private expected output' }], graders: [] }],
  };
}
