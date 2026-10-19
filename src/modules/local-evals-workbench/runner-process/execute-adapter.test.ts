import assert from 'node:assert/strict';
import test from 'node:test';
import { ProjectRunnerExecuteAdapter, EXECUTE_LIMITS } from './execute-adapter.js';
import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import { ProjectSuiteRuntimeRegistry } from '../suite-runtime-registry.js';
import { offlineProject } from '../run-execution/offline-project-fixture.js';

async function withSelection(run: (project: Awaited<ReturnType<typeof offlineProject>>, selection: ExecutionSelection) => Promise<void>) {
  const project = await offlineProject();
  try {
    const suite = await new ProjectSuiteRuntimeRegistry(project.root).load('offline');
    assert.ok(suite);
    await run(project, { runId: 'run', suite, cases: [suite.testCases[0]!], model: 'fake' });
  } finally { await project.cleanup(); }
}

test('execute timeout defaults allow 30 seconds of idle time without changing startup or overall limits', () => {
  assert.equal(EXECUTE_LIMITS.startupMs, 5_000);
  assert.equal(EXECUTE_LIMITS.idleMs, 30_000);
  assert.equal(EXECUTE_LIMITS.overallMs, 120_000);
});

test('streams ordered actual output before process exit without exposing runner environment', async () => {
  await withSelection(async (project, selection) => {
    const received: ExecutionEvent[] = [];
    const logs: unknown[] = [];
    const adapter = new ProjectRunnerExecuteAdapter(project.root, EXECUTE_LIMITS,
      { PATH: process.env.PATH, SECRET_SENTINEL: 'SYNTHETIC_ENV_VALUE' }, { record: event => { logs.push(event); } });
    const outcome = await adapter.execute(selection, async event => { received.push(event); await new Promise(resolve => setTimeout(resolve, 5)); });
    assert.equal(outcome.status, 'completed');
    assert.deepEqual(received.map(item => item.type), ['run-started', 'case-started', 'turn-completed', 'case-completed', 'run-completed']);
    assert.match(JSON.stringify(received), /SYNTHETIC_SECRET_SENTINEL-first/);
    assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_ENV_VALUE|SYNTHETIC_SECRET_SENTINEL/);
  });
});

test('version-two runner delivers complete source while operational logs omit its raw payload', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:2,requestId:q.requestId,
        sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      emit('conversation-turn-completed','first',{turnIndex:0,turnId:'turn-1',role:'assistant',output:'normalized'});
      const source={kind:'model-call',id:'call-1',turnId:'turn-1',checkId:'contains',modelId:q.model,phase:'initial',elapsedMs:3,
        inputMessages:[{role:'user',content:'SYNTHETIC_INPUT_SECRET'}],rawText:'SYNTHETIC_RAW_SECRET',
        rawToolCalls:[{id:'provider-call',name:'lookup',arguments:{secret:'SYNTHETIC_ARG_SECRET'}}],normalizedOutput:'normalized'};
      const bytes=Buffer.from(JSON.stringify(source)); const split=Math.floor(bytes.length/2);
      for(const [index,part] of [bytes.subarray(0,split),bytes.subarray(split)].entries()) emit('source-record-chunk','first',
        {recordId:'call-1',index,count:2,byteLength:bytes.length,base64:part.toString('base64')});
      emit('case-attempt-completed','first',{status:'completed',sourceEvidenceComplete:true});
      emit('run-completed',null,{status:'completed'});`);
    const received: ExecutionEvent[] = []; const logs: unknown[] = [];
    const outcome = await new ProjectRunnerExecuteAdapter(project.root, EXECUTE_LIMITS, process.env,
      { record: item => { logs.push(item); } }).execute(selection, async item => { received.push(item); });
    assert.equal(outcome.status, 'completed');
    const record = received.find(item => item.type === 'source-record');
    assert.equal(record?.type, 'source-record');
    if (record?.type === 'source-record') assert.equal(record.record.kind === 'model-call' && record.record.rawText, 'SYNTHETIC_RAW_SECRET');
    assert.equal(received.some(item => item.type === 'source-chunk-accepted'), false);
    assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_(INPUT|RAW|ARG)_SECRET/);
  });
});

test('version-three runner delivers exact pre-turn response before malformed-output failure and keeps logs body-free', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`let input=''; for await(const c of process.stdin) input+=c; const q=JSON.parse(input); let n=0;
      const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:3,requestId:q.requestId,
        sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      const body=Buffer.from([0,255,83,89,78,84,72,69,84,73,67,95,82,65,87]);
      emit('provider-response-started','first',{callId:'call-1',provisionalTurnId:'turn-1',modelId:q.model,
        contentType:'application/octet-stream',originalByteLength:body.length});
      emit('provider-response-chunk','first',{callId:'call-1',index:0,base64:body.toString('base64')});
      emit('provider-response-completed','first',{callId:'call-1',completeness:'complete'});
      emit('run-diagnostic','first',{code:'malformed-output'});
      emit('case-attempt-completed','first',{status:'error',sourceEvidenceComplete:false});
      emit('run-completed',null,{status:'error',code:'malformed-output'});`);
    const received: ExecutionEvent[] = []; const logs: unknown[] = [];
    const result = await new ProjectRunnerExecuteAdapter(project.root, EXECUTE_LIMITS, process.env,
      { record: item => { logs.push(item); } }).execute(selection, async item => { received.push(item); });
    assert.equal(result.status, 'error');
    assert.deepEqual(received.map(item => item.type), ['run-started', 'case-started', 'provider-response-observed',
      'diagnostic', 'case-completed', 'run-completed']);
    const observed = received[2];
    assert.equal(observed?.type, 'provider-response-observed');
    if (observed?.type === 'provider-response-observed') assert.deepEqual(observed.bytes, Buffer.from([0,255,83,89,78,84,72,69,84,73,67,95,82,65,87]));
    assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_RAW/);
  });
});

test('version-three runner preserves last response and emits unfinished call gap on trailing protocol failure', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`let input=''; for await(const c of process.stdin) input+=c; const q=JSON.parse(input); let n=0;
      const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:3,requestId:q.requestId,
        sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      emit('provider-response-started','first',{callId:'call-1',provisionalTurnId:'turn-1',modelId:q.model});
      emit('provider-response-chunk','first',{callId:'call-1',index:0,base64:Buffer.from('first').toString('base64')});
      emit('provider-response-completed','first',{callId:'call-1',completeness:'complete'});
      emit('provider-response-started','first',{callId:'call-2',provisionalTurnId:'turn-2',modelId:q.model});
      emit('provider-response-chunk','first',{callId:'call-2',index:0,base64:Buffer.from('partial').toString('base64')});
      emit('provider-response-chunk','first',{callId:'call-2',index:0,base64:Buffer.from('bad').toString('base64')});`);
    const received: ExecutionEvent[] = [];
    const result = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async item => { received.push(item); });
    assert.equal(result.reason, 'runner-protocol-invalid');
    assert.equal(received[2]?.type, 'provider-response-observed');
    if (received[2]?.type === 'provider-response-observed') assert.deepEqual(received[2].bytes, Buffer.from('first'));
    assert.deepEqual(received.at(-1), { type: 'provider-response-gap', caseId: 'first', attempt: 1,
      callId: 'call-2', provisionalTurnId: 'turn-2', reason: 'incomplete' });
  });
});

test('judge response before grading error survives a valid error report followed by nonzero exit', async () => {
  await withSelection(async (project, base) => {
    const selection = { ...base, judgeModel: 'judge', cases: [{ ...base.cases[0]!, graders: [{
      id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'Quality' }, threshold: 0.8,
    }] }] };
    await project.changeRunner(`let input=''; for await(const c of process.stdin) input+=c; const q=JSON.parse(input); let n=0;
      const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:3,requestId:q.requestId,
        sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit('run-started',null,{model:q.model,judgeModel:q.judgeModel}); emit('case-attempt-started','first',{});
      const body=Buffer.from([0,255,195,169]);
      emit('provider-response-started','first',{role:'judge',checkId:'quality',modelId:q.judgeModel,
        callId:'judge-1',provisionalTurnId:'pending-turn',originalByteLength:body.length});
      emit('provider-response-chunk','first',{callId:'judge-1',index:0,base64:body.toString('base64')});
      emit('provider-response-completed','first',{callId:'judge-1',completeness:'complete'});
      emit('rubric-judgment-error','first',{checkId:'quality',judgeModel:q.judgeModel,code:'malformed-output'});
      emit('case-attempt-completed','first',{status:'error',sourceEvidenceComplete:false});
      emit('run-completed',null,{status:'error',code:'grading-failed'}); process.exitCode=7;`);
    const received: ExecutionEvent[] = [];
    const result = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async item => { received.push(item); });
    assert.deepEqual(result, { status: 'error', reason: 'runner-exited', failureProvenance: {
      stage: 'runner-report', runnerReport: { status: 'error', code: 'grading-failed' }, processExit: { code: 7 } } });
    assert.deepEqual(received.map(item => item.type), ['run-started', 'case-started', 'provider-response-observed',
      'grading-error', 'case-completed', 'run-completed']);
    const response = received[2];
    assert.equal(response?.type, 'provider-response-observed');
    if (response?.type === 'provider-response-observed') {
      assert.deepEqual(response.bytes, Buffer.from([0, 255, 195, 169]));
      assert.equal(response.role, 'judge'); assert.equal(response.checkId, 'quality');
      assert.equal(response.provisionalTurnId, 'pending-turn');
    }
    assert.equal(received.some(item => item.type === 'grader-completed'), false);
  });
});

test('judge event followed by missing terminal report retains observation and classifies unexpected exit', async () => {
  await withSelection(async (project, base) => {
    const selection = { ...base, judgeModel: 'judge', cases: [{ ...base.cases[0]!, graders: [{
      id: 'quality', type: 'rubric' as const, rubric: { type: 'inline' as const, text: 'Quality' }, threshold: 0.8,
    }] }] };
    await project.changeRunner(`let input=''; for await(const c of process.stdin) input+=c; const q=JSON.parse(input); let n=0;
      const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:3,requestId:q.requestId,
        sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit('run-started',null,{model:q.model,judgeModel:q.judgeModel}); emit('case-attempt-started','first',{});
      emit('provider-response-gap','first',{role:'judge',checkId:'quality',modelId:q.judgeModel,
        callId:'judge-1',provisionalTurnId:'pending-turn',reason:'not-emitted'}); process.exitCode=7;`);
    const received: ExecutionEvent[] = [];
    const result = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async item => { received.push(item); });
    assert.deepEqual(result, { status: 'error', reason: 'runner-exited', failureProvenance: {
      stage: 'unexpected-process-exit', processExit: { code: 7 } } });
    assert.deepEqual(received.at(-1), { type: 'provider-response-gap', caseId: 'first', attempt: 1,
      role: 'judge', checkId: 'quality', callId: 'judge-1', provisionalTurnId: 'pending-turn', reason: 'not-emitted' });
  });
});

test('preserves preceding accepted events on abnormal process exit and rejects missing terminal', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw);
      let n=0; const e=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      e('run-started',null,{model:q.model,judgeModel:null}); e('case-attempt-started','first',{});
      e('conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'actual'});
      e('case-attempt-completed','first',{status:'completed'}); process.exit(7);`);
    const received: ExecutionEvent[] = [];
    const result = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async event => { received.push(event); });
    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'runner-exited');
    assert.equal(received.at(-1)?.type, 'case-completed');
  });
});

test('rejects identity violations and terminates an idle runner within injected limits', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw);
      process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:0,type:'run-started',runId:'wrong',caseId:null,attempt:null,data:{model:q.model,judgeModel:null}})+'\\n');
      setInterval(()=>{},1000);`);
    const limits = { ...EXECUTE_LIMITS, startupMs: 100, idleMs: 100, overallMs: 400, cleanupMs: 50 };
    const result = await new ProjectRunnerExecuteAdapter(project.root, limits).execute(selection, async () => undefined);
    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'runner-protocol-invalid');
  });
});

test('request and stdout bounds refuse execution without returning truncated success', async () => {
  await withSelection(async (project, selection) => {
    const request = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, requestBytes: 4 }).execute(selection, async () => undefined);
    assert.deepEqual(request, { status: 'blocked', reason: 'runner-request-too-large' });
    const stdout = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, stdoutBytes: 20 }).execute(selection, async () => undefined);
    assert.deepEqual(stdout, { status: 'error', reason: 'runner-limit' });
  });
});

test('startup, idle, and overall timers terminate active invocations', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`);
    const startup = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 100, idleMs: 500, overallMs: 1000, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(startup, { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } });
    const running = `let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      function emit(type,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId:null,attempt:null,data})+'\\n');}
      emit('run-started',{model:q.model,judgeModel:null}); process.on('SIGTERM',()=>{});`;
    await project.changeRunner(running + `setInterval(()=>{},1000);`);
    const idle = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 100, overallMs: 1000, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(idle, { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } });
    await project.changeRunner(running + `setInterval(()=>emit('run-diagnostic',{code:'working',message:'Still working'}),30);`);
    const overall = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 150, overallMs: 200, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(overall, { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } });
  });
});

test('timeout settles when a descendant keeps the runner output pipes open', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`import { spawn } from 'node:child_process';
      let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');}
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      emit('conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'accepted'});
      emit('case-attempt-completed','first',{status:'completed'});
      spawn(process.execPath,['-e','setTimeout(()=>{},1500)'],{stdio:['ignore','inherit','inherit']}).unref();
      process.exit(7);`);
    const received: ExecutionEvent[] = [];
    const started = Date.now();
    const result = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 120, overallMs: 800, cleanupMs: 60 }).execute(selection, async event => { received.push(event); });
    assert.deepEqual(result, { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } });
    assert.equal(received.at(-1)?.type, 'case-completed');
    assert.ok(Date.now() - started < 700, 'execution settles before the descendant closes its pipes');
  });
});

test('protocol failure settles when a descendant keeps the runner output pipes open', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`import { spawn } from 'node:child_process';
      let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw);
      const emit=(sequence,type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');
      emit(0,'run-started',null,{model:q.model,judgeModel:null});
      emit(1,'case-attempt-started','first',{});
      emit(2,'conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'accepted'});
      emit(3,'case-attempt-completed','first',{status:'completed'});
      spawn(process.execPath,['-e','setTimeout(()=>{},1500)'],{stdio:['ignore','inherit','inherit']}).unref();
      emit(5,'run-completed',null,{status:'completed'});`);
    const received: ExecutionEvent[] = [];
    const started = Date.now();
    const result = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 800, overallMs: 1000, cleanupMs: 60 }).execute(selection, async event => { received.push(event); });
    assert.deepEqual(result, { status: 'error', reason: 'runner-protocol-invalid', failureProvenance: { stage: 'protocol-rejection' } });
    assert.equal(received.at(-1)?.type, 'case-completed');
    assert.ok(Date.now() - started < 700, 'protocol failure settles before the descendant closes its pipes');
  });
});

test('stderr and retained output limits reject oversized evidence', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`process.stderr.write('SYNTHETIC_STDERR_SECRET'.repeat(10)); setInterval(()=>{},1000);`);
    const logs: unknown[] = [];
    const stderr = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, stderrBytes: 10, cleanupMs: 40 },
      process.env, { record: event => { logs.push(event); } }).execute(selection, async () => undefined);
    assert.deepEqual(stderr, { status: 'error', reason: 'runner-limit' });
    assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_STDERR_SECRET/);
    await project.changeRunner(`let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');}
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      emit('conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'x'.repeat(9000)});`);
    const output = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async () => undefined);
    assert.deepEqual(output, { status: 'error', reason: 'runner-protocol-invalid', failureProvenance: { stage: 'protocol-rejection' } });
  });
});
