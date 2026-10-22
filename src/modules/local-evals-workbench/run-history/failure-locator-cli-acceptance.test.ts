import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { ExecuteEventValidator } from '../runner-process/execute-events.js';
import { sourceEvidenceProject } from '../run-execution/source-evidence-project-fixture.js';
import { project as artifactProject } from './test-project.js';
import { fixture as artifactFixture } from './store-fixture.js';
import { config, evidence } from './test-fixtures.js';

const cli = path.resolve('bin/sibu.js');
const sentinel = 'RAW-é-';

function invoke(root: string, operation: 'run' | 'result', ...args: string[]) {
  const processResult = spawnSync(process.execPath, [cli, 'evals', operation, 'offline', ...args],
    { cwd: root, encoding: 'utf8', timeout: 30_000 });
  assert.ifError(processResult.error);
  assert.equal(processResult.stdout.trim().split('\n').length, 1, processResult.stderr);
  return { json: JSON.parse(processResult.stdout) as Record<string, unknown>, stderr: processResult.stderr };
}

function selected(root: string, runId: string, caseId: string, assertionId: string, ...more: string[]) {
  return invoke(root, 'result', runId, '--case', caseId, '--attempt', '1', '--assertion', assertionId, ...more);
}

async function configureFixture(root: string): Promise<void> {
  const suitePath = path.join(root, 'evals/offline.json');
  const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { id: string; testedModel?: string;
    assertions: object[] }[] };
  for (const item of suite.testCases) item.testedModel = `fake-${item.id}`;
  const multi = suite.testCases.find(item => item.id === 'multi');
  assert.ok(multi);
  multi.assertions.push(...Array.from({ length: 34 }, (_, index) => ({ id: `extra-${String(index).padStart(2, '0')}`,
    type: 'output-equals', expected: { type: 'inline', text: 'EXPECTED' } })));
  await writeFile(suitePath, JSON.stringify(suite));
  const runnerPath = path.join(root, 'evals/runner.mjs');
  const runner = await readFile(runnerPath, 'utf8');
  assert.match(runner, /models:\['fake'\]/);
  await writeFile(runnerPath, runner.replace("models:['fake']", "models:['fake','fake-multi','fake-rubric','fake-malformed','fake-redacted']")
    .replaceAll("modelId:'fake'", 'modelId:request.model'));
}

async function artifactNames(root: string): Promise<string[]> {
  try { return await readdir(path.join(root, 'evals/artifacts'), { recursive: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

async function assertFirstCaseFixtureProtocol(root: string): Promise<void> {
  const suite = JSON.parse(await readFile(path.join(root, 'evals/offline.json'), 'utf8')) as NormalizedEvalSuite;
  const first = suite.testCases[0]!;
  const model = first.testedModel ?? suite.defaultTestedModel!;
  const requestId = 'fixture-request';
  const runId = 'fixture-run';
  const request = { protocolVersion: 1, requestId, operation: 'execute', runId, model, judgeModel: null, testCases: [first] };
  const emitted = spawnSync(process.execPath, ['evals/runner.mjs'], { cwd: root, input: JSON.stringify(request) + '\n',
    encoding: 'utf8', timeout: 20_000 });
  assert.ifError(emitted.error);
  assert.equal(emitted.status, 0, 'fixture runner exited before protocol replay');
  const validator = new ExecuteEventValidator(requestId, { runId, model, judgeModel: null, suite, cases: [first] });
  for (const line of emitted.stdout.trim().split('\n')) {
    const event = JSON.parse(line) as { type: string; caseId: string | null; attempt: number | null; sequence: number };
    try { validator.accept(event); }
    catch (error) {
      assert.fail(`fixture protocol rejected ${event.type} case=${event.caseId ?? 'none'} ` +
        `attempt=${event.attempt ?? 'none'} sequence=${event.sequence}: ${(error as Error).message}`);
    }
  }
  assert.equal(validator.completion, 'completed');
}

test('compiled CLI run locators traverse ordered pages and select exact multi-case model, judge, and source evidence', async () => {
  const project = await sourceEvidenceProject(['multi', 'rubric', 'redacted']);
  try {
    await configureFixture(project.root);
    await assertFirstCaseFixtureProtocol(project.root);
    const before = project.git('status', '--porcelain');
    const run = invoke(project.root, 'run');
    assert.equal(run.json.status, 'completed', JSON.stringify(run.json));
    const runId = run.json.runId as string;
    assert.ok(runId);
    const runCases = run.json.cases as { caseId: string; attempts: { failedAssertionIds?: string[] }[] }[];
    assert.equal(run.json.nextLocatorOffset, 32);
    assert.deepEqual(runCases[0]?.attempts[0]?.failedAssertionIds?.[0], 'exact');
    assert.doesNotMatch(JSON.stringify(run.json) + run.stderr, /RAW-é-|judge-é-☃|DELIVERED/);
    const expected = ['exact', ...Array.from({ length: 34 }, (_, index) => `extra-${String(index).padStart(2, '0')}`),
      'rubric/exact', 'rubric/quality', 'redacted/exact'];
    const locators: string[] = [];
    let offset: number | undefined;
    const pages: number[] = [];
    do {
      const page = offset === undefined ? invoke(project.root, 'result', runId) :
        invoke(project.root, 'result', runId, '--locator-offset', String(offset));
      assert.equal(page.json.status, 'ready', JSON.stringify(page.json));
      assert.doesNotMatch(JSON.stringify(page.json) + page.stderr, /RAW-é-|judge-é-☃|DELIVERED/);
      const summary = page.json.summary as { nextLocatorOffset?: number; cases: { caseId: string; testedModel: string;
        attempts: { failedAssertionIds?: string[]; locatorStatus?: string }[] }[] };
      for (const item of summary.cases) {
        assert.equal(item.testedModel, `fake-${item.caseId}`);
        for (const attempt of item.attempts) for (const id of attempt.failedAssertionIds ?? []) {
          locators.push(item.caseId === 'multi' ? id : `${item.caseId}/${id}`);
        }
      }
      offset = summary.nextLocatorOffset;
      if (offset !== undefined) pages.push(offset);
    } while (offset !== undefined);
    assert.deepEqual(pages, [32], JSON.stringify(run.json));
    assert.deepEqual(locators, expected);
    const late = selected(project.root, runId, 'multi', 'extra-33').json.failure as { assertionId: string; caseId: string };
    assert.deepEqual([late.caseId, late.assertionId], ['multi', 'extra-33']);

    const failure = selected(project.root, runId, 'multi', 'exact').json;
    assert.equal(failure.status, 'ready', JSON.stringify(failure));
    const detail = failure.failure as { caseId: string; attempt: number; assertionId: string;
      grading: { kind: string }; source: { sequence: { kind: string }[];
        modelCalls: { modelId: string; rawText: { locator: string; byteLength: number; truncated: boolean } }[];
        toolEvents: { outcome: string }[] } };
    assert.deepEqual([detail.caseId, detail.attempt, detail.assertionId], ['multi', 1, 'exact']);
    assert.equal(detail.grading.kind, 'deterministic');
    assert.deepEqual(detail.source.sequence.map(item => item.kind), ['model-call', 'tool-delivery', 'model-call']);
    assert.equal(detail.source.toolEvents[0]?.outcome, 'result');
    assert.equal(detail.source.modelCalls[0]?.modelId, 'fake-multi');
    const field = detail.source.modelCalls[0]!.rawText;
    assert.equal(field.truncated, true);
    assert.equal(field.locator, 'call-1~rawText');
    const chunks: Buffer[] = [];
    let byteOffset = 0;
    while (true) {
      const response = selected(project.root, runId, 'multi', 'exact', '--field', field.locator, '--offset', String(byteOffset));
      assert.equal(response.json.status, 'ready', JSON.stringify(response.json));
      const range = response.json.field as { locator: string; offset: number; byteLength: number;
        bytesBase64: string; nextOffset: number | null };
      assert.deepEqual([range.locator, range.offset, range.byteLength], [field.locator, byteOffset, field.byteLength]);
      chunks.push(Buffer.from(range.bytesBase64, 'base64'));
      if (range.nextOffset === null) break;
      assert.ok(range.nextOffset > byteOffset);
      byteOffset = range.nextOffset;
    }
    assert.equal(Buffer.concat(chunks).toString('utf8'), sentinel + 'x'.repeat(1200));
    assert.equal(chunks.length, 2);

    const rubric = selected(project.root, runId, 'rubric', 'quality').json.failure as { grading: {
      kind: string; score: number; threshold: number; comparison: string; judgeModel: string;
      judge: { request: { locator: string; truncated: boolean } } } };
    assert.deepEqual([rubric.grading.kind, rubric.grading.score, rubric.grading.threshold,
      rubric.grading.comparison, rubric.grading.judgeModel], ['rubric', 0.4, 0.8, 'failed', 'fake-judge']);
    assert.equal(rubric.grading.judge.request.truncated, true);
    const redacted = selected(project.root, runId, 'redacted', 'exact').json.failure as {
      source: { modelCalls: { rawText: { status: string; reason: string } }[] } };
    assert.deepEqual(redacted.source.modelCalls[0]?.rawText, { status: 'gap', reason: 'redacted' });
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});

test('compiled CLI refuses wrong or unsafe selection and corrupt source without disclosing raw data', async () => {
  const project = await sourceEvidenceProject(['multi']);
  try {
    const run = invoke(project.root, 'run');
    const runId = run.json.runId as string;
    assert.ok(runId);
    assert.equal(selected(project.root, runId, 'multi', 'missing').json.reason, 'selection-mismatch');
    assert.equal(selected(project.root, runId, 'other', 'exact').json.reason, 'selection-mismatch');
    assert.equal(selected(project.root, runId, 'multi', 'exact', '--field', '../unsafe', '--offset', '0').json.reason, 'invalid-field');
    const sourcePath = path.join(project.root, 'evals/artifacts/offline', runId, 'cases/multi/1/source/call-1.json');
    const original = await readFile(sourcePath);
    await writeFile(sourcePath, '{corrupt');
    const corrupt = selected(project.root, runId, 'multi', 'exact');
    assert.equal(corrupt.json.reason, 'corrupt-artifact');
    assert.doesNotMatch(JSON.stringify(corrupt.json) + corrupt.stderr, /RAW-é-/);
    await writeFile(sourcePath, original);
    project.git('add', '-f', path.relative(project.root, sourcePath));
    assert.equal(selected(project.root, runId, 'multi', 'exact').json.reason, 'unsafe-artifact');
  } finally { await project.cleanup(); }
});

test('compiled CLI exposes malformed judge as a grading issue, not a model failure', async () => {
  const project = await sourceEvidenceProject(['malformed']);
  try {
    const run = invoke(project.root, 'run');
    assert.equal(run.json.status, 'error');
    const issue = selected(project.root, run.json.runId as string, 'malformed', 'quality').json;
    assert.equal(issue.failure, undefined);
    assert.equal((issue.gradingIssue as { grading: { error: { code: string } } }).grading.error.code, 'malformed-score');
    assert.doesNotMatch(JSON.stringify(issue) + run.stderr, /RAW-é-|judge-é-☃/);
  } finally { await project.cleanup(); }
});

test('compiled CLI keeps a failed assertion in a partial older run with a not-captured source gap', async () => {
  const project = await artifactProject();
  try {
    const artifacts = artifactFixture(project.root);
    const created = await artifacts.store.create({ ...config, suiteId: 'offline', caseIds: ['case', 'other'] });
    assert.equal(created.status, 'ok');
    if (created.status !== 'ok') return;
    const runId = created.value.runId;
    assert.equal((await artifacts.store.start('offline', runId)).status, 'ok');
    const old = evidence(runId);
    assert.equal((await artifacts.store.append('offline', runId, { ...old, suiteId: 'offline', outcome: 'failed',
      assertions: [{ ...old.assertions[0]!, outcome: 'failed' }] })).status, 'ok');
    assert.equal((await artifacts.store.finalize('offline', runId, 'partial')).status, 'ok');
    const result = selected(project.root, runId, 'case', 'assertion').json;
    assert.equal(result.status, 'ready', JSON.stringify(result));
    assert.equal((result.summary as { state: string }).state, 'partial');
    const failure = result.failure as { caseId: string; attempt: number; assertionId: string; source: unknown };
    assert.deepEqual([failure.caseId, failure.attempt, failure.assertionId], ['case', 1, 'assertion']);
    assert.deepEqual(failure.source, { status: 'gap', reason: 'not-captured' });
  } finally { await project.cleanup(); }
});

test('compiled CLI run gate permits ignored artifacts and refuses unignored or force-tracked artifacts before a new write', async () => {
  const project = await sourceEvidenceProject(['multi']);
  try {
    const first = invoke(project.root, 'run');
    assert.ok(first.json.runId, JSON.stringify(first.json));
    const existing = await artifactNames(project.root);
    assert.ok(existing.some(name => name.endsWith('run.json')));
    await writeFile(path.join(project.root, '.gitignore'), '');
    const unignored = invoke(project.root, 'run');
    assert.equal(unignored.json.status, 'blocked');
    assert.equal(unignored.json.reason, 'artifact-not-ignored');
    assert.deepEqual(await artifactNames(project.root), existing);
    await writeFile(path.join(project.root, '.gitignore'), '/evals/artifacts/\n');
    const runId = first.json.runId as string;
    project.git('add', '-f', `evals/artifacts/offline/${runId}/run.json`);
    const tracked = invoke(project.root, 'run');
    assert.equal(tracked.json.status, 'blocked');
    assert.equal(tracked.json.reason, 'artifact-tracked');
    assert.deepEqual(await artifactNames(project.root), existing);
  } finally { await project.cleanup(); }
});
