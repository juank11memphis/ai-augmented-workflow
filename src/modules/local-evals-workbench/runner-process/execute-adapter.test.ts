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
    assert.equal(result.reason, 'runner-invalid');
  });
});

test('request and stdout bounds refuse execution without returning truncated success', async () => {
  await withSelection(async (project, selection) => {
    const request = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, requestBytes: 4 }).execute(selection, async () => undefined);
    assert.deepEqual(request, { status: 'blocked', reason: 'input-unsafe' });
    const stdout = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, stdoutBytes: 20 }).execute(selection, async () => undefined);
    assert.deepEqual(stdout, { status: 'error', reason: 'runner-limit' });
  });
});

test('startup, idle, and overall timers terminate active invocations', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`);
    const startup = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 100, idleMs: 500, overallMs: 1000, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(startup, { status: 'error', reason: 'runner-timeout' });
    const running = `let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      function emit(type,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId:null,attempt:null,data})+'\\n');}
      emit('run-started',{model:q.model,judgeModel:null}); process.on('SIGTERM',()=>{});`;
    await project.changeRunner(running + `setInterval(()=>{},1000);`);
    const idle = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 100, overallMs: 1000, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(idle, { status: 'error', reason: 'runner-timeout' });
    await project.changeRunner(running + `setInterval(()=>emit('run-diagnostic',{code:'working',message:'Still working'}),30);`);
    const overall = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS,
      startupMs: 500, idleMs: 150, overallMs: 200, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(overall, { status: 'error', reason: 'runner-timeout' });
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
    assert.deepEqual(result, { status: 'error', reason: 'runner-timeout' });
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
    assert.deepEqual(result, { status: 'error', reason: 'runner-invalid' });
    assert.equal(received.at(-1)?.type, 'case-completed');
    assert.ok(Date.now() - started < 700, 'protocol failure settles before the descendant closes its pipes');
  });
});

test('stderr and retained output limits reject oversized evidence', async () => {
  await withSelection(async (project, selection) => {
    await project.changeRunner(`process.stderr.write('x'.repeat(100)); setInterval(()=>{},1000);`);
    const stderr = await new ProjectRunnerExecuteAdapter(project.root, { ...EXECUTE_LIMITS, stderrBytes: 10, cleanupMs: 40 }).execute(selection, async () => undefined);
    assert.deepEqual(stderr, { status: 'error', reason: 'runner-limit' });
    await project.changeRunner(`let raw=''; for await(const c of process.stdin) raw+=c; const q=JSON.parse(raw); let n=0;
      function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,runId:q.runId,caseId,attempt:caseId?1:null,data})+'\\n');}
      emit('run-started',null,{model:q.model,judgeModel:null}); emit('case-attempt-started','first',{});
      emit('conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'x'.repeat(9000)});`);
    const output = await new ProjectRunnerExecuteAdapter(project.root).execute(selection, async () => undefined);
    assert.deepEqual(output, { status: 'error', reason: 'runner-invalid' });
  });
});
