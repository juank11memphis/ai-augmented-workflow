import assert from 'node:assert/strict';
import test from 'node:test';
import { ProjectRunnerExecuteAdapter, EXECUTE_LIMITS } from './execute-adapter.js';
import { ProjectSuiteRuntimeRegistry } from '../suite-runtime-registry.js';
import { offlineProject } from '../run-execution/offline-project-fixture.js';
import type { ExecutionEvent, RunnerExecutionOutcome } from '../run-execution/contracts.js';

type Scenario = { version?: 1 | 2; report?: 'error' | 'interrupted' | 'completed'; code?: string;
  exit?: number; trailing?: string; wait?: boolean; partialChunk?: boolean };

function runner(scenario: Scenario): string {
  return `let input=''; for await (const chunk of process.stdin) input+=chunk;
    const request=JSON.parse(input); let sequence=0;
    process.stderr.write('SYNTHETIC_STDERR_SECRET');
    const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:${scenario.version ?? 1},
      requestId:request.requestId,runId:request.runId,sequence:sequence++,type,caseId,
      attempt:caseId?1:null,data})+'\\n');
    emit('run-started',null,{model:request.model,judgeModel:null});
    emit('case-attempt-started','first',{});
    emit('run-diagnostic','first',{code:'observed-failure',message:'SYNTHETIC_RAW_RESPONSE_SECRET'});
    ${scenario.partialChunk ? "emit('source-record-chunk','first',{recordId:'call-1',index:0,count:2,byteLength:8,base64:Buffer.from('part').toString('base64')});" : ''}
    ${scenario.report === 'completed' ? "emit('conversation-turn-completed','first',{turnIndex:0,role:'assistant',output:'safe'}); emit('case-attempt-completed','first',{status:'completed'});" : ''}
    ${scenario.report ? `emit('run-completed',null,{status:${JSON.stringify(scenario.report)},
      ${scenario.code === undefined ? '' : `code:${JSON.stringify(scenario.code)},`}});` : ''}
    ${scenario.trailing ? `process.stdout.write(${JSON.stringify(scenario.trailing)});` : ''}
    ${scenario.wait ? "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);" : `process.exit(${scenario.exit ?? 0});`}`;
}

async function execute(scenario: Scenario): Promise<{ outcome: RunnerExecutionOutcome; events: ExecutionEvent[]; logs: unknown[] }> {
  const project = await offlineProject();
  try {
    await project.changeRunner(runner(scenario));
    const suite = await new ProjectSuiteRuntimeRegistry(project.root).load('offline');
    assert.ok(suite);
    const events: ExecutionEvent[] = [];
    const logs: unknown[] = [];
    const limits = { ...EXECUTE_LIMITS, startupMs: 500, idleMs: 120, overallMs: 500, cleanupMs: 40 };
    const outcome = await new ProjectRunnerExecuteAdapter(project.root, limits, process.env,
      { record: item => { logs.push(item); } }).execute(
      { runId: 'run', suite, cases: [suite.testCases[0]!], model: 'fake' }, async event => { events.push(event); });
    return { outcome, events, logs };
  } finally { await project.cleanup(); }
}

test('valid v1 terminal error report preserves its safe reason without process exit', async () => {
  const { outcome, events, logs } = await execute({ report: 'error', code: 'provider-malformed' });
  assert.deepEqual(outcome, { status: 'error', failureProvenance: { stage: 'runner-report',
    runnerReport: { status: 'error', code: 'provider-malformed' } } });
  assert.deepEqual(events.map(event => event.type), ['run-started', 'case-started', 'diagnostic', 'run-completed']);
  assert.equal(events.at(-1)?.type, 'run-completed');
  assert.doesNotMatch(JSON.stringify({ outcome, logs }), /SYNTHETIC_(RAW_RESPONSE|STDERR)_SECRET/);
});

test('exit-only, report-plus-exit, and completed-report-plus-exit retain distinct observed facts', async () => {
  const exited = await execute({ exit: 7 });
  assert.deepEqual(exited.outcome, { status: 'error', reason: 'runner-exited',
    failureProvenance: { stage: 'unexpected-process-exit', processExit: { code: 7 } } });
  assert.equal(exited.events.at(-1)?.type, 'diagnostic');
  const both = await execute({ report: 'error', code: 'adapter-failed', exit: 8 });
  assert.deepEqual(both.outcome, { status: 'error', reason: 'runner-exited',
    failureProvenance: { stage: 'runner-report', runnerReport: { status: 'error', code: 'adapter-failed' }, processExit: { code: 8 } } });
  const completed = await execute({ report: 'completed', exit: 9 });
  assert.deepEqual(completed.outcome.failureProvenance, { stage: 'unexpected-process-exit', processExit: { code: 9 } });
  for (const result of [exited, both, completed]) {
    assert.deepEqual(result.events.slice(0, 3).map(event => event.type), ['run-started', 'case-started', 'diagnostic']);
    assert.doesNotMatch(JSON.stringify({ outcome: result.outcome, logs: result.logs }), /SYNTHETIC_(RAW_RESPONSE|STDERR)_SECRET/);
  }
});

test('timeout and malformed trailing event keep the last valid checkpoint and their own failure stage', async () => {
  const timed = await execute({ version: 2, partialChunk: true, wait: true });
  assert.deepEqual(timed.outcome, { status: 'error', reason: 'runner-timeout', failureProvenance: { stage: 'timeout' } });
  assert.deepEqual(timed.events.at(-1), { type: 'source-gap', caseId: 'first', attempt: 1,
    reason: 'incomplete', recordId: 'call-1' });
  const malformed = await execute({ trailing: '{"private":"SYNTHETIC_RAW_RESPONSE_SECRET"}\n' });
  assert.deepEqual(malformed.outcome, { status: 'error', reason: 'runner-protocol-invalid',
    failureProvenance: { stage: 'protocol-rejection' } });
  assert.equal(malformed.events.at(-1)?.type, 'diagnostic');
  assert.doesNotMatch(JSON.stringify({ outcome: malformed.outcome, logs: malformed.logs }), /SYNTHETIC_(RAW_RESPONSE|STDERR)_SECRET/);
});

test('v2 accepts the bounded report code; malformed or unsafe terminal codes are not reported', async () => {
  const valid = await execute({ version: 2, report: 'error', code: 'judge-failed' });
  assert.deepEqual(valid.outcome.failureProvenance, { stage: 'runner-report', runnerReport: { status: 'error', code: 'judge-failed' } });
  const invalid = await execute({ report: 'error', code: 'SYNTHETIC_RAW_RESPONSE_SECRET' });
  assert.deepEqual(invalid.outcome.failureProvenance, { stage: 'protocol-rejection' });
  assert.equal(invalid.events.at(-1)?.type, 'diagnostic');
  assert.doesNotMatch(JSON.stringify({ outcome: invalid.outcome, logs: invalid.logs }), /SYNTHETIC_(RAW_RESPONSE|STDERR)_SECRET/);
});
