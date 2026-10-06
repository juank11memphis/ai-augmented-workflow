import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { ProjectRunnerProcessAdapter } from './process-adapter.js';
import { PREVIEW_PROCESS_LIMITS } from './limits.js';

const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [{ id: 'one', status: 'covered' }], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: ['TEST_KEY'] },
  testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'Hi' }], graders: [] }],
};
const data = { runnerId: 'fake', capabilities: ['single-turn'], models: ['fake/target'], judgeModels: [], requiredEnvironment: ['TEST_KEY'], costEstimation: true };
const event = (requestId: string, type = 'description', body: unknown = data): string =>
  JSON.stringify({ protocolVersion: 1, requestId, sequence: 0, type, runId: null, caseId: null, attempt: null, data: body }) + '\n';
async function fixture(source: string, run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-preview-runner-'));
  try {
    await mkdir(path.join(root, 'evals'));
    await writeFile(path.join(root, 'evals/runner.mjs'), source);
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
const validRunner = `let input=''; process.stdin.on('data', c => input += c); process.stdin.on('end', () => {
  const request = JSON.parse(input);
  if (process.env.SIBU_EVAL_MODE !== '1' || process.env.UNRELATED_SENTINEL) process.exit(9);
  process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,type:request.operation==='describe'?'description':'estimate',runId:null,caseId:null,attempt:null,data:request.operation==='describe'?${JSON.stringify(data)}:{targetCalls:1,judgeCalls:0,totalCalls:1,cost:{status:'available',amount:0.01,currency:'USD'}}})+'\\n');
});`;
test('describe and estimate use declared environment, cwd and protocol without model calls', async () => {
  await fixture(validRunner, async (root) => {
    const adapter = new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS, { PATH: process.env.PATH, TEST_KEY: 'secret-123', UNRELATED_SENTINEL: 'not-forwarded' });
    const description = await adapter.describe(suite);
    assert.equal(description.status, 'ready', JSON.stringify(description));
    const estimate = await adapter.estimate(suite, { model: 'fake/target', judgeModel: null, testCases: suite.testCases });
    assert.equal(estimate.status, 'ready');
    if (estimate.status === 'ready') assert.equal(estimate.value.totalCalls, 1);
  });
});
test('missing environment, invalid event, crash, timeout and oversized output block safely', async () => {
  await fixture(validRunner, async (root) => {
    const logs: unknown[] = [];
    const adapter = new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS,
      { PATH: process.env.PATH, UNRELATED: 'private-value' }, { record: (entry) => logs.push(entry) });
    const result = await adapter.describe(suite);
    assert.deepEqual(result, { status: 'blocked', reason: 'environment-missing', missingEnvironmentName: 'TEST_KEY' });
    assert.doesNotMatch(JSON.stringify({ result, logs }), /private-value|UNRELATED|sibu-preview-runner-/);
    const unsafeSuite = { ...suite, runner: { ...suite.runner, requiredEnvironment: ['TEST_KEY=private-value'] } };
    assert.deepEqual(await adapter.describe(unsafeSuite), { status: 'blocked', reason: 'required-setting-rejected' });
  });
  for (const [source, reason] of [
    [`process.stdout.write('not json\\n')`, 'runner-protocol-invalid'],
    [`process.exit(2)`, 'runner-exited'],
    [`setTimeout(()=>{}, 1000)`, 'runner-timeout'],
    [`process.stdout.write('x'.repeat(1024))`, 'runner-protocol-invalid'],
  ]) {
    await fixture(source, async (root) => {
      const limits = { ...PREVIEW_PROCESS_LIMITS, startupMs: 200, idleMs: 200, overallMs: 400, eventLineBytes: 300, stdoutBytes: 500 };
      const result = await new ProjectRunnerProcessAdapter(root, limits, { PATH: process.env.PATH, TEST_KEY: 'secret-123' }).describe(suite);
      assert.deepEqual(result, { status: 'blocked', reason });
    });
  }
});
test('secret echoed as valid model identity and changed runner symlink are rejected', async () => {
  await fixture(`let input=''; process.stdin.on('data', c=>input+=c); process.stdin.on('end', ()=>{const r=JSON.parse(input); process.stdout.write(${JSON.stringify(event('REQUEST_ID', 'description', { ...data, models: ['secret-123'] }))}.replace('REQUEST_ID',r.requestId));});`, async (root) => {
    assert.deepEqual(await new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS, { PATH: process.env.PATH, TEST_KEY: 'secret-123' }).describe(suite), { status: 'blocked', reason: 'runner-invalid' });
    await rm(path.join(root, 'evals/runner.mjs'));
    await symlink('/etc/hosts', path.join(root, 'evals/runner.mjs'));
    assert.deepEqual(await new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS, { PATH: process.env.PATH, TEST_KEY: 'secret-123' }).describe(suite), { status: 'blocked', reason: 'runner-unavailable' });
  });
});
test('envelope, cardinality and nonzero-exit violations never become ready', async () => {
  const cases: { name: string; emitted: string; exit?: number }[] = [
    { name: 'wrong version', emitted: event('REQUEST_ID').replace('"protocolVersion":1', '"protocolVersion":2') },
    { name: 'wrong request', emitted: event('another') },
    { name: 'wrong sequence', emitted: event('REQUEST_ID').replace('"sequence":0', '"sequence":1') },
    { name: 'execute event', emitted: event('REQUEST_ID').replace('"description"', '"run-started"') },
    { name: 'duplicate', emitted: event('REQUEST_ID') + event('REQUEST_ID') },
    { name: 'partial', emitted: event('REQUEST_ID').trimEnd() },
    { name: 'no event', emitted: '' },
    { name: 'nonzero after valid', emitted: event('REQUEST_ID'), exit: 4 },
  ];
  for (const item of cases) {
    await fixture(`let body='';process.stdin.on('data',c=>body+=c);process.stdin.on('end',()=>{const request=JSON.parse(body);process.stdout.write(${JSON.stringify(item.emitted)}.replaceAll('REQUEST_ID',request.requestId));process.exitCode=${item.exit ?? 0};});`, async (root) => {
      const result = await new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS, { PATH: process.env.PATH, TEST_KEY: 'secret-123' }).describe(suite);
      assert.deepEqual(result, { status: 'blocked', reason: item.exit ? 'runner-exited' : 'runner-protocol-invalid' }, item.name);
    });
  }
});
test('stderr overflow and idle timeout after partial output terminate safely', async () => {
  for (const source of [
    `process.stderr.write('secret-123'.repeat(200));setTimeout(()=>{},1000);`,
    "process.stdout.write('{');setTimeout(()=>{},1000);",
  ]) {
    await fixture(source, async (root) => {
      const limits = { ...PREVIEW_PROCESS_LIMITS, startupMs: 200, idleMs: 120, overallMs: 500, stderrBytes: 100 };
      const result = await new ProjectRunnerProcessAdapter(root, limits, { PATH: process.env.PATH, TEST_KEY: 'secret-123' }).describe(suite);
      assert.equal(result.status, 'blocked');
      assert.doesNotMatch(JSON.stringify(result), /secret-123/);
    });
  }
});
test('a validated runner rejection survives a nonzero exit without exposing runner text', async () => {
  const source = `let body=''; process.stdin.on('data', part => body += part); process.stdin.on('end', () => {
    const request = JSON.parse(body);
    process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,type:'run-diagnostic',runId:null,caseId:null,attempt:null,
      data:{code:'invalid-request',message:'private-value /private/runner'}})+'\\n');
    process.exitCode = 1;
  });`;
  await fixture(source, async (root) => {
    const logs: unknown[] = [];
    const adapter = new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS,
      { PATH: process.env.PATH, TEST_KEY: 'private-value' }, { record: entry => logs.push(entry) });
    const result = await adapter.estimate(suite, { model: 'fake/target', judgeModel: null, testCases: suite.testCases });
    assert.deepEqual(result, { status: 'blocked', reason: 'runner-request-invalid' });
    assert.match(JSON.stringify(logs), /runner-request-invalid/);
    assert.doesNotMatch(JSON.stringify({ result, logs }), /private-value|\/private\/runner/);
  });
});
test('runner stderr and paths never replace stable process-failure reasons or enter logs', async () => {
  await fixture(`process.stderr.write('private-value /private/runner'); process.exit(2);`, async (root) => {
    const logs: unknown[] = [];
    const adapter = new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS,
      { PATH: process.env.PATH, TEST_KEY: 'private-value' }, { record: (entry) => logs.push(entry) });
    const result = await adapter.describe(suite);
    assert.deepEqual(result, { status: 'blocked', reason: 'runner-exited' });
    assert.doesNotMatch(JSON.stringify({ result, logs }), /private-value|\/private\/runner|sibu-preview-runner-/);
  });
});
test('missing file, failed start, and oversized request have distinct source causes', async () => {
  await fixture(validRunner, async (root) => {
    const logs: unknown[] = [];
    const record = { record: (entry: unknown) => logs.push(entry) };
    const env = { PATH: process.env.PATH, TEST_KEY: 'SYNTHETIC_SECRET_VALUE' };
    await rm(path.join(root, 'evals/runner.mjs'));
    assert.deepEqual(await new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS, env, record).describe(suite),
      { status: 'blocked', reason: 'runner-absent' });
    await writeFile(path.join(root, 'evals/runner.mjs'), validRunner);
    const notExecutable = { ...suite, runner: { ...suite.runner, command: ['./evals/runner.mjs'] } };
    assert.deepEqual(await new ProjectRunnerProcessAdapter(root, PREVIEW_PROCESS_LIMITS,
      env, record).describe(notExecutable), { status: 'blocked', reason: 'runner-start-failed' });
    assert.deepEqual(await new ProjectRunnerProcessAdapter(root,
      { ...PREVIEW_PROCESS_LIMITS, requestBytes: 4 }, env, record).describe(suite),
    { status: 'blocked', reason: 'runner-request-too-large' });
    assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_SECRET_VALUE|sibu-preview-runner-/);
  });
});
