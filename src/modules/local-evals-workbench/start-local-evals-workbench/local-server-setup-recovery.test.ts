import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

const SECRET = 'private-test-value-713';
const STDERR = 'private-runner-stderr-713';
const UNCHECKED_NAME = 'UNDECLARED_PRIVATE_NAME';
const PRIVATE_PATH = '/private/project/runner-713';
const EXCEPTION = 'private-runner-exception-713';
const MISSING_NAME = 'EWRU_TEST_MISSING_KEY';

const runner = `let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const request = JSON.parse(input);
  const mode = process.argv[2];
  if (mode === 'crash') {
    process.stderr.write(${JSON.stringify(`${STDERR} ${SECRET} ${PRIVATE_PATH} ${EXCEPTION}`)});
    process.exit(3);
  }
  if (mode === 'invalid') {
    process.stdout.write('invalid runner output\\n');
    return;
  }
  const data = {
    runnerId: 'synthetic',
    capabilities: mode === 'unsupported' ? ['single-turn'] : ['single-turn', 'multi-turn', 'rubric'],
    models: mode === 'no-models' ? [] : ['fake/target'],
    judgeModels: mode === 'no-judge' ? [] : ['fake/judge'],
    requiredEnvironment: mode === 'undeclared' ? [${JSON.stringify(UNCHECKED_NAME)}] : [],
    costEstimation: true,
  };
  const estimate = { targetCalls: 1, judgeCalls: 0, totalCalls: 1,
    cost: { status: 'unavailable', reason: 'Synthetic price unavailable.' } };
  process.stdout.write(JSON.stringify({ protocolVersion: 1, requestId: request.requestId,
    sequence: 0, type: request.operation === 'describe' ? 'description' : 'estimate',
    runId: null, caseId: null, attempt: null,
    data: request.operation === 'describe' ? data : estimate }) + '\\n');
});`;

type Scenario = {
  readonly mode: string;
  readonly requiredEnvironment?: readonly string[];
  readonly multiTurn?: boolean;
  readonly rubric?: boolean;
};

type HttpResult = { readonly code: number; readonly body: string; readonly payload: Record<string, unknown> };

async function withWorkbench(scenario: Scenario, run: (client: {
  post(route: string, body: unknown): Promise<HttpResult>;
  get(route: string): Promise<HttpResult>;
  rewriteSuite(value: unknown): Promise<void>;
}) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-setup-recovery-'));
  const suitePath = path.join(root, 'evals/suite.json');
  try {
    await mkdir(path.join(root, 'evals'));
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/target.mjs'), 'export const target = null;\n');
    await writeFile(path.join(root, 'evals/runner.mjs'), runner);
    await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
    const suite = {
      version: 2, kind: 'sibu-eval-suite', id: 'synthetic', name: 'Synthetic checks', description: 'Offline test',
      target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
      coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
      runner: { command: ['node', 'evals/runner.mjs', scenario.mode], requiredEnvironment: scenario.requiredEnvironment ?? [] },
      testCases: [{ id: 'case', name: 'Case', turns: [
        { role: 'user', content: { type: 'inline', text: 'hello' } },
        ...(scenario.multiTurn ? [{ role: 'user', content: { type: 'inline', text: 'again' } }] : []),
      ], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'hello' }],
      graders: scenario.rubric ? [{ id: 'judge', type: 'rubric', rubric: 'Good answer', threshold: 0.5 }] : [] }],
    };
    await writeFile(suitePath, JSON.stringify(suite));
    execFileSync('git', ['init', '-q'], { cwd: root });
    const discovery = await discoverConventionalEvalSuites(
      { type: 'discover-conventional-eval-suites', projectRoot: root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => undefined, warn: () => undefined } }
    );
    assert.equal(discovery.status, 'ready');
    assert.equal(discovery.definitions.length, 1);
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: root, initialDiscoveryResult: discovery });
    const request = async (route: string, body?: unknown): Promise<HttpResult> => {
      const response = await fetch(new URL(route, server.url), body === undefined ? undefined : {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      const raw = await response.text();
      return { code: response.status, body: raw, payload: JSON.parse(raw) as Record<string, unknown> };
    };
    try {
      await run({
        post: (route, body) => request(route, body),
        get: (route) => request(route),
        rewriteSuite: (value) => writeFile(suitePath, JSON.stringify(value)),
      });
    } finally {
      await server.stop?.();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function assertSafe(response: HttpResult, allowedName?: string): void {
  assert.equal(response.code, 422);
  assert.equal(response.payload.status, 'blocked');
  for (const forbidden of [SECRET, STDERR, UNCHECKED_NAME, PRIVATE_PATH, EXCEPTION, 'sibu-setup-recovery-']) {
    assert.equal(response.body.includes(forbidden), false, `HTTP JSON leaked ${forbidden}`);
  }
  assert.equal('missingEnvironmentName' in response.payload, allowedName !== undefined);
  if (allowedName) assert.equal(response.payload.missingEnvironmentName, allowedName);
}

const selection = { suiteId: 'synthetic', scope: { type: 'all' }, model: 'fake/target' };
const review = { selectedCaseIds: ['case'], targetCalls: 1, judgeCalls: 0, totalCalls: 1,
  cost: { status: 'unavailable', reason: 'Synthetic price unavailable.' } };

test('local HTTP exposes only a validated, declared missing name and blocks Preview/Start', async () => {
  await withWorkbench({ mode: 'ready', requiredEnvironment: [MISSING_NAME] }, async ({ post, get }) => {
    const description = await post('/api/eval-suites/describe', { suiteId: 'synthetic' });
    assertSafe(description, MISSING_NAME);
    assert.equal(description.payload.reason, 'environment-missing');
    const preview = await post('/api/eval-runs/preview', selection);
    assertSafe(preview);
    assert.equal(preview.payload.reason, 'environment-missing');
    const start = await post('/api/eval-runs/start', { ...selection, review });
    assertSafe(start);
    assert.equal(start.payload.reason, 'environment-missing');
    const history = await get('/api/eval-runs/history?suiteId=synthetic');
    assert.equal(history.code, 200);
    assert.equal(history.payload.status, 'ok');
    assert.equal(history.body.includes(SECRET), false);
  });
});

for (const scenario of [
  { name: 'no compatible models', setup: { mode: 'no-models' }, reason: 'model-unavailable' },
  { name: 'runner cannot start', setup: { mode: 'crash' }, reason: 'runner-unavailable' },
  { name: 'invalid runner output', setup: { mode: 'invalid' }, reason: 'runner-invalid' },
  { name: 'unsupported capability', setup: { mode: 'unsupported', multiTurn: true }, reason: 'capability-unsupported' },
  { name: 'unavailable Judge Model', setup: { mode: 'no-judge', rubric: true }, reason: 'judge-unavailable' },
  { name: 'undeclared runner environment', setup: { mode: 'undeclared' }, reason: 'environment-undeclared' },
] as const) {
  test(`local HTTP keeps ${scenario.name} distinct and safe`, async () => {
    await withWorkbench(scenario.setup, async ({ post, get }) => {
      const description = await post('/api/eval-suites/describe', { suiteId: 'synthetic' });
      assertSafe(description);
      assert.equal(description.payload.reason, scenario.reason);
      const preview = await post('/api/eval-runs/preview', selection);
      assertSafe(preview);
      assert.equal(preview.payload.reason, scenario.reason);
      const start = await post('/api/eval-runs/start', { ...selection, review });
      assertSafe(start);
      assert.equal(start.payload.reason, scenario.reason);
      const history = await get('/api/eval-runs/history?suiteId=synthetic');
      assert.equal(history.code, 200);
      assert.equal(history.payload.status, 'ok');
    });
  });
}

test('changed suite blocks stale Preview/Start without inventing a missing credential', async () => {
  await withWorkbench({ mode: 'ready' }, async ({ post, get, rewriteSuite }) => {
    const ready = await post('/api/eval-suites/describe', { suiteId: 'synthetic' });
    assert.equal(ready.code, 200);
    assert.equal(ready.payload.status, 'ready');
    const readyPreview = await post('/api/eval-runs/preview', selection);
    assert.equal(readyPreview.code, 200);
    assert.equal(readyPreview.payload.status, 'ready');
    const reviewed = {
      selectedCaseIds: readyPreview.payload.selectedCaseIds,
      targetCalls: readyPreview.payload.targetCalls,
      judgeCalls: readyPreview.payload.judgeCalls,
      totalCalls: readyPreview.payload.totalCalls,
      cost: readyPreview.payload.cost,
    };
    await rewriteSuite({ invalid: `${EXCEPTION} ${PRIVATE_PATH} ${SECRET}` });
    for (const [route, body] of [
      ['/api/eval-suites/describe', { suiteId: 'synthetic' }],
      ['/api/eval-runs/preview', selection],
      ['/api/eval-runs/start', { ...selection, review: reviewed }],
    ] as const) {
      const response = await post(route, body);
      assertSafe(response);
      assert.equal(response.payload.reason, 'suite-unavailable');
    }
    const history = await get('/api/eval-runs/history?suiteId=synthetic');
    assert.equal(history.code, 200);
    assert.equal(history.payload.status, 'ok');
  });
});
