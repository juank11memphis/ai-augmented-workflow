import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runner = `import { existsSync } from 'node:fs';
let body=''; for await(const chunk of process.stdin) body+=chunk;
const q=JSON.parse(body); let n=0;
function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,
  runId:q.operation==='execute'?q.runId:null,caseId,attempt:caseId?1:null,data})+'\\n');}
if(q.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn'],models:['fake'],judgeModels:[],requiredEnvironment:[]});
else if(q.operation==='execute') { emit('run-started',null,{model:q.model,judgeModel:null});
  for(const item of q.testCases) { emit('case-attempt-started',item.id,{});
    if(existsSync('src/interrupt-mode.txt') && item.id==='second') process.exit(7);
    emit('conversation-turn-completed',item.id,{turnIndex:0,role:'assistant',output:'fake:'+item.id});
    emit('case-attempt-completed',item.id,{status:'completed'}); }
  emit('run-completed',null,{status:'completed'}); }
else process.exit(2);
`;

function invoke(executable, npmBinPath, root, args, extraEnv = {}) {
  const result = spawnSync(executable, ['evals', ...args], {
    cwd: root, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, PATH: `${npmBinPath}${path.delimiter}${process.env.PATH ?? ''}`, ...extraEnv },
  });
  assert.ifError(result.error);
  const lines = result.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, 1, `installed evals ${args[0]} must emit one JSON document: ${result.stdout}`);
  const value = JSON.parse(lines[0]);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.operation, args[0]);
  assert.doesNotMatch(result.stdout + result.stderr, /URL: http|workbench is running|https?:\/\/127\.0\.0\.1/);
  return { value, exitCode: result.status };
}

async function createProject(root) {
  await mkdir(path.join(root, 'evals'), { recursive: true });
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
  await writeFile(path.join(root, 'src/notes.txt'), 'pre-existing edit\n');
  await writeFile(path.join(root, 'src/target.mjs'), 'export const target = true;\n');
  await writeFile(path.join(root, 'evals/runner.mjs'), runner);
  const testCases = ['first', 'second'].map(id => ({ id, name: id,
    turns: [{ role: 'user', content: { type: 'inline', text: id } }], toolMocks: [],
    assertions: [{ id: 'expected', type: 'output-contains', expected: id === 'first' ? 'different' : 'fake:second' }], graders: [],
  }));
  await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify({
    version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic fixture',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases,
  }));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(git('init', '-q').status, 0);
  assert.equal(git('add', '.').status, 0);
  assert.equal(git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture').status, 0);
  await writeFile(path.join(root, 'src/notes.txt'), 'pre-existing user edit\n');
  return { git, suitePath: path.join(root, 'evals/offline.json') };
}

function expectBlocked(executable, npmBinPath, root, name, args, reason, env) {
  const { value, exitCode } = invoke(executable, npmBinPath, root, args, env);
  assert.equal(exitCode, 1, `${name}: expected failure exit`);
  assert.equal(value.status, 'blocked', `${name}: ${JSON.stringify(value)}`);
  assert.equal(value.reason, reason, name);
  assert.equal(value.runId, undefined, name);
  console.log(`Packed headless blocked probe: ${name} (${reason})`);
}

/** Installed executable, offline project, no browser or live model. */
export async function validatePackedHeadlessEvals({ workspace, installedPackageRoot, installedExecutable, npmBinPath }) {
  const root = path.join(workspace, 'headless-evals');
  const project = await createProject(root);
  const initialStatus = project.git('status', '--porcelain').stdout;
  const run = (args, env) => invoke(installedExecutable, npmBinPath, root, args, env);

  const suites = run(['suites']);
  assert.equal(suites.exitCode, 0);
  assert.equal(suites.value.status, 'ready');
  assert.deepEqual(suites.value.suites.map(item => [item.id, item.testCases.map(test => test.id)]), [['offline', ['first', 'second']]]);
  const described = run(['describe', 'offline']);
  assert.equal(described.exitCode, 0);
  assert.deepEqual(described.value.models, ['fake']);
  const selected = run(['run', 'offline', '--case', 'first', '--model', 'fake']);
  assert.equal(selected.exitCode, 1); // Completed assertion failure is not CLI success.
  assert.equal(selected.value.status, 'completed');
  assert.equal(selected.value.outcome, 'failed');
  assert.ok(selected.value.runId);
  const selectedLocator = selected.value.cases.find(item => item.caseId === 'first')?.attempts[0];
  assert.deepEqual(selectedLocator, { number: 1, outcome: 'failed', failedAssertionIds: ['expected'], locatorStatus: 'available' });
  assert.doesNotMatch(JSON.stringify(selected.value), /fake:first|different/);
  const all = run(['run', 'offline', '--model', 'fake']);
  assert.equal(all.exitCode, 1);
  assert.equal(all.value.status, 'completed');
  assert.equal(all.value.outcome, 'failed');
  assert.ok(all.value.runId && all.value.runId !== selected.value.runId);
  const runCase = all.value.cases.find(item => item.caseId === 'first');
  const locator = runCase?.attempts[0];
  assert.deepEqual(locator, selectedLocator);
  assert.doesNotMatch(JSON.stringify(all.value), /fake:first|different/);
  const result = run(['result', 'offline', all.value.runId]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.value.status, 'ready');
  assert.deepEqual(result.value.summary.cases.map(item => item.caseId), ['first', 'second']);
  const resultLocator = result.value.summary.cases.find(item => item.caseId === runCase.caseId)?.attempts[0];
  assert.deepEqual(resultLocator, locator);
  assert.doesNotMatch(JSON.stringify(result.value), /fake:first|different/);
  assert.equal(result.value.failure, undefined);
  const failure = run(['result', 'offline', all.value.runId, '--case', runCase.caseId,
    '--assertion', locator.failedAssertionIds[0]]);
  assert.equal(failure.exitCode, 0);
  assert.equal(failure.value.failure.assertionId, 'expected');
  assert.equal(failure.value.failure.actual, 'fake:first');
  assert.ok(JSON.stringify(failure.value).length <= 4800);
  assert.equal('output' in failure.value, false);
  assert.equal('evidence' in failure.value, false);

  for (const [runValue, expectedCases] of [[selected.value, ['first']], [all.value, ['first', 'second']]]) {
    const manifest = JSON.parse(await readFile(path.join(root, 'evals/artifacts/offline', runValue.runId, 'run.json'), 'utf8'));
    assert.equal(manifest.version, 1);
    assert.equal(manifest.runId, runValue.runId);
    assert.equal(manifest.state, 'completed');
    assert.deepEqual(manifest.cases.map(item => item.caseId), expectedCases);
  }
  const installed = relative => pathToFileURL(path.join(installedPackageRoot, 'bin/modules/local-evals-workbench', relative)).href;
  const [{ discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader }, { createWorkbenchDependencies }] = await Promise.all([
    import(installed('discover-conventional-eval-suites/index.js')),
    import(installed('workbench-composition.js')),
  ]);
  const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: root },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
  assert.deepEqual(discovery.suites.map(item => item.id), suites.value.suites.map(item => item.id));
  const ui = createWorkbenchDependencies({ projectRoot: root, initialDiscoveryResult: discovery });
  const uiRead = await ui.get({ suiteId: 'offline', runId: all.value.runId });
  assert.equal(uiRead.status, 'ok');
  assert.equal(uiRead.value.summary.runId, result.value.summary.runId);
  assert.deepEqual(uiRead.value.summary.cases.map(item => item.caseId), result.value.summary.cases.map(item => item.caseId));
  console.log(`Packed headless installed binary: ${installedExecutable}; run: ${all.value.runId}; terminal manifest: completed; HTTP server: none`);

  expectBlocked(installedExecutable, npmBinPath, root, 'invalid suite ID', ['describe', '../offline'], 'invalid-suite-id');
  expectBlocked(installedExecutable, npmBinPath, root, 'invalid case ID', ['run', 'offline', '--case', 'absent', '--model', 'fake'], 'case-unavailable');
  expectBlocked(installedExecutable, npmBinPath, root, 'unavailable model', ['run', 'offline', '--model', 'absent'], 'model-unavailable');
  expectBlocked(installedExecutable, npmBinPath, root, 'unavailable judge', ['run', 'offline', '--model', 'fake', '--judge', 'absent'], 'judge-unavailable');
  const suite = JSON.parse(await readFile(project.suitePath, 'utf8'));
  suite.runner.requiredEnvironment = ['SIBU_PACKED_MISSING_CREDENTIAL'];
  await writeFile(project.suitePath, JSON.stringify(suite));
  expectBlocked(installedExecutable, npmBinPath, root, 'missing declared credential', ['run', 'offline', '--model', 'fake'], 'environment-missing', { SIBU_PACKED_MISSING_CREDENTIAL: '' });
  suite.runner.requiredEnvironment = [];
  await writeFile(project.suitePath, JSON.stringify(suite));

  const unsafeRoot = path.join(workspace, 'headless-unsafe');
  await createProject(unsafeRoot);
  await symlink(unsafeRoot, path.join(unsafeRoot, 'evals/artifacts'));
  expectBlocked(installedExecutable, npmBinPath, unsafeRoot, 'unsafe artifact symlink', ['run', 'offline', '--model', 'fake'], 'artifact-root-unsafe');
  const interruptFlag = path.join(root, 'src/interrupt-mode.txt');
  await writeFile(interruptFlag, 'interrupt second case\n');
  const interrupted = run(['run', 'offline', '--model', 'fake']);
  await unlink(interruptFlag);
  assert.equal(interrupted.exitCode, 1);
  assert.ok(['partial', 'interrupted'].includes(interrupted.value.status), JSON.stringify(interrupted.value));
  assert.ok(interrupted.value.runId);
  const interruptedManifest = JSON.parse(await readFile(path.join(root, 'evals/artifacts/offline', interrupted.value.runId, 'run.json'), 'utf8'));
  assert.equal(interruptedManifest.state, interrupted.value.status);
  console.log(`Packed headless interrupted probe: ${interrupted.value.status} (${interrupted.value.runId})`);
  assert.equal(project.git('status', '--porcelain').stdout, initialStatus, 'headless probes must preserve pre-existing project edits');
  assert.equal(await readFile(path.join(root, 'src/notes.txt'), 'utf8'), 'pre-existing user edit\n');
}
