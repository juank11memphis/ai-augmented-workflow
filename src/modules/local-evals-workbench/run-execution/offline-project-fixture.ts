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
