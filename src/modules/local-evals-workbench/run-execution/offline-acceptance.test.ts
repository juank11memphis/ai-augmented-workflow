import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHeadlessWorkbench } from '../headless-composition.js';
import { sourceEvidenceProject } from './source-evidence-project-fixture.js';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader } from '../discover-conventional-eval-suites/index.js';
import { NodeLocalWorkbenchServerStarter } from '../start-local-evals-workbench/local-server-starter.js';
import { offlineProject } from './offline-project-fixture.js';

test('offline target execution persists real output and changed integration changes assertion verdict', async () => {
  const project = await offlineProject();
  try {
    const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: project.root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
    assert.equal(discovery.status, 'ready');
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: project.root, initialDiscoveryResult: discovery });
    const post = async (url: string, body: unknown) => {
      const response = await fetch(new URL(url, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { code: response.status, value: await response.json() as Record<string, unknown> };
    };
    const get = async (suiteId: string, runId: string, caseId?: string) => {
      const query = new URLSearchParams({ suiteId, runId, ...(caseId ? { caseId, attempt: '1' } : {}) });
      const response = await fetch(new URL('/api/eval-runs/status?' + query, server.url));
      return await response.json() as { status: string; value: { summary: { state: string; cases: { caseId: string; testedModel: string; judgeModel: string | null }[] }; reviewArtifactPath?: string; evidence?: { output: string; outcome: string;
        review?: { runPath: string; suitePath: string | null; targetPath: string | null; runnerPath: string | null; inputPaths: string[] };
        assertions: { id: string; outcome: string; diagnostics: string[] }[] } } };
    };
    const terminal = async (runId: string) => {
      const deadline = performance.now() + 30_000;
      let lastState = 'not-observed';
      while (performance.now() < deadline) {
        const status = await get('offline', runId);
        lastState = status.status === 'ok' ? status.value.summary.state : status.status;
        if (status.status === 'ok' && !['queued', 'running'].includes(status.value.summary.state)) {
          try {
            const index = JSON.parse(await readFile(path.join(project.root, 'evals/artifacts/offline/index.json'), 'utf8')) as {
              entries: { runId: string; state: string }[];
            };
            if (index.entries.some(entry => entry.runId === runId && entry.state === status.value.summary.state)) return status;
          } catch { /* Atomic index update is still in flight. */ }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.fail(`Run did not reach a persisted terminal state within 30 seconds (last state: ${lastState}).`);
    };
    const before = project.git('status', '--porcelain');
    try {
      const command = { suiteId: 'offline', scope: { type: 'all' } };
      const preview = await post('/api/eval-runs/preview', command);
      assert.equal(preview.code, 200);
      const start = await post('/api/eval-runs/start', command);
      assert.equal(start.code, 202, JSON.stringify(start.value));
      const runId = start.value.runId as string;
      const oneCommand = { ...command, scope: { type: 'test_case', testCaseId: 'first' },
        runOnly: { testedModel: 'fake' } };
      const onePreview = await post('/api/eval-runs/preview', oneCommand);
      assert.equal(onePreview.code, 200);
      const parallelStart = await post('/api/eval-runs/start', oneCommand);
      assert.equal(parallelStart.code, 202);
      assert.notEqual(parallelStart.value.runId, runId);
      const status = await terminal(runId);
      assert.equal(status.value.summary.state, 'completed');
      assert.deepEqual(status.value.summary.cases.map(({ caseId, testedModel, judgeModel }) => ({ caseId, testedModel, judgeModel })),
        ['first', 'second', 'schema'].map(caseId => ({ caseId, testedModel: 'fake', judgeModel: null })));
      const detail = await get('offline', runId, 'first');
      const originalManifest = await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'run.json'));
      const originalAttempt = await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'cases/first/1.json'));
      assert.match(detail.value.evidence!.output, /fake:GOOD:SYNTHETIC_SECRET_SENTINEL-first/);
      assert.equal(detail.value.evidence!.outcome, 'passed');
      assert.equal(detail.value.reviewArtifactPath, `evals/artifacts/offline/${runId}/cases/first/1.json`);
      assert.deepEqual(detail.value.evidence!.review, { runPath: `evals/artifacts/offline/${runId}/run.json`,
        suitePath: 'evals/offline.json', targetPath: 'src/target.mjs', runnerPath: 'evals/runner.mjs', inputPaths: [],
        omittedInputPathCount: 0, context: 'current-repo-files' });
      const savedReview = JSON.parse(await readFile(path.join(project.root, detail.value.reviewArtifactPath!), 'utf8')) as { review: unknown };
      assert.deepEqual(savedReview.review, detail.value.evidence!.review);
      const schemaDetail = await get('offline', runId, 'schema');
      assert.match(schemaDetail.value.evidence!.output, /SYNTHETIC_SECRET_SENTINEL-schema/);
      assert.deepEqual(schemaDetail.value.evidence!.assertions.map(({ id, outcome, diagnostics }) => ({ id, outcome, diagnostics })), [
        { id: 'basic', outcome: 'passed', diagnostics: [] },
        { id: 'unsupported', outcome: 'failed', diagnostics: ['unsupported-schema'] },
      ]);
      const one = await terminal(parallelStart.value.runId as string);
      assert.equal(one.value.summary.state, 'completed');
      await project.changeTarget();
      const second = await post('/api/eval-runs/start', command);
      assert.equal(second.code, 202);
      assert.notEqual(second.value.runId, runId);
      const changed = await terminal(second.value.runId as string);
      assert.equal(changed.value.summary.state, 'completed');
      const changedDetail = await get('offline', second.value.runId as string, 'first');
      assert.match(changedDetail.value.evidence!.output, /fake:BAD:/);
      assert.equal(changedDetail.value.evidence!.outcome, 'failed');
      const changedSchema = await get('offline', second.value.runId as string, 'schema');
      assert.equal(changedSchema.value.evidence!.assertions.find(assertion => assertion.id === 'basic')?.outcome, 'failed');
      assert.deepEqual(await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'run.json')), originalManifest);
      assert.deepEqual(await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'cases/first/1.json')), originalAttempt);
      await project.crashOnSecond();
      const crashed = await post('/api/eval-runs/start', command);
      assert.equal(crashed.code, 202);
      const partial = await terminal(crashed.value.runId as string);
      assert.equal(partial.value.summary.state, 'partial');
      const retained = await get('offline', crashed.value.runId as string, 'first');
      assert.equal(retained.value.evidence?.outcome, 'passed');
      assert.deepEqual(await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'run.json')), originalManifest);
      assert.deepEqual(await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'cases/first/1.json')), originalAttempt);
      assert.equal(project.git('status', '--porcelain').replace(' M src/target.mjs\n', ''), before);
    } finally { await server.stop?.(); }
  } finally { await project.cleanup(); }
});

 test('offline deep execution preserves attempts, scores, mocked tools and interrupted evidence', async () => {
  const project = await import('./offline-project-fixture.js').then(module => module.deepOfflineProject());
  try {
    const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: project.root },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
    assert.equal(discovery.status, 'ready');
    const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: project.root, initialDiscoveryResult: discovery });
    const post = async (url: string, body: unknown) => {
      const response = await fetch(new URL(url, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { code: response.status, value: await response.json() as Record<string, unknown> };
    };
    const get = async (runId: string, caseId?: string, attempt?: number) => {
      const query = new URLSearchParams({ suiteId: 'offline', runId, ...(caseId ? { caseId, attempt: String(attempt ?? 1) } : {}) });
      const response = await fetch(new URL('/api/eval-runs/status?' + query, server.url));
      return await response.json() as { status: string; value: { summary: { state: string; outcome: string; calls: number; cost: number;
        cases: { caseId: string; testedModel: string; judgeModel: string | null; attempts: { outcome: string; rubricScores?: number[] }[] }[] }; evidence?: { outcome: string;
        turns: { content: string }[]; tools: { outcome: string }[]; assertions: { id: string; outcome: string; score: number | null; judgeModel?: string }[] } } };
    };
    const run = async (caseId: string, judgeModel: string | null) => {
      const command = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: caseId },
        ...(judgeModel ? { runOnly: { judgeModel } } : {}) };
      const preview = await post('/api/eval-runs/preview', command);
      assert.equal(preview.code, 200, JSON.stringify(preview.value));
      const start = await post('/api/eval-runs/start', command);
      assert.equal(start.code, 202, JSON.stringify(start.value));
      const runId = start.value.runId as string;
      for (let tries = 0; tries < 120; tries++) {
        const result = await get(runId);
        if (result.status === 'ok' && !['queued', 'running'].includes(result.value.summary.state)) {
          try {
            const index = JSON.parse(await readFile(path.join(project.root, 'evals/artifacts/offline/index.json'), 'utf8')) as {
              entries: { runId: string; state: string }[];
            };
            if (index.entries.some(entry => entry.runId === runId && entry.state === result.value.summary.state)) {
              return { runId, summary: result.value.summary };
            }
          } catch { /* Atomic index update is still in flight. */ }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.fail('Deep run did not reach a persisted terminal state.');
    };
    try {
      const before = project.git('status', '--porcelain');
      const savedJudge = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'multi' } });
      assert.equal(savedJudge.code, 200);
      assert.deepEqual(savedJudge.value.caseSelections, [{ caseId: 'multi', testedModel: 'fake', judgeModel: 'fake-judge' }]);
      const multi = await run('multi', 'fake-judge');
      assert.equal(multi.summary.state, 'completed');
      assert.deepEqual(multi.summary.cases.map(({ testedModel, judgeModel }) => ({ testedModel, judgeModel })),
        [{ testedModel: 'fake', judgeModel: 'fake-judge' }]);
      const multiDetail = await get(multi.runId, 'multi');
      assert.equal(multiDetail.value.evidence?.turns.length, 2);
      assert.deepEqual(multiDetail.value.evidence?.tools.map(item => item.outcome), ['result', 'error', 'unexpected-response']);
      assert.ok(multiDetail.value.evidence?.assertions.every(item => item.outcome === 'passed'));
      assert.equal(multiDetail.value.evidence?.assertions.find(item => item.id === 'quality')?.judgeModel, 'fake-judge');
      assert.deepEqual(multi.summary.cases[0]?.attempts.map(item => item.outcome), ['passed']);
      await project.clearStateBetweenTurns();
      const stateCleared = await run('multi', 'fake-judge');
      assert.equal(stateCleared.summary.outcome, 'failed');
      assert.equal((await get(stateCleared.runId, 'multi')).value.evidence?.assertions.find(item => item.id === 'turn-output')?.outcome, 'failed');
      await project.restoreRunner();
      const single = await run('flaky', 'fake-judge');
      assert.deepEqual(single.summary.cases[0]?.attempts.map(item => item.outcome), ['passed']);
      assert.deepEqual(single.summary.cases[0]?.attempts.flatMap(item => item.rubricScores ?? []), [0.9]);
      assert.equal(project.git('status', '--porcelain'), before);
    } finally { await server.stop?.(); }
  } finally { await project.cleanup(); }
});

test('fake runner source survives save/reopen into selected CLI bytes without full-run disclosure', async () => {
  const project = await sourceEvidenceProject();
  try {
    const before = project.git('status', '--porcelain');
    const workbench = await createHeadlessWorkbench(project.root);
    const result = await workbench.run({ suiteId: 'offline', scope: { type: 'all' } });
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.doesNotMatch(JSON.stringify(result), /RAW-é|DELIVERED|approved context/);
    if (result.status !== 'completed') return;
    const runId = result.runId;
    assert.ok(runId);
    const cli = (...args: string[]) => {
      const processResult = spawnSync(process.execPath, [path.resolve('bin/sibu.js'), 'evals', ...args],
        { cwd: project.root, encoding: 'utf8', timeout: 20_000 });
      assert.ifError(processResult.error);
      assert.doesNotMatch(processResult.stderr, /RAW-é|DELIVERED|approved context/);
      return JSON.parse(processResult.stdout) as Record<string, unknown>;
    };
    const summary = cli('result', 'offline', runId);
    assert.equal(summary.status, 'ready');
    assert.doesNotMatch(JSON.stringify(summary), /RAW-é|DELIVERED|approved context/);
    const cases = (summary.summary as { cases: { caseId: string; attempts: { failedAssertionIds: string[] }[] }[] }).cases;
    assert.deepEqual(cases.map(item => [item.caseId, item.attempts[0]?.failedAssertionIds]),
      [['multi', ['exact']], ['redacted', ['exact']], ['rubric', ['exact', 'quality']]]);
    const selected = cli('result', 'offline', runId, '--case', 'multi', '--attempt', '1', '--assertion', 'exact');
    assert.equal(selected.status, 'ready', JSON.stringify(selected));
    const failure = selected.failure as { caseId: string; attempt: number; source: { modelCalls: { id: string; turnId: string;
      rawText: { locator: string; byteLength: number; truncated: boolean }; normalizedOutput: { value: string };
      inputMessages: { content: { value: string } }[]; rawToolCalls: { arguments: { value: string } }[] }[];
      toolEvents: { request: { value: string }; result: { value: string } }[]; approvedFacts: unknown[] } };
    assert.deepEqual([failure.caseId, failure.attempt], ['multi', 1]);
    assert.deepEqual((selected.failure as { grading: unknown }).grading, { kind: 'deterministic' });
    assert.deepEqual(failure.source.modelCalls.map(call => [call.id, call.turnId]), [['call-1', 'turn-1'], ['call-2', 'turn-2']]);
    assert.equal(failure.source.modelCalls[0]?.inputMessages[0]?.content.value, 'approved context');
    assert.equal(failure.source.modelCalls[0]?.normalizedOutput.value, 'FIRST');
    assert.equal(failure.source.modelCalls[0]?.rawToolCalls[0]?.arguments.value, '{"id":1}');
    assert.equal(failure.source.modelCalls[1]?.inputMessages[0]?.content.value, '{"actual":"DELIVERED"}');
    assert.equal(failure.source.toolEvents[0]?.request.value, '{"id":1}');
    assert.equal(failure.source.toolEvents[0]?.result.value, '{"actual":"DELIVERED"}');
    const declared = JSON.parse(await readFile(path.join(project.root, 'evals/offline.json'), 'utf8')) as {
      testCases: { toolMocks: { outcome: { value: unknown } }[] }[] };
    assert.notEqual(failure.source.toolEvents[0]?.result.value,
      JSON.stringify(declared.testCases[0]?.toolMocks[0]?.outcome.value));
    assert.deepEqual(failure.source.approvedFacts, [{ modelCallId: 'call-1', factId: 'fact-1', provenance: 'runner-attested' }]);
    const raw = failure.source.modelCalls[0]!.rawText;
    assert.equal(raw.truncated, true);
    assert.equal(raw.locator, 'call-1~rawText');
    const parts: Buffer[] = [];
    let offset = 0;
    while (true) {
      const page = cli('result', 'offline', runId, '--case', 'multi', '--attempt', '1', '--assertion', 'exact',
        '--field', raw.locator, '--offset', String(offset));
      assert.equal(page.status, 'ready', JSON.stringify(page));
      const field = page.field as { bytesBase64: string; nextOffset: number | null };
      parts.push(Buffer.from(field.bytesBase64, 'base64'));
      if (field.nextOffset === null) break;
      offset = field.nextOffset;
    }
    assert.equal(Buffer.concat(parts).toString('utf8'), 'RAW-é-' + 'x'.repeat(1200));
    assert.notEqual(Buffer.concat(parts).toString('utf8'), failure.source.modelCalls[0]?.normalizedOutput.value);
    const judgeSelected = cli('result', 'offline', runId, '--case', 'rubric', '--attempt', '1', '--assertion', 'quality');
    assert.equal(judgeSelected.status, 'ready', JSON.stringify(judgeSelected));
    const rubricFailure = judgeSelected.failure as { grading: { kind: string; score: number; threshold: number;
      comparison: string; judgeModel: string; evaluatedRubric: { value: string }; judge: {
        request: { locator: string; byteLength: number; truncated: boolean }; response: { value: string }; rationale: { value: string } } } };
    assert.deepEqual([rubricFailure.grading.kind, rubricFailure.grading.score, rubricFailure.grading.threshold,
      rubricFailure.grading.comparison, rubricFailure.grading.judgeModel], ['rubric', 0.4, 0.8, 'failed', 'fake-judge']);
    assert.equal(rubricFailure.grading.evaluatedRubric.value, 'Quality against REFERENCE-é');
    assert.equal(rubricFailure.grading.judge.response.value, '{"score":0.4,"rationale":"Missing reference é"}');
    assert.equal(rubricFailure.grading.judge.rationale.value, 'Missing reference é');
    const judgeRequest = rubricFailure.grading.judge.request;
    assert.equal(judgeRequest.truncated, true);
    assert.equal(judgeRequest.locator, 'judge-1~request');
    const judgeParts: Buffer[] = [];
    let judgeOffset = 0;
    while (true) {
      const page = cli('result', 'offline', runId, '--case', 'rubric', '--attempt', '1', '--assertion', 'quality',
        '--field', judgeRequest.locator, '--offset', String(judgeOffset));
      assert.equal(page.status, 'ready', JSON.stringify(page));
      const field = page.field as { bytesBase64: string; byteLength: number; offset: number; nextOffset: number | null };
      assert.equal(field.offset, judgeOffset);
      assert.equal(field.byteLength, judgeRequest.byteLength);
      judgeParts.push(Buffer.from(field.bytesBase64, 'base64'));
      if (field.nextOffset === null) break;
      assert.ok(field.nextOffset > judgeOffset);
      judgeOffset = field.nextOffset;
    }
    const expectedRequest = 'Grade NORMALIZED against REFERENCE-é. ' + 'judge-é-☃'.repeat(180);
    assert.deepEqual(Buffer.concat(judgeParts), Buffer.from(expectedRequest));
    assert.equal(cli('result', 'offline', runId, '--case', 'rubric', '--attempt', '1', '--assertion', 'exact',
      '--field', judgeRequest.locator, '--offset', '0').status, 'blocked');
    assert.doesNotMatch(JSON.stringify(result) + JSON.stringify(summary), /Grade NORMALIZED|Missing reference é|broken-é/);
    const redacted = cli('result', 'offline', runId, '--case', 'redacted', '--attempt', '1', '--assertion', 'exact');
    const redactedSource = (redacted.failure as { source: { modelCalls: { rawText: unknown }[]; approvedFacts: unknown[] } }).source;
    assert.deepEqual(redactedSource.modelCalls[0]?.rawText, { status: 'gap', reason: 'redacted' });
    assert.deepEqual(redactedSource.approvedFacts, []);
    assert.equal(cli('result', 'offline', runId, '--case', 'redacted', '--attempt', '1', '--assertion', 'exact',
      '--field', 'call-1~rawText', '--offset', '0').status, 'blocked');
    assert.equal(cli('result', 'offline', runId, '--case', 'multi', '--attempt', '2', '--assertion', 'exact').status, 'blocked');
    assert.equal(cli('result', 'offline', runId, '--case', 'multi', '--attempt', '1', '--assertion', 'wrong').status, 'blocked');
    assert.equal(project.git('status', '--porcelain'), before);
  } finally { await project.cleanup(); }
});

test('scoreless fake judge error retains exact bytes without inventing a failed locator', async () => {
  const project = await sourceEvidenceProject(['malformed']);
  try {
    const workbench = await createHeadlessWorkbench(project.root);
    const result = await workbench.run({ suiteId: 'offline', scope: { type: 'all' } });
    assert.equal(result.status, 'error', JSON.stringify(result));
    assert.doesNotMatch(JSON.stringify(result), /Grade NORMALIZED|broken-é/);
    if (result.status !== 'error' || !result.runId) return;
    const cli = (...args: string[]) => {
      const processResult = spawnSync(process.execPath, [path.resolve('bin/sibu.js'), 'evals', 'result', 'offline', result.runId!, ...args],
        { cwd: project.root, encoding: 'utf8', timeout: 20_000 });
      assert.ifError(processResult.error);
      assert.doesNotMatch(processResult.stderr, /Grade NORMALIZED|broken-é/);
      return JSON.parse(processResult.stdout) as Record<string, unknown>;
    };
    const summary = cli();
    assert.equal(summary.status, 'ready');
    assert.doesNotMatch(JSON.stringify(summary), /Grade NORMALIZED|broken-é/);
    const attempt = (summary.summary as { cases: { attempts: { outcome: string; failedAssertionIds?: string[] }[] }[] })
      .cases[0]?.attempts[0];
    assert.equal(attempt?.outcome, 'incomplete');
    assert.equal(attempt.failedAssertionIds, undefined);
    const selected = cli('--case', 'malformed', '--attempt', '1', '--assertion', 'quality');
    assert.equal(selected.status, 'ready', JSON.stringify(selected));
    assert.equal(selected.failure, undefined);
    const issue = selected.gradingIssue as { grading: { score: number | null; comparison: string; error: { code: string };
      judge: { request: { locator: string }; response: { locator: string; value: string } } } };
    assert.deepEqual([issue.grading.score, issue.grading.comparison, issue.grading.error.code],
      [null, 'incomplete', 'malformed-score']);
    assert.equal(issue.grading.judge.response.value, '{broken-é');
    const responsePage = cli('--case', 'malformed', '--attempt', '1', '--assertion', 'quality',
      '--field', issue.grading.judge.response.locator, '--offset', '0');
    assert.equal(responsePage.status, 'ready', JSON.stringify(responsePage));
    assert.deepEqual(Buffer.from((responsePage.field as { bytesBase64: string }).bytesBase64, 'base64'), Buffer.from('{broken-é'));
    const parts: Buffer[] = [];
    let offset = 0;
    while (true) {
      const page = cli('--case', 'malformed', '--attempt', '1', '--assertion', 'quality',
        '--field', issue.grading.judge.request.locator, '--offset', String(offset));
      assert.equal(page.status, 'ready', JSON.stringify(page));
      const field = page.field as { bytesBase64: string; nextOffset: number | null };
      parts.push(Buffer.from(field.bytesBase64, 'base64'));
      if (field.nextOffset === null) break;
      assert.ok(field.nextOffset > offset);
      offset = field.nextOffset;
    }
    assert.deepEqual(Buffer.concat(parts), Buffer.from('Grade NORMALIZED against REFERENCE-é. ' + 'judge-é-☃'.repeat(180)));
    assert.equal(cli('--case', 'malformed', '--attempt', '1', '--assertion', 'exact').status, 'blocked');
  } finally { await project.cleanup(); }
});
