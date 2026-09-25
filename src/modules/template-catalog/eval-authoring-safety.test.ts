import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, validateEvalSuiteContract } from '../local-evals-workbench/index.js';
const { command, fixtureModules, invoke, project, suite } = await import(
  new URL('../../../src/modules/template-catalog/fixtures/eval-authoring/test-support.mjs', import.meta.url).href
) as typeof import('./fixtures/eval-authoring/test-support.mjs');

async function discover(projectRoot: string) {
  return discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot }, { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => {}, warn: () => {} } });
}

test('malformed requests, versions, missing marker and unsafe inputs fail without canary leakage', async (t) => {
  const root = await project(t);
  const request = command((await suite()).testCases);
  for (const input of ['not-json secret-canary', 'x'.repeat(70000), { ...request, protocolVersion: 99 }, { ...request, requestId: 'sk-synthetic-secret-canary\n' }, { ...request, repeats: 0 }, { ...request, testCases: [] }, { ...request, model: 'unsupported' }]) {
    const result = await invoke(root, input);
    assert.equal(result.code, 1);
    assert.equal(result.events[0]?.type, 'run-diagnostic');
    assert.doesNotMatch(result.stdout + result.stderr, /secret-canary|not-json|unsupported/);
  }
  assert.equal((await invoke(root, request, '')).code, 1);
});

test('safe evidence redacts configured keys, bounds content and fails closed on uncertain output', async () => {
  const { handleRequest, createTestPorts, safeEvidence } = await fixtureModules();
  assert.deepEqual(safeEvidence({ nested: { password: 'secret-canary', apiKey: 'secret-canary', count: 1 } }), { nested: { password: '[REDACTED]', apiKey: '[REDACTED]', count: 1 } });
  for (const value of ['sk-synthetic-secret-canary', 'x'.repeat(2049), new Date(), Number.NaN, undefined]) assert.throws(() => safeEvidence(value));
  const ports = createTestPorts({ unsafeOutput: true });
  const result = await handleRequest(command([(await suite()).testCases[0]!]), ports.ports);
  assert.equal(result.status, 'error');
  assert.doesNotMatch(JSON.stringify(result), /secret-canary/);
  assert.equal(result.events.some((event) => event.type === 'conversation-turn-completed'), false);
  assert.equal(ports.counts.production, 0);
});

test('existing public validator/discovery reject credential values and unsafe fixture content', async (t) => {
  const root = await project(t);
  const original = await suite();
  assert.equal((await discover(root)).status, 'ready');
  assert.equal(validateEvalSuiteContract({ ...original, runner: { ...original.runner, requiredEnvironment: ['MODEL_API_KEY'] } }).status, 'valid');
  assert.equal(validateEvalSuiteContract({ ...original, runner: { ...original.runner, requiredEnvironment: ['MODEL_API_KEY=secret-canary'] } }).status, 'invalid');
  await fs.writeFile(path.join(root, 'evals/private.txt'), 'OPENAI_API_KEY=sk-synthetic-secret-canary');
  await fs.writeFile(path.join(root, 'evals/suite.json'), JSON.stringify({ ...original, testCases: [{ ...original.testCases[0], reference: { type: 'file', path: 'private.txt' } }] }));
  const blocked = await discover(root);
  assert.equal(blocked.status, 'blocked');
  assert.doesNotMatch(JSON.stringify(blocked), /secret-canary/);
});

test('public containment policy rejects traversal, absolute and symlink-root escapes', async (t) => {
  const root = await project(t);
  const outside = await project(t);
  const original = await suite();
  await fs.writeFile(path.join(outside, 'canary.txt'), 'synthetic-outside-canary');
  await fs.symlink(outside, path.join(root, 'evals/escape'));
  for (const reference of ['../canary.txt', path.join(outside, 'canary.txt'), 'escape/canary.txt', 'escape/new/not-created.txt']) {
    await fs.writeFile(path.join(root, 'evals/suite.json'), JSON.stringify({ ...original, testCases: [{ ...original.testCases[0], reference: { type: 'file', path: reference } }] }));
    const result = await discover(root);
    assert.equal(result.status, 'blocked', reference);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-outside-canary/);
  }
  for (const target of ['target', 'runner'] as const) {
    await fs.symlink(path.join(outside, 'project-target.mjs'), path.join(root, `${target}-escape.mjs`));
    const changed = target === 'target' ? { ...original, target: { ...original.target, path: 'target-escape.mjs' } } : { ...original, runner: { command: ['node', 'runner-escape.mjs'], requiredEnvironment: [] } };
    await fs.writeFile(path.join(root, 'evals/suite.json'), JSON.stringify(changed));
    assert.equal((await discover(root)).status, 'blocked');
  }
});

test('documented Git checks detect ignored, later-negated and tracked artifacts without deleting files', async (t) => {
  const root = await project(t);
  const git = (...args: string[]) => spawnSync('git', args, { cwd: root, shell: false, encoding: 'utf8', timeout: 3000, maxBuffer: 65536, env: { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
  assert.equal(git('init', '--quiet').status, 0);
  await fs.writeFile(path.join(root, '.gitignore'), '# Existing rule\n*.log\n/evals/artifacts/\n');
  assert.equal(git('check-ignore', '--no-index', 'evals/artifacts/probe.json').status, 0);
  assert.equal(git('ls-files', '--', 'evals/artifacts').stdout, '');
  await fs.appendFile(path.join(root, '.gitignore'), '!/evals/artifacts/\n');
  assert.equal(git('check-ignore', '--no-index', 'evals/artifacts/probe.json').status, 1);
  await fs.mkdir(path.join(root, 'evals/artifacts'));
  const artifact = path.join(root, 'evals/artifacts/probe.json');
  await fs.writeFile(artifact, '{"synthetic":true}');
  assert.equal(git('add', '--', 'evals/artifacts/probe.json').status, 0);
  await fs.appendFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
  assert.equal(git('check-ignore', '--no-index', 'evals/artifacts/probe.json').status, 0);
  assert.match(git('ls-files', '--', 'evals/artifacts').stdout, /probe.json/);
  assert.equal(await fs.readFile(artifact, 'utf8'), '{"synthetic":true}');
  assert.match(await fs.readFile(path.join(root, '.gitignore'), 'utf8'), /^# Existing rule\n\*\.log/);
});
