import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHeadlessWorkbench } from './headless-composition.js';
import { createWorkbenchDependencies } from './workbench-composition.js';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from './discover-conventional-eval-suites/index.js';
import { offlineProject } from './run-execution/offline-project-fixture.js';
import { NodeLocalWorkbenchServerStarter } from './start-local-evals-workbench/local-server-starter.js';

const all = { suiteId: 'offline', scope: { type: 'all' as const }, model: 'fake' };

test('headless discovery, description, awaited run and persisted result use workbench contracts without HTTP', async () => {
  const project = await offlineProject();
  const original = NodeLocalWorkbenchServerStarter.prototype.startServer;
  let serverStarts = 0;
  NodeLocalWorkbenchServerStarter.prototype.startServer = async function (...args) {
    serverStarts++;
    return original.apply(this, args);
  };
  try {
    const before = project.git('status', '--porcelain');
    const workbench = await createHeadlessWorkbench(project.root);
    const discovered = workbench.discover();
    assert.equal(discovered.status, 'ready');
    assert.deepEqual(discovered.suites.map(suite => [suite.id, suite.testCases.map(item => item.id)]),
      [['offline', ['first', 'second', 'schema']]]);
    const described = await workbench.describe({ suiteId: 'offline' });
    assert.equal(described.status, 'ready');
    if (described.status === 'ready') assert.deepEqual(described.models, ['fake']);
    const run = await workbench.run(all);
    assert.equal(run.status, 'completed', JSON.stringify(run));
    assert.equal(run.outcome, 'failed');
    assert.ok(run.runId);
    const result = await workbench.result({ suiteId: 'offline', runId: run.runId });
    assert.equal(result.status, 'ready');
    if (result.status === 'ready') {
      assert.equal(result.summary.state, 'completed');
      assert.deepEqual(result.summary.cases.map(item => item.caseId), ['first', 'second', 'schema']);
      const manifest = JSON.parse(await readFile(path.join(project.root, 'evals/artifacts/offline', run.runId, 'run.json'), 'utf8')) as {
        version: number; suiteId: string; runId: string; state: string; cases: { caseId: string }[];
      };
      assert.equal(manifest.version, 1);
      assert.equal(manifest.suiteId, result.summary.suiteId);
      assert.equal(manifest.runId, result.summary.runId);
      assert.equal(manifest.state, result.summary.state);
      assert.deepEqual(manifest.cases.map(item => item.caseId), result.summary.cases.map(item => item.caseId));
      const uiDiscovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: project.root },
        { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
      const ui = createWorkbenchDependencies({ projectRoot: project.root, initialDiscoveryResult: uiDiscovery });
      const uiRead = await ui.get!({ suiteId: 'offline', runId: run.runId });
      assert.equal(uiRead.status, 'ok');
      if (uiRead.status === 'ok') assert.deepEqual(uiRead.value.summary, manifest);
    }
    const failure = await workbench.result({ suiteId: 'offline', runId: run.runId,
      selection: { caseId: 'schema', attempt: 1, assertionId: 'unsupported' } });
    assert.equal(failure.status, 'ready');
    if (failure.status === 'ready') assert.equal('failure' in failure && failure.failure.assertionId, 'unsupported');
    assert.equal(serverStarts, 0);
    assert.equal(project.git('status', '--porcelain'), before);
  } finally {
    NodeLocalWorkbenchServerStarter.prototype.startServer = original;
    await project.cleanup();
  }
});

test('headless blocks invalid suite/case/model/judge and unsafe artifact root without project edits', async () => {
  const project = await offlineProject();
  try {
    const workbench = await createHeadlessWorkbench(project.root);
    const before = project.git('status', '--porcelain');
    assert.deepEqual(await workbench.run({ ...all, suiteId: '../offline' }), { status: 'blocked', reason: 'invalid-input' });
    assert.deepEqual(await workbench.run({ ...all, scope: { type: 'test_case', testCaseId: 'absent' } }), { status: 'blocked', reason: 'case-unavailable' });
    assert.deepEqual(await workbench.run({ ...all, model: 'unavailable' }), { status: 'blocked', reason: 'model-unavailable' });
    assert.deepEqual(await workbench.run({ ...all, judgeModel: 'unavailable' }), { status: 'blocked', reason: 'judge-unavailable' });
    assert.equal(project.git('status', '--porcelain'), before);
    await symlink(project.root, path.join(project.root, 'evals/artifacts'));
    const unsafe = await workbench.run(all);
    assert.equal(unsafe.status, 'blocked');
    assert.match(unsafe.reason ?? '', /^artifact-/);
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});

test('headless retains persisted interrupted run and pre-existing project edits', async () => {
  const project = await offlineProject();
  try {
    const notes = path.join(project.root, 'src/notes.txt');
    await writeFile(notes, 'committed baseline\n');
    project.git('add', 'src/notes.txt');
    project.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture baseline');
    await writeFile(notes, 'pre-existing edit\n');
    await project.crashOnSecond();
    const workbench = await createHeadlessWorkbench(project.root);
    const running = workbench.run(all);
    await writeFile(notes, 'concurrent edit\n');
    const before = project.git('status', '--porcelain');
    const run = await running;
    assert.ok(run.runId);
    assert.ok(['partial', 'interrupted'].includes(run.status), JSON.stringify(run));
    assert.equal(run.reason, 'runner-exited');
    const result = await workbench.result({ suiteId: 'offline', runId: run.runId });
    assert.equal(result.status, 'ready');
    if (result.status === 'ready') assert.equal(result.summary.state, run.status);
    assert.equal(await readFile(notes, 'utf8'), 'concurrent edit\n');
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});

test('headless reports unavailable required credentials before creating a run', async () => {
  const project = await offlineProject();
  try {
    const suitePath = path.join(project.root, 'evals/offline.json');
    const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { runner: { requiredEnvironment: string[] } };
    suite.runner.requiredEnvironment = ['SIBU_OFFLINE_TEST_MISSING_CREDENTIAL'];
    await writeFile(suitePath, JSON.stringify(suite));
    const before = project.git('status', '--porcelain');
    const workbench = await createHeadlessWorkbench(project.root);
    const result = await workbench.run(all);
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'environment-missing');
    assert.equal(result.runId, undefined);
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});
