import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, type InternalEvalSuiteDiscoveryResult, type NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

describe('local server suite contract boundaries', () => {
  it('excludes normalized contract contents from JSON and bootstrapped browser state', async () => {
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: '/repo', initialDiscoveryResult: discovery() });

    try {
      const [html, suites] = await Promise.all([
        fetch(server.url).then((response) => response.text()),
        fetch(`${server.url}api/eval-suites`).then((response) => response.text()),
      ]);

      const browserState = html.match(/<script type="application\/json" id="sibu-workspace-state">([^<]*)<\/script>/)?.[1];
      assert.ok(browserState, 'Expected bootstrapped browser state');
      for (const browserPayload of [browserState, suites]) {
        assert.equal(/definitions|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|src\/private-agent/.test(browserPayload), false,
          'Public suite payload must exclude normalized contract contents');
      }
      assert.equal(/PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|src\/private-agent/.test(html), false,
        'Rendered HTML must exclude private suite contents');
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

  it('keeps empty and unreadable disposable suites distinct across discovery, HTTP, and HTML without writing artifacts', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-entry-contract-'));
    const evals = path.join(root, 'evals');
    try {
      await mkdir(evals);
      for (const [fixture, reason, title] of [
        [null, 'no-eval-suites', 'No eval suites found'],
        ['broken.json', 'unreadable-eval-suites', "Sibu couldn't read the eval suites"],
      ] as const) {
        if (fixture) await writeFile(path.join(evals, fixture), '{"token":"sk-synthetic-secret-marker"');
        const before = await readdir(evals);
        const result = await discoverConventionalEvalSuites(
          { type: 'discover-conventional-eval-suites', projectRoot: root },
          { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => undefined, warn: () => undefined } },
        );
        assert.equal(result.status, 'blocked');
        if (result.status !== 'blocked') assert.fail('Expected blocked discovery');
        assert.equal(result.reason, reason);
        const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: root, initialDiscoveryResult: result });
        try {
          const [html, response] = await Promise.all([fetch(server.url).then(item => item.text()), fetch(`${server.url}api/eval-suites`)]);
          const body = await response.text();
          const payload = JSON.parse(body) as { reason: string; suites: unknown[]; issue: { category: string; reference: string } };
          assert.equal(response.status, 200);
          assert.equal(payload.reason, reason);
          assert.equal(payload.issue.category, reason);
          assert.match(payload.issue.reference, /^[a-f0-9-]{36}$/);
          assert.deepEqual(payload.suites, []);
          assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          assert.match(html, /data-discovery-notice/);
          assert.match(html, /data-results-container/);
          assert.match(html, /data-run-setup hidden/);
          const publicOutput = html + body + JSON.stringify([...response.headers]);
          assert.equal(/sk-synthetic-secret-marker|sibu-entry-contract-/.test(publicOutput), false, 'Public output must not contain suite contents or the absolute fixture root');
          assert.equal(html.includes('broken.json'), false, 'Browser markup must not include the suite filename');
          assert.deepEqual(await readdir(evals), before);
        } finally {
          await server.stop?.();
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
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
