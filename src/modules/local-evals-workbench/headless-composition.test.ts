import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHeadlessWorkbench } from './headless-composition.js';
import { createWorkbenchDependencies } from './workbench-composition.js';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from './discover-conventional-eval-suites/index.js';
import { offlineProject } from './run-execution/offline-project-fixture.js';
import { NodeLocalWorkbenchServerStarter } from './start-local-evals-workbench/local-server-starter.js';

const all = { suiteId: 'offline', scope: { type: 'all' as const } };

async function setSavedTestedModel(project: Awaited<ReturnType<typeof offlineProject>>, model?: string): Promise<void> {
  const suitePath = path.join(project.root, 'evals/offline.json');
  const suite = JSON.parse(await readFile(suitePath, 'utf8')) as Record<string, unknown>;
  if (model) suite.defaultTestedModel = model;
  await writeFile(suitePath, JSON.stringify(suite));
}

test('headless discovery, description, awaited run and persisted result use workbench contracts without HTTP', async () => {
  const project = await offlineProject();
  const original = NodeLocalWorkbenchServerStarter.prototype.startServer;
  let serverStarts = 0;
  NodeLocalWorkbenchServerStarter.prototype.startServer = async function (...args) {
    serverStarts++;
    return original.apply(this, args);
  };
  try {
    await setSavedTestedModel(project, 'fake');
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
    const runAttempt = run.cases?.find(item => item.caseId === 'schema')?.attempts[0];
    assert.deepEqual(runAttempt?.failedAssertionIds, ['unsupported']);
    assert.equal(runAttempt?.locatorStatus, 'available');
    assert.doesNotMatch(JSON.stringify(run), /SYNTHETIC_SECRET_SENTINEL|"actual"|"output"/);
    const result = await workbench.result({ suiteId: 'offline', runId: run.runId });
    assert.equal(result.status, 'ready');
    if (result.status === 'ready') {
      assert.equal(result.summary.state, 'completed');
      assert.deepEqual(result.summary.cases.map(item => item.caseId), ['first', 'second', 'schema']);
      const resultAttempt = result.summary.cases.find(item => item.caseId === 'schema')?.attempts[0];
      assert.deepEqual(resultAttempt, runAttempt);
      assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_SECRET_SENTINEL|"actual"|"output"/);
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
    assert.ok(runAttempt?.failedAssertionIds?.[0]);
    assert.ok(runAttempt.number === 1);
    const failure = await workbench.result({ suiteId: 'offline', runId: run.runId,
      selection: { caseId: 'schema', attempt: runAttempt.number, assertionId: runAttempt.failedAssertionIds[0] } });
    assert.equal(failure.status, 'ready');
    if (failure.status === 'ready') {
      assert.equal('failure' in failure && failure.failure.assertionId, 'unsupported');
      assert.doesNotMatch(JSON.stringify(failure.summary), /SYNTHETIC_SECRET_SENTINEL|"actual"|"output"/);
    }
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
    await setSavedTestedModel(project, 'fake');
    const workbench = await createHeadlessWorkbench(project.root);
    const before = project.git('status', '--porcelain');
    assert.deepEqual(await workbench.run({ ...all, suiteId: '../offline' }), { status: 'blocked', reason: 'invalid-input' });
    assert.deepEqual(await workbench.run({ ...all, scope: { type: 'test_case', testCaseId: 'absent' } }),
      { status: 'blocked', reason: 'case-unavailable', caseId: 'absent' });
    assert.deepEqual(await workbench.run({ ...all, scope: { type: 'test_case', testCaseId: 'first' }, runOnly: { testedModel: 'unavailable' } }),
      { status: 'blocked', reason: 'run-only-model-unavailable', caseId: 'first', role: 'tested', source: 'run-only' });
    assert.equal(project.git('status', '--porcelain'), before);
    await symlink(project.root, path.join(project.root, 'evals/artifacts'));
    const unsafe = await workbench.run(all);
    assert.equal(unsafe.status, 'blocked');
    assert.match(unsafe.reason ?? '', /^artifact-/);
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});

test('headless stops old suites without a saved default', async () => {
  const project = await offlineProject();
  try {
    const suitePath = path.join(project.root, 'evals/offline.json');
    const suite = JSON.parse(await readFile(suitePath, 'utf8')) as Record<string, unknown>;
    delete suite.defaultTestedModel;
    await writeFile(suitePath, JSON.stringify(suite));
    const workbench = await createHeadlessWorkbench(project.root);
    const result = await workbench.run(all);
    assert.deepEqual(result, { status: 'blocked', reason: 'missing-suite-default', caseId: 'first', role: 'tested', source: 'suite-default' });
    assert.equal(result.runId, undefined);
  } finally { await project.cleanup(); }
});

test('headless case choice uses the shared save handler and blocked runs require explicit recovery', async () => {
  const project = await offlineProject();
  try {
    await setSavedTestedModel(project, 'fake');
    const suitePath = path.join(project.root, 'evals/offline.json');
    const workbench = await createHeadlessWorkbench(project.root);
    const described = await workbench.describe({ suiteId: 'offline', caseId: 'first' });
    assert.equal(described.status, 'ready');
    if (described.status !== 'ready') return;
    const invokeChoice = (flag: '--set' | '--reset', token: string) => {
      const args = [path.resolve('bin/sibu.js'), 'evals', 'choice', 'offline', '--case', 'first', '--role', 'tested', '--token', token,
        flag, ...(flag === '--set' ? ['fake'] : [])];
      const child = spawnSync(process.execPath, args, { cwd: project.root, encoding: 'utf8' });
      assert.equal(child.status, 0, child.stderr || child.stdout);
      return JSON.parse(child.stdout.trim()) as { status: string; caseId: string; role: string; token: string };
    };
    const set = invokeChoice('--set', described.choiceToken);
    assert.equal(set.status, 'saved');
    assert.equal(set.caseId, 'first');
    assert.equal((JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { testedModel?: string }[] }).testCases[0]?.testedModel, 'fake');
    const reset = invokeChoice('--reset', set.token);
    assert.equal(reset.status, 'saved');
    assert.equal(reset.caseId, 'first');
    assert.equal((JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { testedModel?: string }[] }).testCases[0]?.testedModel, undefined);
    const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { testedModel?: string }[] };
    suite.testCases[0]!.testedModel = 'unavailable';
    await writeFile(suitePath, JSON.stringify(suite));
    const before = await readFile(suitePath, 'utf8');
    const blocked = await workbench.run(all);
    assert.equal(blocked.status, 'blocked');
    assert.deepEqual({ reason: blocked.reason, caseId: blocked.caseId, role: blocked.role, source: blocked.source },
      { reason: 'saved-model-unavailable', caseId: 'first', role: 'tested', source: 'case-override' });
    assert.equal(blocked.runId, undefined);
    assert.equal(await readFile(suitePath, 'utf8'), before);
  } finally { await project.cleanup(); }
});

test('headless run and read return actual case labels, including old history fallback', async () => {
  const project = await offlineProject();
  try {
    await setSavedTestedModel(project, 'fake');
    const workbench = await createHeadlessWorkbench(project.root);
    const before = await readFile(path.join(project.root, 'evals/offline.json'), 'utf8');
    const preview = await workbench.describe({ suiteId: 'offline', caseId: 'first' });
    assert.equal(preview.status, 'ready');
    assert.equal(await readFile(path.join(project.root, 'evals/offline.json'), 'utf8'), before);
    const run = await workbench.run({ suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake' });
    assert.equal(run.status, 'completed');
    assert.equal(run.cases?.[0]?.testedModel, 'fake');
    assert.equal(run.cases?.[0]?.judgeModel, null);
    assert.equal(await readFile(path.join(project.root, 'evals/offline.json'), 'utf8'), before);
    assert.ok(run.runId);
    const changedSuite = JSON.parse(before) as { defaultTestedModel: string };
    changedSuite.defaultTestedModel = 'later-default';
    await writeFile(path.join(project.root, 'evals/offline.json'), JSON.stringify(changedSuite));
    const result = await workbench.result({ suiteId: 'offline', runId: run.runId });
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.deepEqual(result.summary.cases.map(item => [item.testedModel, item.judgeModel]), [['fake', null]]);
    const manifestPath = path.join(project.root, 'evals/artifacts/offline', run.runId, 'run.json');
    const old = JSON.parse(await readFile(manifestPath, 'utf8')) as { cases: { testedModel?: string; judgeModel?: string | null }[] };
    delete old.cases[0]!.testedModel; delete old.cases[0]!.judgeModel;
    await writeFile(manifestPath, JSON.stringify(old));
    const legacy = await workbench.result({ suiteId: 'offline', runId: run.runId });
    assert.equal(legacy.status, 'ready');
    if (legacy.status === 'ready') assert.deepEqual(legacy.summary.cases.map(item => [item.testedModel, item.judgeModel]), [['fake', null]]);
  } finally { await project.cleanup(); }
});

test('headless retains persisted interrupted run and pre-existing project edits', async () => {
  const project = await offlineProject();
  try {
    await setSavedTestedModel(project, 'fake');
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
    await setSavedTestedModel(project, 'fake');
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
