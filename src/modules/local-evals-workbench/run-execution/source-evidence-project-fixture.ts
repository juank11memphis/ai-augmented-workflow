import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { offlineProject } from './offline-project-fixture.js';

const runner = `let body=''; for await (const chunk of process.stdin) body+=chunk;
const request=JSON.parse(body); let sequence=0;
function emit(type,caseId,data){ process.stdout.write(JSON.stringify({protocolVersion:2,requestId:request.requestId,
  runId:request.runId,sequence:sequence++,type,caseId,attempt:caseId?1:null,data})+'\\n'); }
function source(caseId,record){const bytes=Buffer.from(JSON.stringify(record)); emit('source-record-chunk',caseId,
  {recordId:record.id,index:0,count:1,byteLength:bytes.length,base64:bytes.toString('base64')});}
if(request.operation==='describe') process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,
  type:'description',runId:null,caseId:null,attempt:null,data:{runnerId:'source-fake',capabilities:['single-turn','multi-turn','tool-mocks'],
  models:['fake'],judgeModels:[],requiredEnvironment:[]}})+'\\n');
else if(request.operation==='execute'){
  emit('run-started',null,{model:request.model,judgeModel:null});
  for(const item of request.testCases){const redacted=item.id==='redacted';
    emit('case-attempt-started',item.id,{});
    emit('conversation-turn-completed',item.id,{turnIndex:0,turnId:'turn-1',role:'assistant',output:'FIRST'});
    source(item.id,{kind:'model-call',id:'call-1',turnId:'turn-1',checkId:'exact',modelId:'fake',phase:'initial',elapsedMs:1,
      inputMessages:[{role:'system',content:'approved context'},{role:'user',content:'first request'}],
      rawText:redacted?'':('RAW-é-'+'x'.repeat(1200)),rawToolCalls:[{id:'tool-1',name:'lookup',arguments:{id:1}}],
      normalizedOutput:'FIRST',...(redacted?{redactedFields:['rawText']}:
        {approvedFacts:[{factId:'fact-1',provenance:'runner-attested'}]})});
    emit('tool-interaction-recorded',item.id,{toolId:'tool-1',turnId:'turn-1',position:0,name:'lookup',
      arguments:{id:1},outcome:'result',result:{actual:'DELIVERED'}});
    source(item.id,{kind:'tool-delivery',id:'tool-1',turnId:'turn-1',checkId:'exact',modelCallId:'call-1',name:'lookup',
      request:{id:1},result:{actual:'DELIVERED'},outcome:'result',elapsedMs:2});
    emit('conversation-turn-completed',item.id,{turnIndex:1,turnId:'turn-2',role:'assistant',output:'NORMALIZED'});
    source(item.id,{kind:'model-call',id:'call-2',turnId:'turn-2',checkId:'exact',modelId:'fake',phase:'post-tool',elapsedMs:3,
      inputMessages:[{role:'tool',content:'{\"actual\":\"DELIVERED\"}'},{role:'user',content:'second request'}],
      rawText:'RAW CONTINUATION',rawToolCalls:[],normalizedOutput:'NORMALIZED'});
    emit('case-attempt-completed',item.id,{status:'completed',sourceEvidenceComplete:true});
  }
  emit('run-completed',null,{status:'completed'});
}
`;

export async function sourceEvidenceProject() {
  const project = await offlineProject();
  await project.changeRunner(runner);
  const cases = ['multi', 'redacted'].map(id => ({ id, name: id,
    turns: ['first request', 'second request'].map(text => ({ role: 'user', content: { type: 'inline', text } })),
    toolMocks: [{ id: 'lookup', tool: 'lookup', input: { id: 1 }, outcome: { type: 'result', value: { expected: 'DECLARED' } } }],
    assertions: [{ id: 'exact', type: 'output-equals', expected: { type: 'inline', text: 'EXPECTED' } }], graders: [] }));
  await writeFile(path.join(project.root, 'evals/offline.json'), JSON.stringify({ version: 2, kind: 'sibu-eval-suite',
    id: 'offline', name: 'Source evidence', description: 'Synthetic', defaultTestedModel: 'fake',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: cases }));
  return project;
}
