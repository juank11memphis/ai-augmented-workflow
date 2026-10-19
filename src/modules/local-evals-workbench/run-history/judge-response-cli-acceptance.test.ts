import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { offlineProject } from '../run-execution/offline-project-fixture.js';

const cli = path.resolve('bin/sibu.js');
const body = Buffer.from([0, 255, 195, 169, 10]);
type Scenario = 'grading-error' | 'non-success' | 'not-observed' | 'not-emitted' | 'capture-failed';

function invoke(root: string, operation: 'run' | 'result', ...args: string[]) {
  const child = spawnSync(process.execPath, [cli, 'evals', operation, 'offline', ...args],
    { cwd: root, encoding: 'utf8', timeout: 45_000 });
  assert.ifError(child.error);
  assert.equal(child.stdout.trim().split('\n').length, 1, child.stderr);
  return { json: JSON.parse(child.stdout) as Record<string, unknown>, stdout: child.stdout, stderr: child.stderr };
}

function runner(scenario: Scenario): string {
  const observed = scenario === 'grading-error' || scenario === 'non-success';
  return `let input=''; for await (const part of process.stdin) input+=part;
    const request=JSON.parse(input); let sequence=0;
    const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:request.operation==='describe'?1:3,
      requestId:request.requestId,runId:request.operation==='execute'?request.runId:null,
      sequence:sequence++,type,caseId,attempt:caseId?1:null,data})+'\\n');
    if(request.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn','rubric'],models:['fake'],judgeModels:['fake-judge'],requiredEnvironment:[]});
    else if(request.operation==='execute') {
      const caseId=request.testCases[0].id;
      emit('run-started',null,{model:request.model,judgeModel:request.judgeModel});
      emit('case-attempt-started',caseId,{});
      emit('conversation-turn-completed',caseId,{turnIndex:0,turnId:'turn-1',role:'assistant',output:'SAFE'});
      const identity={role:'judge',checkId:'quality',modelId:request.judgeModel,callId:'judge-1',provisionalTurnId:'turn-1'};
      ${observed ? `emit('provider-response-started',caseId,{...identity,contentType:'application/octet-stream',originalByteLength:5});
      emit('provider-response-chunk',caseId,{callId:'judge-1',index:0,base64:'${body.subarray(0, 3).toString('base64')}'});
      emit('provider-response-chunk',caseId,{callId:'judge-1',index:1,base64:'${body.subarray(3).toString('base64')}'});
      emit('provider-response-completed',caseId,{callId:'judge-1',completeness:'complete'});`
    : `emit('provider-response-gap',caseId,{...identity,reason:'${scenario}'});`}
      emit('rubric-judgment-error',caseId,{checkId:'quality',judgeModel:request.judgeModel,code:'${scenario === 'non-success' ? 'judge-non-success' : 'malformed-score'}'});
      emit('run-diagnostic',caseId,{code:'${scenario === 'non-success' ? 'judge-non-success' : 'malformed-score'}'});
      emit('run-completed',null,{status:'error',code:'${scenario === 'non-success' ? 'judge-non-success' : 'malformed-score'}'});
    }`;
}

for (const scenario of ['grading-error', 'non-success', 'not-observed', 'not-emitted', 'capture-failed'] as const) {
  test(`compiled CLI retains judge ${scenario} before grading failure without an invented judgment`, async () => {
    const project = await offlineProject();
    try {
      const suitePath = path.join(project.root, 'evals/offline.json');
      const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: Record<string, unknown>[];
        defaultJudgeModel?: string };
      suite.defaultJudgeModel = 'fake-judge';
      suite.testCases = [{ ...suite.testCases[0], id: 'approximate-price', name: 'Approximate price',
        graders: [{ id: 'quality', type: 'rubric', rubric: { type: 'inline', text: 'Synthetic rubric' }, threshold: 0.8 }] }];
      await writeFile(suitePath, JSON.stringify(suite));
      await project.changeRunner(runner(scenario));
      const run = invoke(project.root, 'run');
      const runId = run.json.runId as string;
      assert.ok(runId, JSON.stringify(run.json));
      const overview = invoke(project.root, 'result', runId);
      const selected = invoke(project.root, 'result', runId, '--case', 'approximate-price', '--attempt', '1');
      assert.equal(selected.json.status, 'ready', JSON.stringify(selected.json));
      for (const output of [run, overview, selected]) {
        assert.ok(output.stdout.length <= 5_200);
        assert.doesNotMatch(output.stdout + output.stderr, /SYNTHETIC_PROVIDER_BODY_PRIVATE/);
      }
      const incomplete = selected.json.incompleteAttempt as { state: string; source: {
        status: string; records: { locator: string; role: string; checkId: string; callId: string;
          provisionalTurnId: string }[]; gaps: { reason: string; role: string; checkId: string }[] } };
      assert.equal(incomplete.state, 'incomplete');
      const artifact = await readFile(path.join(project.root, 'evals/artifacts/offline', runId,
        'cases/approximate-price/1.json'), 'utf8');
      const saved = JSON.parse(artifact) as { assertions: { outcome: string; score: number | null }[] };
      assert.deepEqual(saved.assertions.map(item => ({ outcome: item.outcome, score: item.score })),
        [{ outcome: 'incomplete', score: null }]);
      if (scenario !== 'grading-error' && scenario !== 'non-success') {
        assert.deepEqual(incomplete.source.records, []);
        assert.ok(incomplete.source.gaps.some(gap => gap.reason === scenario && gap.role === 'judge' && gap.checkId === 'quality'));
        return;
      }
      const record = incomplete.source.records[0];
      assert.equal(record?.role, 'judge');
      assert.equal(record?.checkId, 'quality');
      assert.equal(record?.callId, 'judge-1');
      assert.equal(record?.provisionalTurnId, 'turn-1');
      assert.ok(record.locator);
      const field = invoke(project.root, 'result', runId, '--case', 'approximate-price', '--attempt', '1',
        '--field', record.locator, '--offset', '0');
      assert.equal(field.json.status, 'ready', JSON.stringify(field.json));
      assert.deepEqual(Buffer.from((field.json.field as { bytesBase64: string }).bytesBase64, 'base64'), body);
    } finally { await project.cleanup(); }
  });
}
