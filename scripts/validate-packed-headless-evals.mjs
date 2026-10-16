import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runner = `import { existsSync } from 'node:fs';
let body=''; for await(const chunk of process.stdin) body+=chunk;
const q=JSON.parse(body); let n=0;
function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,
  runId:q.operation==='execute'?q.runId:null,caseId,attempt:caseId?1:null,data})+'\\n');}
if(q.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn','rubric'],models:['fake','fake/alternate'],judgeModels:[],requiredEnvironment:[]});
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
  const suite = {
    version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic fixture',
    defaultTestedModel: 'fake',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases,
  };
  await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify(suite));
  await writeFile(path.join(root, 'evals/legacy.json'), JSON.stringify({ ...suite, id: 'legacy', defaultTestedModel: undefined }));
  await writeFile(path.join(root, 'evals/overridden.json'), JSON.stringify({ ...suite, id: 'overridden',
    testCases: [testCases[0], { ...testCases[1], testedModel: 'fake/alternate',
      assertions: [{ id: 'expected', type: 'output-contains', expected: 'fake/alternate:second' }] }],
  }));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(git('init', '-q').status, 0);
  assert.equal(git('add', '.').status, 0);
  assert.equal(git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture').status, 0);
  await writeFile(path.join(root, 'src/notes.txt'), 'pre-existing user edit\n');
  return { git, suitePath: path.join(root, 'evals/offline.json') };
}

async function artifactIds(root) {
  try { return await readdir(path.join(root, 'evals/artifacts/offline')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function expectBlocked(executable, npmBinPath, root, name, args, reason, env, details = {}) {
  const suitePath = path.join(root, 'evals/offline.json');
  const suiteBefore = await readFile(suitePath, 'utf8');
  const artifactsBefore = await artifactIds(root);
  const { value, exitCode } = invoke(executable, npmBinPath, root, args, env);
  assert.equal(exitCode, 1, `${name}: expected failure exit`);
  assert.equal(value.status, 'blocked', `${name}: ${JSON.stringify(value)}`);
  assert.equal(value.reason, reason, name);
  assert.equal(value.runId, undefined, name);
  for (const [key, expected] of Object.entries(details)) assert.equal(value[key], expected, `${name}: ${key}`);
  assert.equal(await readFile(suitePath, 'utf8'), suiteBefore, `${name}: suite changed`);
  assert.deepEqual(await artifactIds(root), artifactsBefore, `${name}: run artifact allocated`);
  console.log(`Packed headless blocked probe: ${name} (${reason})`);
}

/** Installed executable, offline project, no browser or live model. */
export async function validatePackedHeadlessEvals({ workspace, installedPackageRoot, installedExecutable, npmBinPath }) {
  const root = path.join(workspace, 'headless-evals');
  const project = await createProject(root);
  const readySuiteBytes = await readFile(project.suitePath, 'utf8');
  const initialStatus = project.git('status', '--porcelain').stdout;
  const run = (args, env) => invoke(installedExecutable, npmBinPath, root, args, env);

  const suites = run(['suites']);
  assert.equal(suites.exitCode, 0);
  assert.equal(suites.value.status, 'ready');
  assert.deepEqual(suites.value.suites.map(item => [item.id, item.testCases.map(test => test.id)]), [
    ['legacy', ['first', 'second']], ['offline', ['first', 'second']], ['overridden', ['first', 'second']],
  ]);
  const described = run(['describe', 'offline']);
  assert.equal(described.exitCode, 0);
  assert.deepEqual(described.value.models, ['fake', 'fake/alternate']);
  const legacyPath = path.join(root, 'evals/legacy.json');
  const legacyBytes = await readFile(legacyPath, 'utf8');
  const legacyBlocked = run(['run', 'legacy']);
  assert.equal(legacyBlocked.exitCode, 1);
  assert.equal(legacyBlocked.value.reason, 'missing-suite-default');
  assert.equal(legacyBlocked.value.runId, undefined);
  const legacyDescribe = run(['describe', 'legacy']);
  const legacySave = run(['choice', 'legacy', '--role', 'tested', '--token', legacyDescribe.value.choiceToken, '--set', 'fake']);
  assert.equal(legacySave.exitCode, 0);
  assert.equal(run(['run', 'legacy']).value.status, 'completed');
  await writeFile(legacyPath, legacyBytes);

  const overridePath = path.join(root, 'evals/overridden.json');
  const overrideBytes = await readFile(overridePath, 'utf8');
  const mixed = run(['run', 'overridden']);
  assert.equal(mixed.value.status, 'completed');
  assert.deepEqual(mixed.value.cases.map(item => [item.caseId, item.testedModel]), [
    ['first', 'fake'], ['second', 'fake/alternate'],
  ]);
  const mixedResult = run(['result', 'overridden', mixed.value.runId]);
  assert.deepEqual(mixedResult.value.summary.cases.map(item => [item.caseId, item.testedModel]), [
    ['first', 'fake'], ['second', 'fake/alternate'],
  ]);
  const unavailable = JSON.parse(overrideBytes);
  unavailable.testCases[1].testedModel = 'unavailable/model';
  await writeFile(overridePath, JSON.stringify(unavailable));
  const overrideBlocked = run(['run', 'overridden']);
  assert.equal(overrideBlocked.exitCode, 1);
  assert.equal(overrideBlocked.value.reason, 'saved-model-unavailable');
  assert.equal(overrideBlocked.value.source, 'case-override');
  assert.equal(overrideBlocked.value.caseId, 'second');
  assert.equal(overrideBlocked.value.runId, undefined);
  assert.match(overrideBlocked.value.nextAction, /Replace.*Inherit/);
  const overrideDescribe = run(['describe', 'overridden', '--case', 'second']);
  const inherited = run(['choice', 'overridden', '--case', 'second', '--role', 'tested',
    '--token', overrideDescribe.value.choiceToken, '--reset']);
  assert.equal(inherited.exitCode, 0);
  const recovered = run(['run', 'overridden']);
  assert.equal(recovered.value.status, 'completed');
  assert.deepEqual(recovered.value.cases.map(item => item.testedModel), ['fake', 'fake']);
  await writeFile(overridePath, overrideBytes);
  const selected = run(['run', 'offline', '--case', 'first', '--model', 'fake']);
  assert.equal(selected.exitCode, 1); // Completed assertion failure is not CLI success.
  assert.equal(selected.value.status, 'completed');
  assert.equal(selected.value.outcome, 'failed');
  assert.ok(selected.value.runId);
  const selectedLocator = selected.value.cases.find(item => item.caseId === 'first')?.attempts[0];
  assert.deepEqual(selectedLocator, { number: 1, outcome: 'failed', failedAssertionIds: ['expected'], locatorStatus: 'available' });
  assert.doesNotMatch(JSON.stringify(selected.value), /fake:first|different/);
  assert.equal(await readFile(project.suitePath, 'utf8'), readySuiteBytes, 'selected run must not save temporary choice');
  const all = run(['run', 'offline']);
  assert.equal(all.exitCode, 1);
  assert.equal(all.value.status, 'completed');
  assert.equal(all.value.outcome, 'failed');
  assert.ok(all.value.runId && all.value.runId !== selected.value.runId);
  assert.equal(await readFile(project.suitePath, 'utf8'), readySuiteBytes, 'full-suite run must not edit saved choice');
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

  await expectBlocked(installedExecutable, npmBinPath, root, 'invalid suite ID', ['describe', '../offline'], 'invalid-suite-id');
  await expectBlocked(installedExecutable, npmBinPath, root, 'invalid case ID', ['run', 'offline', '--case', 'absent'], 'case-unavailable');
  await expectBlocked(installedExecutable, npmBinPath, root, 'full-suite temporary choice', ['run', 'offline', '--model', 'fake'], 'run-only-scope-unsupported');
  await expectBlocked(installedExecutable, npmBinPath, root, 'unavailable temporary tested model',
    ['run', 'offline', '--case', 'first', '--model', 'absent'], 'run-only-model-unavailable', undefined,
    { caseId: 'first', role: 'tested' });
  const suite = JSON.parse(readySuiteBytes);
  suite.defaultTestedModel = 'not-advertised';
  await writeFile(project.suitePath, JSON.stringify(suite));
  await expectBlocked(installedExecutable, npmBinPath, root, 'unavailable saved tested model',
    ['run', 'offline', '--case', 'first'], 'saved-model-unavailable', undefined, { caseId: 'first', role: 'tested' });
  await writeFile(project.suitePath, readySuiteBytes);
  const rubricSuite = JSON.parse(readySuiteBytes);
  rubricSuite.defaultJudgeModel = 'not-advertised-judge';
  rubricSuite.testCases[1].graders = [{ id: 'quality', type: 'rubric',
    rubric: { type: 'inline', text: 'Useful answer' }, threshold: 0.8 }];
  await writeFile(project.suitePath, JSON.stringify(rubricSuite));
  await expectBlocked(installedExecutable, npmBinPath, root, 'unavailable saved Judge model',
    ['run', 'offline', '--case', 'second'], 'saved-model-unavailable', undefined, { caseId: 'second', role: 'judge' });
  await writeFile(project.suitePath, readySuiteBytes);
  suite.runner.requiredEnvironment = ['SIBU_PACKED_MISSING_CREDENTIAL'];
  await writeFile(project.suitePath, JSON.stringify(suite));
  await expectBlocked(installedExecutable, npmBinPath, root, 'missing declared credential',
    ['run', 'offline'], 'environment-missing', { SIBU_PACKED_MISSING_CREDENTIAL: '' });
  await writeFile(project.suitePath, readySuiteBytes);

  const unsafeRoot = path.join(workspace, 'headless-unsafe');
  await createProject(unsafeRoot);
  await symlink(unsafeRoot, path.join(unsafeRoot, 'evals/artifacts'));
  await expectBlocked(installedExecutable, npmBinPath, unsafeRoot, 'unsafe artifact symlink', ['run', 'offline'], 'artifact-root-unsafe');
  const interruptFlag = path.join(root, 'src/interrupt-mode.txt');
  await writeFile(interruptFlag, 'interrupt second case\n');
  const interrupted = run(['run', 'offline']);
  await unlink(interruptFlag);
  assert.equal(interrupted.exitCode, 1);
  assert.ok(['partial', 'interrupted'].includes(interrupted.value.status), JSON.stringify(interrupted.value));
  assert.ok(interrupted.value.runId);
  const interruptedManifest = JSON.parse(await readFile(path.join(root, 'evals/artifacts/offline', interrupted.value.runId, 'run.json'), 'utf8'));
  assert.equal(interruptedManifest.state, interrupted.value.status);
  assert.equal(await readFile(project.suitePath, 'utf8'), readySuiteBytes, 'interrupted run must not edit suite');
  console.log(`Packed headless interrupted probe: ${interrupted.value.status} (${interrupted.value.runId})`);
  assert.equal(project.git('status', '--porcelain').stdout, initialStatus, 'headless probes must preserve pre-existing project edits');
  assert.equal(await readFile(path.join(root, 'src/notes.txt'), 'utf8'), 'pre-existing user edit\n');
}
