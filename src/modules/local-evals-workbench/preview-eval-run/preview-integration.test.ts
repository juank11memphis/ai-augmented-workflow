import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from '../start-local-evals-workbench/local-server-starter.js';
import { previewEvalRun } from './handler.js';
import { ProjectRunnerProcessAdapter } from '../runner-process/process-adapter.js';
import { PREVIEW_PROCESS_LIMITS } from '../runner-process/limits.js';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';

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
  if(process.env.SIBU_EVAL_MODE!=='1'||request.operation!=='describe') process.exit(3);
  const data={runnerId:'offline',capabilities:['single-turn'],models:['fake/available','fake/unavailable'],judgeModels:[],requiredEnvironment:[]};
  process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,
    type:'description',runId:null,caseId:null,attempt:null,data})+'\\n');
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
      const available = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' });
      assert.equal(available.code, 200);
      assert.deepEqual(available.payload.selectedCaseIds, ['case']);
      const unavailable = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/unavailable' });
      assert.equal(unavailable.code, 200);
      assert.deepEqual(unavailable.payload.selectedCaseIds, ['case']);
      const missingCase = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'missing' }, model: 'fake/available' });
      assert.equal(missingCase.payload.status, 'blocked');
      assert.equal(missingCase.payload.stage, 'selection');
      assert.equal(missingCase.payload.reason, 'case-unavailable');
      assert.equal((missingCase.payload.issue as { category: string }).category, 'case-unavailable');
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
      assert.equal(unsafe.payload.status, 'blocked');
      assert.equal(unsafe.payload.stage, 'artifact-readiness');
      assert.equal(unsafe.payload.reason, 'artifact-not-ignored');
      assert.equal((unsafe.payload.issue as { category: string }).category, 'artifact-not-ignored');
      await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
      await mkdir(path.join(root, 'evals/artifacts'));
      await writeFile(path.join(root, 'evals/artifacts/tracked.txt'), 'tracked fixture');
      execFileSync('git', ['add', '-f', 'evals/artifacts/tracked.txt'], { cwd: root });
      const tracked = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' });
      assert.equal(tracked.payload.status, 'blocked');
      assert.equal(tracked.payload.stage, 'artifact-readiness');
      assert.equal(tracked.payload.reason, 'artifact-tracked');
      assert.equal((tracked.payload.issue as { category: string }).category, 'artifact-tracked');
    } finally { await server.stop?.(); }
  });
});

test('preview retains observed runner boundary categories without guessing a provider failure', async () => {
  await project(async (root) => {
    const selected = suite as NormalizedEvalSuite;
    const command = { suiteId: 'offline', scope: { type: 'all' } as const, model: 'fake/available' };
    const events: unknown[] = [];
    const environment = { PATH: process.env.PATH, SYNTHETIC_SECRET: 'SYNTHETIC_SECRET_MARKER' };
    const preview = async (candidate: NormalizedEvalSuite = selected, requestBytes: number = PREVIEW_PROCESS_LIMITS.requestBytes) =>
      previewEvalRun(command, {
        suites: { load: async () => candidate },
        runner: new ProjectRunnerProcessAdapter(root, { ...PREVIEW_PROCESS_LIMITS, startupMs: 500, idleMs: 500,
          overallMs: 900, requestBytes }, environment),
        artifacts: { check: async () => ({ status: 'ready', value: null }) },
        inputs: { resolve: async (cases) => ({ status: 'ready', value: cases }) },
        logger: { record: (event) => { events.push(event); } },
      });
    const expectBlocked = async (reason: string, stage: string, candidate = selected, requestBytes?: number) => {
      const result = await preview(candidate, requestBytes);
      assert.deepEqual(result, { status: 'blocked', stage, reason });
      assert.doesNotMatch(JSON.stringify({ result, events }), /SYNTHETIC_SECRET_MARKER/);
    };
    const runnerPath = path.join(root, 'evals/runner.mjs');
    await rm(runnerPath);
    await expectBlocked('runner-absent', 'description');
    await writeFile(runnerPath, "process.stdout.write('SYNTHETIC_SECRET_MARKER invalid\\n')");
    await expectBlocked('runner-protocol-invalid', 'description');
    await writeFile(runnerPath, "process.stderr.write('SYNTHETIC_SECRET_MARKER'); process.exit(2)");
    await expectBlocked('runner-exited', 'description');
    await writeFile(runnerPath, 'setTimeout(() => {}, 1000)');
    await expectBlocked('runner-timeout', 'description');
    await writeFile(runnerPath, runner);
    await expectBlocked('required-setting-rejected', 'description', {
      ...selected, runner: { ...selected.runner, requiredEnvironment: ['NODE_OPTIONS'] },
    });
    await expectBlocked('runner-request-too-large', 'description', selected, 4);
    assert.doesNotMatch(JSON.stringify(events), /provider|credential|SYNTHETIC_SECRET_MARKER/i);
  });
});

test('legacy unclassified runner result stays unclassified at the observed preview stage', async () => {
  const selected = suite as NormalizedEvalSuite;
  const result = await previewEvalRun({ suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' }, {
    suites: { load: async () => selected },
    runner: { describe: async () => ({ status: 'blocked', reason: 'input-unsafe' }) },
    artifacts: { check: async () => { throw new Error('artifacts must not run'); } },
    inputs: { resolve: async () => { throw new Error('inputs must not run'); } },
  });
  assert.deepEqual(result, { status: 'blocked', stage: 'description', reason: 'input-unsafe' });
});
