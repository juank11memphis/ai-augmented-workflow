import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { offlineProject } from '../run-execution/offline-project-fixture.js';

const cli = path.resolve('bin/sibu.js');
const rawSentinel = 'SYNTHETIC_RAW_PROVIDER_RESPONSE_SECRET';
const caseIds = ['done-a', 'done-b', 'approximate-price',
  ...Array.from({ length: 14 }, (_, index) => `later-${index}`)];

type Scenario = 'report-only' | 'exit-only' | 'report-plus-exit' | 'timeout' | 'malformed-trailing';
type CliResult = { json: Record<string, unknown>; stderr: string; stdout: string };

function invoke(root: string, operation: 'run' | 'result', ...args: string[]): CliResult {
  const child = spawnSync(process.execPath, [cli, 'evals', operation, 'offline', ...args],
    { cwd: root, encoding: 'utf8', timeout: 45_000 });
  assert.ifError(child.error);
  assert.equal(child.stdout.trim().split('\n').length, 1, child.stderr);
  return { json: JSON.parse(child.stdout) as Record<string, unknown>, stderr: child.stderr, stdout: child.stdout };
}

function runner(scenario: Scenario): string {
  const report = scenario === 'report-only' || scenario === 'report-plus-exit';
  return `let body=''; for await (const chunk of process.stdin) body+=chunk;
    const request=JSON.parse(body); let sequence=0;
    const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:1,
      requestId:request.requestId,runId:request.operation==='execute'?request.runId:null,
      sequence:sequence++,type,caseId,attempt:caseId?1:null,data})+'\\n');
    if(request.operation==='describe') {
      emit('description',null,{runnerId:'offline',capabilities:['single-turn'],models:['fake'],judgeModels:[],requiredEnvironment:[]});
    } else if(request.operation==='execute') {
      process.stderr.write('${rawSentinel}');
      emit('run-started',null,{model:request.model,judgeModel:null});
      for(const item of request.testCases.slice(0,2)) {
        emit('case-attempt-started',item.id,{});
        emit('conversation-turn-completed',item.id,{turnIndex:0,role:'assistant',output:'SAFE'});
        emit('case-attempt-completed',item.id,{status:'completed'});
      }
      emit('case-attempt-started','approximate-price',{});
      emit('run-diagnostic','approximate-price',{code:'malformed-output',message:'${rawSentinel}'});
      ${report ? "emit('run-completed',null,{status:'error',code:'malformed-output'});" : ''}
      ${scenario === 'malformed-trailing' ? "process.stdout.write('{\\\"private\\\":\\\"${rawSentinel}\\\"}\\n');" : ''}
      ${scenario === 'timeout' ? "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);" : `process.exit(${scenario === 'exit-only' ? 7 : scenario === 'report-plus-exit' ? 8 : 0});`}
    } else process.exit(2);`;
}

async function fixture(scenario: Scenario) {
  const project = await offlineProject();
  const suitePath = path.join(project.root, 'evals/offline.json');
  const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: unknown[] };
  suite.testCases = caseIds.map(id => ({ id, name: id,
    turns: [{ role: 'user', content: { type: 'inline', text: 'synthetic' } }], toolMocks: [],
    assertions: [{ id: 'contains', type: 'output-contains', expected: 'SAFE' }], graders: [] }));
  await writeFile(suitePath, JSON.stringify(suite));
  await project.changeRunner(runner(scenario));
  return project;
}

function assertSafe(result: CliResult): void {
  assert.ok(result.stdout.length <= 5_200, `ordinary JSON exceeded budget: ${result.stdout.length}`);
  assert.doesNotMatch(result.stdout + result.stderr, /SYNTHETIC_RAW_PROVIDER_RESPONSE_SECRET/);
}

for (const scenario of ['report-only', 'exit-only', 'report-plus-exit', 'timeout', 'malformed-trailing'] as const) {
  test(`compiled CLI preserves ${scenario} provenance and incomplete checkpoint in local artifacts`, async () => {
    const project = await fixture(scenario);
    try {
      const run = invoke(project.root, 'run');
      assert.equal(run.json.status, 'partial', JSON.stringify(run.json));
      const runId = run.json.runId as string;
      assert.ok(runId);
      assertSafe(run);

      const artifactRoot = path.join(project.root, 'evals/artifacts/offline', runId);
      const manifest = JSON.parse(await readFile(path.join(artifactRoot, 'run.json'), 'utf8')) as {
        state: string; cases: { caseId: string; state: string; attempts: unknown[] }[];
        failureProvenance: { stage: string; runnerReport?: { code: string }; processExit?: { code: number } };
      };
      const attempt = JSON.parse(await readFile(path.join(artifactRoot, 'cases/approximate-price/1.json'), 'utf8')) as {
        outcome: string; diagnostics: string[]; turns: unknown[]; assertions: unknown[];
        failureProvenance: typeof manifest.failureProvenance;
      };
      assert.equal(manifest.state, 'partial');
      assert.deepEqual(manifest.cases.map(item => item.state),
        ['completed', 'completed', 'incomplete', ...Array(14).fill('not-run')]);
      assert.equal(attempt.outcome, 'incomplete');
      assert.deepEqual(attempt.turns, []);
      assert.deepEqual(attempt.assertions, []);
      assert.deepEqual(attempt.diagnostics, ['malformed-output']);
      assert.doesNotMatch(JSON.stringify({ manifest, attempt }), /SYNTHETIC_RAW_PROVIDER_RESPONSE_SECRET/);

      const summary = invoke(project.root, 'result', runId);
      const view = summary.json.summary as { counts: { completed: number; incomplete: number; notRun: number };
        cases: { caseId: string; attempts: { incompleteLocator?: { caseId: string; attempt: number } }[] }[];
        failureProvenance: typeof manifest.failureProvenance };
      assert.equal(summary.json.status, 'ready');
      assert.deepEqual(view.counts, { completed: 2, incomplete: 1, notRun: 14 });
      assert.deepEqual(view.cases[2]?.attempts[0]?.incompleteLocator,
        { caseId: 'approximate-price', attempt: 1 });
      assert.deepEqual(view.failureProvenance, manifest.failureProvenance);
      assertSafe(summary);

      const selected = invoke(project.root, 'result', runId, '--case', 'approximate-price', '--attempt', '1');
      assert.equal(selected.json.status, 'ready', JSON.stringify(selected.json));
      const incomplete = selected.json.incompleteAttempt as { state: string; diagnostics: string[];
        turnIds: string[]; callIds: string[]; source: { status: string; reason: string };
        failureProvenance: typeof manifest.failureProvenance };
      assert.equal(incomplete.state, 'incomplete');
      assert.deepEqual(incomplete.diagnostics, ['malformed-output']);
      assert.deepEqual(incomplete.turnIds, []);
      assert.deepEqual(incomplete.callIds, []);
      assert.deepEqual(incomplete.source, { status: 'gap', reason: 'not-captured' });
      assert.deepEqual(incomplete.failureProvenance, manifest.failureProvenance);
      assert.deepEqual(attempt.failureProvenance, manifest.failureProvenance);
      assertSafe(selected);

      const expected = scenario === 'report-only' ? { stage: 'runner-report', runnerReport: { status: 'error', code: 'malformed-output' } }
        : scenario === 'report-plus-exit' ? { stage: 'runner-report', runnerReport: { status: 'error', code: 'malformed-output' },
          processExit: { code: 8 } }
        : scenario === 'exit-only' ? { stage: 'unexpected-process-exit', processExit: { code: 7 } }
        : scenario === 'timeout' ? { stage: 'timeout' } : { stage: 'protocol-rejection' };
      assert.deepEqual(manifest.failureProvenance, expected);
    } finally { await project.cleanup(); }
  });
}

test('compiled CLI keeps assertion selection and blocks dangling or unsupported selections', async () => {
  const project = await fixture('report-only');
  try {
    const runId = invoke(project.root, 'run').json.runId as string;
    for (const args of [['--case', 'approximate-price'], ['--attempt', '1'], ['--assertion', 'contains'],
      ['--case', 'approximate-price', '--attempt', '0'], ['--case', '../unsafe', '--attempt', '1'],
      ['--case', 'approximate-price', '--attempt', '1', '--field', 'call~rawText']]) {
      const response = invoke(project.root, 'result', runId, ...args);
      assert.equal(response.json.status, 'blocked');
      assertSafe(response);
    }
  } finally { await project.cleanup(); }
});
