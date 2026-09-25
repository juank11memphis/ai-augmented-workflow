import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from '../start-local-evals-workbench/local-server-starter.js';

const suite = {
  version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic fixture',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [{
    id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Synthetic hello' } }],
    toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'hello' }], graders: [],
  }],
};
const runner = `let body=''; process.stdin.on('data',chunk=>body+=chunk); process.stdin.on('end',()=>{
  const request=JSON.parse(body);
  if(process.env.SIBU_EVAL_MODE!=='1'||request.operation==='execute') process.exit(3);
  const data=request.operation==='describe'
    ? {runnerId:'offline',capabilities:['single-turn'],models:['fake/available','fake/unavailable'],judgeModels:[],requiredEnvironment:[],costEstimation:true}
    : {targetCalls:request.repeats,judgeCalls:0,totalCalls:request.repeats,cost:request.model==='fake/available'
      ? {status:'available',amount:0.01,currency:'USD'} : {status:'unavailable',reason:'Provider pricing unavailable.'}};
  process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,
    type:request.operation==='describe'?'description':'estimate',runId:null,caseId:null,attempt:null,data})+'\\n');
});`;
async function project(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-preview-integration-'));
  try {
    await mkdir(path.join(root, 'evals')); await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/target.mjs'), 'export const target = null;\n');
    await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify(suite));
    await writeFile(path.join(root, 'evals/runner.mjs'), runner);
    await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
    execFileSync('git', ['init', '-q'], { cwd: root });
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('HTTP describe and preview use offline runner, safe Git readiness and no execution', async () => {
  await project(async (root) => {
    const discovery = await discoverConventionalEvalSuites(
      { type: 'discover-conventional-eval-suites', projectRoot: root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => undefined, warn: () => undefined } }
    );
    assert.equal(discovery.status, 'ready');
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: root, initialDiscoveryResult: discovery });
    const post = async (route: string, body: unknown) => {
      const response = await fetch(new URL(route, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { code: response.status, payload: await response.json() as Record<string, unknown> };
    };
    try {
      const described = await post('/api/eval-suites/describe', { suiteId: 'offline' });
      assert.equal(described.code, 200);
      assert.deepEqual(described.payload.models, ['fake/available', 'fake/unavailable']);
      const available = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available', repeats: 2 });
      assert.equal(available.code, 200);
      assert.equal(available.payload.totalCalls, 2);
      assert.equal((available.payload.cost as { status: string }).status, 'available');
      const unavailable = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/unavailable' });
      assert.equal(unavailable.code, 200);
      assert.equal((unavailable.payload.cost as { status: string }).status, 'unavailable');
      const invalid = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available', command: ['sh'] });
      assert.equal(invalid.code, 400);
      const malformed = await fetch(new URL('/api/eval-runs/preview', server.url), { method: 'POST', body: '{' });
      assert.equal(malformed.status, 400);
      const oversized = await fetch(new URL('/api/eval-runs/preview', server.url), { method: 'POST', body: 'x'.repeat(65_000) });
      assert.equal(oversized.status, 400);
      const wrongMethod = await fetch(new URL('/api/eval-runs/preview', server.url));
      assert.equal(wrongMethod.status, 405);
      await writeFile(path.join(root, '.gitignore'), '');
      const unsafe = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' });
      assert.deepEqual(unsafe.payload, { status: 'blocked', reason: 'artifact-not-ignored' });
      await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
      await mkdir(path.join(root, 'evals/artifacts'));
      await writeFile(path.join(root, 'evals/artifacts/tracked.txt'), 'tracked fixture');
      execFileSync('git', ['add', '-f', 'evals/artifacts/tracked.txt'], { cwd: root });
      const tracked = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' });
      assert.deepEqual(tracked.payload, { status: 'blocked', reason: 'artifact-tracked' });
    } finally { await server.stop?.(); }
  });
});
