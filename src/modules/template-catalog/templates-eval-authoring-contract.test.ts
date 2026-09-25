import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, validateEvalSuiteContract } from '../local-evals-workbench/index.js';
import { getWorkflowTargets, readTemplate, readTemplateManifest, renderMissingWorkflowFiles, SUPPORTED_AGENTS } from './index.js';

const referencePath = 'skills/eval-authoring/references/version-2-contract.md';
const targetPath = `.agents/${referencePath}`;
const reference = readTemplate(referencePath);
function example(): Record<string, unknown> {
  return JSON.parse(reference.match(/```json\n([\s\S]*?)\n```/)![1]!) as Record<string, unknown>;
}

test('distributed example uses the owning public version-2 validator', () => {
  assert.equal(validateEvalSuiteContract(example(), 'evals/support.json').status, 'valid');
  for (const mutate of [
    (suite: Record<string, unknown>) => { suite.version = 1; },
    (suite: Record<string, unknown>) => { suite.cases = suite.testCases; delete suite.testCases; suite.run = {}; },
    (suite: Record<string, unknown>) => { suite.coverage = { categories: [{ id: 'gap', status: 'known-gap' }], gaps: [] }; },
    (suite: Record<string, unknown>) => { suite.runner = { command: ['node', 'evals/runner.mjs'], requiredEnvironment: ['TOKEN=value'] }; },
    (suite: Record<string, unknown>) => { suite.testCases = [{ id: 'empty', name: 'Empty', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }], assertions: [], graders: [] }]; },
  ]) {
    const suite = example(); mutate(suite);
    assert.equal(validateEvalSuiteContract(suite, 'evals/support.json').status, 'invalid');
  }
});

test('documented file-backed layout discovers all content from evals and target/runner from project root', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-authoring-content-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    'src/support.ts': 'throw new Error("Discovery must not execute production code.");',
    'evals/runners/support.mjs': 'throw new Error("Discovery must not execute runners.");',
    'evals/inputs/lookup.txt': 'Find synthetic order A.',
    'evals/fixtures/order.json': '{"orderId":"A"}',
    'evals/references/expected.txt': 'pending',
    'evals/rubrics/grounded.txt': 'Report only the known status.',
  };
  for (const [relativePath, content] of Object.entries(files)) {
    assert.ok(reference.includes(relativePath), `Documented layout includes ${relativePath}`);
    await fs.mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
    await fs.writeFile(path.join(root, relativePath), content);
  }
  const suiteFile = path.join(root, 'evals/support.json');
  await fs.writeFile(suiteFile, JSON.stringify(example()));
  const discover = () => discoverConventionalEvalSuites(
    { type: 'discover-conventional-eval-suites', projectRoot: root },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info: () => {}, warn: () => {} } },
  );
  const result = await discover();
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.suites[0]?.readyTestCaseCount, 1);
  const suite = result.definitions[0]!;
  const testCase = suite.testCases[0]!;
  assert.equal(suite.target.path, 'src/support.ts');
  assert.deepEqual(suite.runner.command, ['node', 'evals/runners/support.mjs']);
  const expected = testCase.assertions.find((assertion) => assertion.type === 'output-equals');
  const rubric = testCase.graders.find((grader) => grader.type === 'rubric');
  assert.deepEqual([
    testCase.turns[0]?.content, testCase.fixture, testCase.reference, expected?.expected, rubric?.rubric,
  ], ['inputs/lookup.txt', 'fixtures/order.json', 'references/expected.txt', 'references/expected.txt', 'rubrics/grounded.txt']
    .map((contentPath) => ({ type: 'file', path: contentPath })));

  // The validator also supports a leading evals/ prefix and normalizes it before discovery.
  await fs.writeFile(suiteFile, JSON.stringify({
    ...suite, testCases: [{ ...testCase, reference: { type: 'file', path: 'evals/references/expected.txt' } }],
  }));
  const prefixed = await discover();
  assert.equal(prefixed.status, 'ready');
  assert.deepEqual(prefixed.diagnostics, []);
  assert.deepEqual(prefixed.definitions[0]?.testCases[0]?.reference, { type: 'file', path: 'references/expected.txt' });
});

test('reference installs once for every agent and deduplicates shared selection', () => {
  for (const agents of [...SUPPORTED_AGENTS.map((agent) => [agent]), SUPPORTED_AGENTS]) {
    const targets = getWorkflowTargets('/project', agents).filter((target) => target.templateRelativePath === referencePath);
    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.targetPath, path.join('/project', targetPath));
    const rendered = renderMissingWorkflowFiles({ missingTargets: targets, overview: 'Synthetic.', selectedLanguageSkills: [], selectedFrameworkSkills: [] });
    assert.equal(rendered[0]?.contents, reference);
  }
  const skill = readTemplate('skills/eval-authoring/SKILL.md');
  assert.ok(skill.includes('(references/version-2-contract.md)'));
  const metadata = readTemplateManifest().templates[referencePath];
  assert.ok(metadata?.version);
  assert.match(metadata?.changes.join(' ') ?? '', /runner protocol/);
});

test('protocol examples and evidence define independent version, identity and ordering', () => {
  const examples = [...reference.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]!));
  assert.deepEqual(examples.slice(1, 4).map((item) => item.operation), ['describe', 'estimate', 'execute']);
  for (const item of examples.slice(1)) assert.equal(item.protocolVersion, 1);
  for (const item of examples.slice(2, 4)) {
    assert.equal(validateEvalSuiteContract({ ...example(), testCases: item.testCases }).status, 'valid');
    assert.equal(item.judgeModel, 'fake/judge');
    assert.equal(item.repeats, 2);
  }
  for (const requirement of ['judgeModels', 'costEstimation', 'targetCalls', 'judgeCalls', 'totalCalls', 'unavailable', 'runId', 'caseId', 'attempt', 'sequence', 'redaction uncertainty', 'hidden chain-of-thought', 'not a claim that dashboard', 'Sibu-owned deterministic']) {
    assert.ok(reference.includes(requirement), requirement);
  }
});
