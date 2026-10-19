import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { offlineProject } from '../run-execution/offline-project-fixture.js';

const cli = path.resolve('bin/sibu.js');
const body = 'SYNTHETIC_PROVIDER_BODY_PRIVATE';
type Scenario = 'malformed' | 'non-success' | 'adapter-failure' | 'unavailable' | 'oversized' | 'exit-after-observation';
function invoke(root: string, operation: 'run' | 'result', ...args: string[]) {
  const child = spawnSync(process.execPath, [cli, 'evals', operation, 'offline', ...args],
    { cwd: root, encoding: 'utf8', timeout: 45_000 });
  assert.ifError(child.error);
  assert.equal(child.stdout.trim().split('\n').length, 1, child.stderr);
  return { json: JSON.parse(child.stdout) as Record<string, unknown>, stdout: child.stdout, stderr: child.stderr };
}
function safe(output: { stdout: string; stderr: string }) {
  assert.ok(output.stdout.length <= 5200, `ordinary JSON exceeded budget: ${output.stdout.length}`);
  assert.doesNotMatch(output.stdout + output.stderr, /SYNTHETIC_PROVIDER_BODY_PRIVATE/);
}
function runner(scenario: Scenario) {
  const unavailable = scenario === 'unavailable';
  const payload = scenario === 'oversized' ? 'x'.repeat(128_100) : body;
  const chunks = payload.match(/.{1,6000}/g) ?? [];
  return `let input=''; for await(const part of process.stdin) input+=part;
    const request=JSON.parse(input); let sequence=0;
    const emit=(type,caseId,data)=>process.stdout.write(JSON.stringify({protocolVersion:request.operation==='describe'?1:3,
      requestId:request.requestId,runId:request.operation==='execute'?request.runId:null,
      sequence:sequence++,type,caseId,attempt:caseId?1:null,data})+'\\n');
    if(request.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn'],models:['fake'],judgeModels:[],requiredEnvironment:[]});
    else if(request.operation==='execute') {
      const caseId=request.testCases[0].id;
      emit('run-started',null,{model:request.model,judgeModel:null});
      emit('case-attempt-started',caseId,{});
      ${unavailable ? `emit('provider-response-gap',caseId,{callId:'call-1',provisionalTurnId:'turn-1',reason:'not-observed'});`
    : `emit('provider-response-started',caseId,{callId:'call-1',provisionalTurnId:'turn-1',modelId:request.model,
        contentType:'application/octet-stream',originalByteLength:${payload.length}});
        ${chunks.map((chunk, index) => `emit('provider-response-chunk',caseId,{callId:'call-1',index:${index},base64:'${Buffer.from(chunk).toString('base64')}'});`).join('\n')}
        emit('provider-response-completed',caseId,{callId:'call-1',completeness:'complete'});`}
      ${scenario === 'exit-after-observation' ? 'process.exit(7);' : `emit('run-diagnostic',caseId,{code:'${unavailable ? 'provider-no-response' : scenario === 'non-success' ? 'provider-non-success' : scenario === 'adapter-failure' ? 'adapter-failure' : 'malformed-output'}'});
      emit('run-completed',null,{status:'error',code:'${unavailable ? 'provider-no-response' : scenario === 'non-success' ? 'provider-non-success' : scenario === 'adapter-failure' ? 'adapter-failure' : 'malformed-output'}'});`}
    }`;
}

for (const scenario of ['malformed', 'non-success', 'adapter-failure', 'unavailable', 'oversized', 'exit-after-observation'] as const) {
  test(`compiled CLI selects ${scenario} tested-model evidence without ordinary body leakage`, async () => {
    const project = await offlineProject();
    try {
      const suitePath = path.join(project.root, 'evals/offline.json');
      const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { id: string; name: string }[] };
      suite.testCases = [{ ...suite.testCases[0]!, id: 'case', name: 'Case' }];
      await writeFile(suitePath, JSON.stringify(suite));
      await project.changeRunner(runner(scenario));
      const run = invoke(project.root, 'run'); safe(run);
      const runId = run.json.runId as string; assert.ok(runId, JSON.stringify(run.json));
      const overview = invoke(project.root, 'result', runId); safe(overview);
      assert.equal(overview.json.status, 'ready');
      const selected = invoke(project.root, 'result', runId, '--case', 'case', '--attempt', '1'); safe(selected);
      assert.equal(selected.json.status, 'ready', JSON.stringify(selected.json));
      const incomplete = selected.json.incompleteAttempt as { source: {
        status: string; records: { locator: string; status: string; byteLength: number; originalByteLength?: number; missingByteLength?: number }[];
        gaps: { reason: string }[] }; diagnostics: string[];
        failureProvenance: { stage: string; runnerReport?: { code: string } } };
      assert.equal(incomplete.source.status, 'available');
      assert.equal(incomplete.failureProvenance.stage,
        scenario === 'exit-after-observation' ? 'unexpected-process-exit' : 'runner-report');
      if (scenario === 'adapter-failure') {
        assert.ok(incomplete.diagnostics.includes('adapter-failure'));
        assert.equal(incomplete.failureProvenance.runnerReport?.code, 'adapter-failure');
      }
      const artifact = await readFile(path.join(project.root, 'evals/artifacts/offline', runId, 'cases/case/1.json'), 'utf8');
      assert.doesNotMatch(artifact, /SYNTHETIC_PROVIDER_BODY_PRIVATE/);
      if (scenario === 'unavailable') {
        assert.deepEqual(incomplete.source.records, []);
        assert.equal(incomplete.source.gaps[0]?.reason, 'not-observed');
        return;
      }
      const record = incomplete.source.records[0];
      assert.ok(record, JSON.stringify({ run: run.json, selected: selected.json }));
      assert.ok(record.locator);
      assert.equal(record.status, scenario === 'oversized' ? 'truncated' : 'complete');
      if (scenario === 'oversized') {
        assert.equal(record.byteLength, 128000);
        assert.equal(record.originalByteLength, 128100);
        assert.equal(record.missingByteLength, 100);
      }
      const field = invoke(project.root, 'result', runId, '--case', 'case', '--attempt', '1', '--field', record.locator, '--offset', '0');
      assert.equal(field.json.status, 'ready', JSON.stringify(field.json));
      const range = field.json.field as { bytesBase64: string; nextOffset: number | null; byteLength: number };
      assert.deepEqual(Buffer.from(range.bytesBase64, 'base64'), Buffer.from((scenario === 'oversized' ? 'x'.repeat(1024) : body)));
      assert.equal(range.nextOffset, scenario === 'oversized' ? 1024 : null);
      assert.equal(range.byteLength, record.byteLength);
      const foreign = invoke(project.root, 'result', runId, '--case', 'case', '--attempt', '1', '--field', 'other/run/cases/case/1/responses/call-1.bin');
      assert.equal(foreign.json.status, 'blocked'); safe(foreign);
    } finally { await project.cleanup(); }
  });
}

test('incomplete approximate-price is diagnosable from its saved target-2 response without an assertion field read', async () => {
  const project = await offlineProject();
  try {
    const suitePath = path.join(project.root, 'evals/offline.json');
    const suite = JSON.parse(await readFile(suitePath, 'utf8')) as { testCases: { id: string; name: string }[] };
    suite.testCases = [{ ...suite.testCases[0]!, id: 'approximate-price', name: 'Approximate price' }];
    await writeFile(suitePath, JSON.stringify(suite));
    await project.changeRunner(runner('malformed').replaceAll('call-1', 'target-2'));

    const run = invoke(project.root, 'run'); safe(run);
    const runId = run.json.runId as string;
    assert.ok(runId);
    const selected = invoke(project.root, 'result', runId, '--case', 'approximate-price', '--attempt', '1');
    safe(selected);
    assert.equal(selected.json.status, 'ready');

    const runRoot = path.join(project.root, 'evals/artifacts/offline', runId);
    const manifest = JSON.parse(await readFile(path.join(runRoot, 'run.json'), 'utf8')) as { state: string };
    const attempt = JSON.parse(await readFile(path.join(runRoot, 'cases/approximate-price/1.json'), 'utf8')) as {
      outcome: string; diagnostics: string[]; assertions: unknown[];
      providerResponses: { records: { callId: string; locator: string }[] };
    };
    assert.equal(manifest.state, 'error');
    assert.equal(attempt.outcome, 'incomplete');
    assert.deepEqual(attempt.assertions, []);
    assert.ok(attempt.diagnostics.includes('malformed-output'));
    const response = attempt.providerResponses.records.find(item => item.callId === 'target-2');
    assert.ok(response);
    assert.match(response.locator, /^offline\/[A-Za-z0-9._-]+\/responses\/[a-f0-9]{64}\.bin$/);
    const savedResponse = await readFile(path.join(project.root, 'evals/artifacts', response.locator));
    assert.deepEqual(savedResponse, Buffer.from(body));
    assert.throws(() => JSON.parse(savedResponse.toString('utf8')), SyntaxError);

    const assertionField = invoke(project.root, 'result', runId, '--case', 'approximate-price', '--attempt', '1',
      '--assertion', 'contains', '--field', response.locator);
    safe(assertionField);
    assert.equal(assertionField.json.status, 'blocked');
  } finally { await project.cleanup(); }
});
