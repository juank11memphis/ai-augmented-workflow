import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Installed-runtime smoke: imports only packed modules, from a separate Git project. */
export async function validatePackedEvalPreview({ workspace, installedPackageRoot }) {
  const projectRoot = path.join(workspace, 'offline-eval-preview');
  await mkdir(path.join(projectRoot, 'evals'), { recursive: true });
  await mkdir(path.join(projectRoot, 'src'), { recursive: true });
  await writeFile(path.join(projectRoot, '.gitignore'), '/evals/artifacts/\n');
  await writeFile(path.join(projectRoot, 'src/target.mjs'), 'export const target = null;\n');
  const suite = {
    version: 2, kind: 'sibu-eval-suite', id: 'offline', name: 'Offline', description: 'Synthetic fixture',
    target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
    coverage: { categories: [{ id: 'synthetic', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [{
      id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Synthetic hello' } }],
      toolMocks: [], assertions: [{ id: 'contains', type: 'output-contains', expected: 'hello' }], graders: [],
    }],
  };
  await writeFile(path.join(projectRoot, 'evals/offline.json'), JSON.stringify(suite));
  await writeFile(path.join(projectRoot, 'evals/runner.mjs'), `let body='';
process.stdin.on('data', chunk => body += chunk);
process.stdin.on('end', () => {
  const request = JSON.parse(body);
  if (process.env.SIBU_EVAL_MODE !== '1' || request.operation !== 'describe') process.exit(3);
  const description = {runnerId:'offline',capabilities:['single-turn'],models:['fake/available','fake/unavailable'],judgeModels:[],requiredEnvironment:[]};
  process.stdout.write(JSON.stringify({protocolVersion:1,requestId:request.requestId,sequence:0,
    type:'description',runId:null,caseId:null,attempt:null,data:description})+'\\n');
});`);
  execFileSync('git', ['init', '-q'], { cwd: projectRoot });
  const installed = (relative) => pathToFileURL(path.join(installedPackageRoot, 'bin/modules/local-evals-workbench', relative)).href;
  const [{ ProjectSuiteRuntimeRegistry }, { ProjectRunnerProcessAdapter }, { PreviewArtifactReadiness }, { resolveSuiteInputs }, { describeEvalSuiteRuntime }, { previewEvalRun }] = await Promise.all([
    import(installed('suite-runtime-registry.js')),
    import(installed('runner-process/process-adapter.js')),
    import(installed('preview-artifact-readiness.js')),
    import(installed('resolved-suite-inputs.js')),
    import(installed('describe-eval-suite-runtime/handler.js')),
    import(installed('preview-eval-run/handler.js')),
  ]);
  const suites = new ProjectSuiteRuntimeRegistry(projectRoot);
  const runner = new ProjectRunnerProcessAdapter(projectRoot);
  const described = await describeEvalSuiteRuntime({ suiteId: 'offline' }, { suites, runner });
  assert.equal(described.status, 'ready');
  const dependencies = { suites, runner, artifacts: new PreviewArtifactReadiness(projectRoot), inputs: { resolve: (cases) => resolveSuiteInputs(projectRoot, cases) } };
  for (const model of ['fake/available', 'fake/unavailable']) {
    const result = await previewEvalRun({ suiteId: 'offline', scope: { type: 'all' }, model }, dependencies);
    assert.equal(result.status, 'ready');
    assert.deepEqual(result.selectedCaseIds, ['case']);
    assert.equal('cost' in result, false);
    assert.equal('totalCalls' in result, false);
  }
  console.log('Packed offline eval describe/preview smoke passed.');
}
