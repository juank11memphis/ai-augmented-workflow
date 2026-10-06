import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function validateInstalledWorkbenchPage(serverUrl) {
  const response = await fetch(new URL('/', serverUrl));
  assert.equal(response.status, 200, 'installed workbench page should load');
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<section\b[^>]*data-run-setup\b[^>]*>/);
  assert.match(html, /<div\b[^>]*data-setup-fields\b[^>]*>/);
  assert.match(html, /<button\b[^>]*data-action="start"/);
  assert.match(html, /data-results-container/);

  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
  const scripts = [...html.matchAll(/<script\b(?![^>]*\btype="application\/json")[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  for (const match of html.matchAll(/<(?:script\b[^>]*\bsrc|link\b[^>]*\brel="stylesheet"[^>]*\bhref)="([^"]+)"[^>]*>/gi)) {
    const assetUrl = new URL(match[1], serverUrl);
    assert.equal(assetUrl.origin, new URL(serverUrl).origin, 'page assets must be served locally');
    const asset = await fetch(assetUrl);
    assert.equal(asset.status, 200, `installed page asset should load: ${assetUrl.pathname}`);
    const content = await asset.text();
    assert.ok(content.length > 0, `installed page asset should not be empty: ${assetUrl.pathname}`);
    if (assetUrl.pathname.endsWith('.css')) styles.push(content);
    if (assetUrl.pathname.endsWith('.js')) scripts.push(content);
  }
  const css = styles.join('\n');
  const client = scripts.join('\n');
  assert.match(css, /\[data-run-setup\]/);
  assert.match(css, /@media\(min-width:700px\)/);
  assert.match(css, /@media\(min-width:1100px\)/);
  assert.match(client, /function modelNotice\(/);
  for (const reason of ['environment-missing', 'model-unavailable', 'runner-unavailable', 'runner-invalid', 'capability-unsupported', 'judge-unavailable']) {
    assert.ok(client.includes(`'${reason}':`), `installed client needs recovery for ${reason}`);
  }
  assert.match(client, /data-model-readiness[\s\S]*?data-action="retry-model"/);
  assert.match(client, /data-action="copy-model-issue"/);
  assert.match(client, /Stage: model-check/);
  assert.match(client, /safeReference\(issue\.reference\)/);
  assert.match(client, /data-action="start"[\s\S]*?disabled = Boolean\(runtimeState !== 'ready'/);
  assert.match(client, /Issue details copied\./);
  assert.match(client, /Copy failed\. Select the issue details above instead\./);
  console.log('Packed installed workbench GET / page, styles, client recovery, and Copy issue details smoke passed.');
}

/** Installed-only integration smoke in a separate, synthetic Git project. */
export async function validatePackedEvalExecution({ workspace, installedPackageRoot }) {
  const root = path.join(workspace, 'offline-eval-execution');
  await mkdir(path.join(root, 'evals'), { recursive: true });
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, '.gitignore'), '/evals/artifacts/\n');
  await writeFile(path.join(root, 'src/target.mjs'), 'export function target(input, model) { return JSON.stringify({ text: model + ":synthetic:" + input }); }\n');
  await writeFile(path.join(root, 'evals/offline.json'), JSON.stringify({
    version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic fixture',
    target: { id: 'target', kind: 'integration', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'hello' } }],
      toolMocks: [], assertions: [
        { id: 'contains', type: 'output-contains', expected: 'synthetic:hello' },
        { id: 'schema-pass', type: 'json-schema', schema: { type: 'object', required: ['text'], properties: { text: { const: 'fake:synthetic:hello' } } } },
        { id: 'schema-fail', type: 'json-schema', schema: { type: 'object', properties: { text: { const: 'different' } } } },
        { id: 'unsupported-ref', type: 'json-schema', schema: { $ref: '#/missing' } },
        { id: 'unsupported-pattern', type: 'json-schema', schema: { type: 'object', properties: { text: { pattern: '(a+)+$' } } } },
      ], graders: [] }],
  }));
  await writeFile(path.join(root, 'evals/runner.mjs'), `import { target } from '../src/target.mjs';
let body=''; for await(const chunk of process.stdin) body += chunk; const q=JSON.parse(body);
let n=0; function emit(type,caseId,data){process.stdout.write(JSON.stringify({protocolVersion:1,requestId:q.requestId,sequence:n++,type,
runId:q.operation==='execute'?q.runId:null,caseId,attempt:caseId?1:null,data})+'\\n');}
if(q.operation==='describe') emit('description',null,{runnerId:'offline',capabilities:['single-turn'],models:['fake'],judgeModels:[],requiredEnvironment:[]});
else if(q.operation==='execute'){emit('run-started',null,{model:q.model,judgeModel:null});emit('case-attempt-started','case',{});
emit('conversation-turn-completed','case',{turnIndex:0,role:'assistant',output:target(q.testCases[0].turns[0].content.text,q.model)});
emit('case-attempt-completed','case',{status:'completed'});emit('run-completed',null,{status:'completed'});}
else process.exit(2);
`);
  execFileSync('git', ['init', '-q'], { cwd: root });
  const installed = relative => pathToFileURL(path.join(installedPackageRoot, 'bin/modules/local-evals-workbench', relative)).href;
  const [{ discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader }, { NodeLocalWorkbenchServerStarter }] = await Promise.all([
    import(installed('discover-conventional-eval-suites/index.js')),
    import(installed('start-local-evals-workbench/local-server-starter.js')),
  ]);
  const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot: root },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
  assert.equal(discovery.status, 'ready');
  const server = await new NodeLocalWorkbenchServerStarter().startServer({ projectRoot: root, initialDiscoveryResult: discovery });
  const post = async (route, body) => {
    const response = await fetch(new URL(route, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { code: response.status, value: await response.json() };
  };
  try {
    await validateInstalledWorkbenchPage(server.url);
    const command = { suiteId: 'offline', scope: { type: 'all' }, model: 'fake', judgeModel: null };
    assert.equal((await post('/api/eval-suites/describe', { suiteId: 'offline' })).code, 200);
    const preview = await post('/api/eval-runs/preview', command);
    assert.equal(preview.code, 200);
    assert.deepEqual(preview.value.selectedCaseIds, ['case']);
    const started = await post('/api/eval-runs/start', command);
    assert.equal(started.code, 202);
    const query = new URLSearchParams({ suiteId: 'offline', runId: started.value.runId });
    let status;
    for (let tries = 0; tries < 100; tries++) {
      const response = await fetch(new URL('/api/eval-runs/status?' + query, server.url));
      status = await response.json();
      if (status.value?.summary.state === 'completed') {
        try {
          const index = JSON.parse(await readFile(path.join(root, 'evals/artifacts/offline/index.json'), 'utf8'));
          if (index.entries.some(entry => entry.runId === started.value.runId && entry.state === 'completed')) break;
        } catch { /* Manifest may become visible just before index publication. */ }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(status.value.summary.state, 'completed');
    query.set('caseId', 'case'); query.set('attempt', '1');
    const detail = await (await fetch(new URL('/api/eval-runs/status?' + query, server.url))).json();
    assert.equal(detail.value.evidence.output, '{"text":"fake:synthetic:hello"}');
    assert.deepEqual(detail.value.evidence.assertions.map(({ id, outcome, diagnostics }) => ({ id, outcome, diagnostics })), [
      { id: 'contains', outcome: 'passed', diagnostics: [] },
      { id: 'schema-pass', outcome: 'passed', diagnostics: [] },
      { id: 'schema-fail', outcome: 'failed', diagnostics: ['/text:const'] },
      { id: 'unsupported-ref', outcome: 'failed', diagnostics: ['unsupported-schema'] },
      { id: 'unsupported-pattern', outcome: 'failed', diagnostics: ['unsupported-schema'] },
    ]);
    const [{ createSelectedFailureReader }, { OpenAiFailureAnalysisAdapter }] = await Promise.all([
      import(installed('repair-context/selected-evidence.js')),
      import(installed('analyze-failed-assertion/openai-failure-analysis-adapter.js')),
    ]);
    const selectedReader = createSelectedFailureReader(async command => {
      const params = new URLSearchParams({ suiteId: command.suiteId, runId: command.runId,
        caseId: command.selection.caseId, attempt: String(command.selection.attempt), assertionId: command.selection.assertionId });
      return (await (await fetch(new URL('/api/eval-runs/status?' + params, server.url))).json());
    });
    const selected = await selectedReader.read({ suiteId: 'offline', runId: started.value.runId,
      testCaseId: 'case', attempt: 1, assertionId: 'schema-fail' });
    assert.equal(selected.status, 'ready');
    let packedPrompt = '';
    const adapter = new OpenAiFailureAnalysisAdapter('fake-key', { createResponse: async request => {
      packedPrompt = request.input;
      return { outputText: JSON.stringify({ exactFailureExplanation: 'Schema mismatch', likelyCause: 'eval_assertion_issue',
        evidenceSummary: 'Selected schema check failed', uncertainty: 'Low' }) };
    } });
    await adapter.analyzeFailure({ model: 'fake-assistance', evidence: selected.value.evidence });
    assert.match(packedPrompt, /selected_failed_assertion_data|schema-fail/);
    assert.doesNotMatch(packedPrompt, /fake-key/);
    console.log('Packed offline eval execute/get smoke passed.');
  } finally { await server.stop?.(); }
}
