import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const runner = `import { target } from '../src/target.mjs';
let body=''; for await (const chunk of process.stdin) body += chunk;
const request=JSON.parse(body);
let sequence=0;
function emit(type,caseId,data) { process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:sequence++,type,
  runId:request.operation==='execute'?request.runId:null,caseId,attempt:caseId?1:null,data})+'\\n'); }
if (request.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn'],models:['fake'],judgeModels:[],requiredEnvironment:[],costEstimation:true});
else if (request.operation==='estimate') emit('estimate',null,{targetCalls:request.testCases.length,judgeCalls:0,totalCalls:request.testCases.length,cost:{status:'unavailable',reason:'Provider pricing unavailable.'}});
else if (request.operation==='execute') {
  if (process.env.SIBU_EVAL_MODE!=='1') process.exit(3);
  emit('run-started',null,{model:request.model,judgeModel:null});
  for (const item of request.testCases) {
    emit('case-attempt-started',item.id,{});
    const output=await target(item.turns[0].content.text,request.model);
    emit('conversation-turn-completed',item.id,{turnIndex:0,role:'assistant',output});
    emit('case-attempt-completed',item.id,{status:'completed'});
  }
  emit('run-completed',null,{status:'completed'});
} else process.exit(2);
`;

export async function offlineProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sibu-execute-offline-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  await mkdir(path.join(root, 'evals')); await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
  await writeFile(path.join(root, 'src/target.mjs'), `export async function target(input,model){ return input.includes('schema') ? JSON.stringify({model,mode:'GOOD',value:input}) : model+':GOOD:'+input; }\n`);
  await writeFile(path.join(root, 'evals/runner.mjs'), runner);
  const testCases: object[] = ['first', 'second'].map(id => ({ id, name: id, turns: [{ role: 'user', content: { type: 'inline', text: 'SYNTHETIC_SECRET_SENTINEL-' + id } }],
    toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'GOOD' }], graders: [] }));
  testCases.push({ id: 'schema', name: 'schema', turns: [{ role: 'user', content: { type: 'inline', text: 'SYNTHETIC_SECRET_SENTINEL-schema' } }],
    toolMocks: [], assertions: [
      { id: 'basic', type: 'json-schema', schema: { type: 'object', required: ['mode', 'value'], properties: {
        mode: { const: 'GOOD' }, value: { type: 'string', minLength: 10 },
      } } },
      { id: 'unsupported', type: 'json-schema', schema: { type: 'object', properties: { value: { pattern: '(a+)+$' } } } },
    ], graders: [] });
  await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify({ version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic only',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases }));
  git('init', '-q');
  return { root, git, changeTarget: async () => writeFile(path.join(root, 'src/target.mjs'), `export async function target(input,model){ return input.includes('schema') ? JSON.stringify({model,mode:'BAD',value:input}) : model+':BAD:'+input; }\n`),
    crashOnSecond: async () => writeFile(path.join(root, 'src/target.mjs'), `export async function target(input,model){ if(input.includes('second')) process.exit(7); return model+':GOOD:'+input; }\n`),
    changeRunner: async (source: string) => writeFile(path.join(root, 'evals/runner.mjs'), source),
    cleanup: async () => rm(root, { recursive: true, force: true }) };
}

const deepRunner = `import { target, productionTool } from '../src/deep-target.mjs';
let body=''; for await (const chunk of process.stdin) body += chunk;
const request=JSON.parse(body); let sequence=0;
function emit(type,caseId,attempt,data) { process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:sequence++,type,
  runId:request.operation==='execute'?request.runId:null,caseId,attempt,data})+'\\n'); }
if (request.operation==='describe') emit('description',null,null,{runnerId:'deep-offline',capabilities:['single-turn','multi-turn','tool-mocks','custom','rubric'],models:['fake'],judgeModels:['fake-judge'],requiredEnvironment:[],costEstimation:true});
else if (request.operation==='estimate') {
  const targetCalls=request.testCases.reduce((n,item)=>n+item.turns.length*request.repeats,0);
  const judgeCalls=request.testCases.reduce((n,item)=>n+item.graders.filter(check=>check.type==='rubric').length*request.repeats,0);
  emit('estimate',null,null,{targetCalls,judgeCalls,totalCalls:targetCalls+judgeCalls,cost:{status:'available',amount:(targetCalls+judgeCalls)*0.01,currency:'USD'}});
} else if (request.operation==='execute') {
  if (process.env.SIBU_EVAL_MODE!=='1') process.exit(3);
  emit('run-started',null,null,{model:request.model,judgeModel:request.judgeModel});
  for (const item of request.testCases) for (let attempt=1;attempt<=request.repeats;attempt++) {
    emit('case-attempt-started',item.id,attempt,{}); let position=0; const conversationState={};
    for (let turnIndex=0;turnIndex<item.turns.length;turnIndex++) {
      const turnId='turn-'+(turnIndex+1); const calls=[];
      const mock=async (name,args)=>{ const fixture=item.toolMocks.find(entry=>entry.tool===name); if(!fixture) throw new Error('unmocked-tool');
        calls.push({name,args,outcome:fixture.outcome}); return fixture.outcome; };
      const output=await target(item.id,turnIndex,attempt,item.turns[turnIndex].content.text,mock,conversationState);
      emit('conversation-turn-completed',item.id,attempt,{turnIndex,turnId,role:'assistant',output});
      for(const call of calls) emit('tool-interaction-recorded',item.id,attempt,{toolId:'tool-'+(++position),turnId,position:position-1,name:call.name,
        arguments:call.args,outcome:call.outcome.type,result:call.outcome.type==='error'?{code:call.outcome.code,message:call.outcome.message}:call.outcome.value});
    }
    for(const grader of item.graders) {
      if(grader.type==='custom') emit('custom-assertion-completed',item.id,attempt,{checkId:grader.id,passed:true,score:null,evidence:'synthetic safe',diagnostics:[]});
      else { const score=item.id==='flaky' && attempt===2?0.6:0.9;
        emit('rubric-judgment-completed',item.id,attempt,{checkId:grader.id,passed:score>=grader.threshold,score,threshold:grader.threshold,judgeModel:request.judgeModel,evidence:'synthetic quality',diagnostics:[]}); }
    }
    if(item.id==='interrupt' && attempt===2) process.exit(7);
    emit('case-attempt-completed',item.id,attempt,{status:'completed',calls:item.turns.length+item.graders.length,cost:(item.turns.length+item.graders.length)*0.01});
  }
  emit('run-completed',null,null,{status:'completed'});
} else process.exit(2);
`;

/** A project-owned fake integration. All tool calls are injected mocks; productionTool is never passed to target. */
export async function deepOfflineProject() {
  const project = await offlineProject();
  await writeFile(path.join(project.root, 'src/deep-target.mjs'), `export async function productionTool(){ throw new Error('PRODUCTION_TOOL_CALLED'); }
export async function target(caseId,turnIndex,attempt,input,mock,state){
  if(caseId==='multi' && turnIndex===0){ const lookup=await mock('lookup',{id:1}); state.lookupFound=lookup.value.found; return 'lookup complete'; }
  if(caseId==='multi' && turnIndex===1){ const error=await mock('errorTool',{id:1}); const unexpected=await mock('unexpectedTool',{id:1});
    return state.lookupFound && error.type==='error' && unexpected.type==='unexpected-response' ? 'verified after lookup' : 'missing prior context'; }
  return caseId==='flaky' && attempt===2 ? 'unstable' : 'verified';
}\n`);
  await project.changeRunner(deepRunner);
  const makeMock = (id: string, type: string, value: object) => ({ id, tool: id, input: { id: 1 }, outcome: { type, ...value } });
  const rubric = { id: 'quality', type: 'rubric', rubric: { type: 'inline', text: 'Quality' }, threshold: 0.8 };
  const cases = [
    { id: 'multi', name: 'Multi-turn', turns: [{ role: 'user', content: { type: 'inline', text: 'lookup' } }, { role: 'user', content: { type: 'inline', text: 'verify' } }],
      toolMocks: [makeMock('lookup', 'result', { value: { found: true } }), makeMock('errorTool', 'error', { code: 'offline', message: 'synthetic' }),
        makeMock('unexpectedTool', 'unexpected-response', { value: { surprise: true } })],
      assertions: [{ id: 'order', type: 'tool-call-sequence', tools: ['lookup', 'errorTool', 'unexpectedTool'] },
        { id: 'turn-count', type: 'turn-count', expected: 2 }, { id: 'turn-output', type: 'turn-output', turnIndex: 1, operator: 'contains', expected: 'verified' },
        { id: 'args', type: 'tool-arguments-equal', tool: 'lookup', expected: { id: 1 } }], graders: [{ id: 'custom', type: 'custom', name: 'safe' }, rubric] },
    { id: 'flaky', name: 'Flaky', turns: [{ role: 'user', content: { type: 'inline', text: 'flaky' } }], toolMocks: [],
      assertions: [{ id: 'answer', type: 'output-contains', expected: 'verified' }], graders: [rubric] },
    { id: 'interrupt', name: 'Interrupt', turns: [{ role: 'user', content: { type: 'inline', text: 'interrupt' } }], toolMocks: [],
      assertions: [{ id: 'answer', type: 'output-contains', expected: 'verified' }], graders: [] },
  ];
  await writeFile(path.join(project.root, 'evals/offline.json'), JSON.stringify({ version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Deep offline', description: 'Synthetic',
    target: { id: 'target', kind: 'agent', path: 'src/deep-target.mjs' }, coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: cases }));
  return { ...project, clearStateBetweenTurns: async () => project.changeRunner(deepRunner.replace('const conversationState={};', 'let conversationState={};').replace('const turnId=\'turn-\'+(turnIndex+1); const calls=[];', "if(turnIndex>0) conversationState={}; const turnId='turn-'+(turnIndex+1); const calls=[];")),
    restoreRunner: async () => project.changeRunner(deepRunner) };
}
