import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, validateEvalSuiteContract } from '../local-evals-workbench/index.js';
import { ExecuteEventValidator } from '../local-evals-workbench/runner-process/execute-events.js';
import type { ExecutionSelection } from '../local-evals-workbench/run-execution/contracts.js';
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
  assert.equal(metadata?.version, '9');
  assert.match(metadata?.changes.join(' ') ?? '', /rubric-judge exchange records/);
});

test('distributed authoring guidance distinguishes saved full-suite and temporary one-case preview', () => {
  const skill = readTemplate('skills/eval-authoring/SKILL.md');
  const script = readTemplate('skills/eval-authoring/scripts/check-preview-contract.mjs');
  assert.match(skill, /full-suite scope, use saved suite defaults/);
  assert.match(skill, /Only a single-case check with `--case <case-id>` may add temporary/);
  assert.match(reference, /Both fields are optional for authoring and old version-2 suites without them remain valid/);
  assert.match(reference, /A required unset or unavailable suite default blocks preview\/run/);
  assert.match(reference, /sibu evals run <suite-id>` reuses valid saved choices/);
  assert.match(reference, /--case <case-id>` with `--model`/);
  assert.match(skill, /case-level `testedModel` or `judgeModel` only for an intentional override/);
  assert.match(reference, /Each test case may independently save `testedModel` and `judgeModel`/);
  assert.match(reference, /required suite default still must exist even when every selected case overrides it/);
  assert.match(reference, /explicitly \*\*Replace\*\* it.*\*\*Inherit\*\*/);
  assert.match(reference, /nine cases with suite tested default X.*eight and Y for one/);
  assert.match(reference, /actual tested and applicable Judge model for each case/);
  assert.equal(validateEvalSuiteContract({ ...example(), testCases: [
    { ...(example().testCases as Record<string, unknown>[])[0], testedModel: 'fake/alternate' },
  ] }).status, 'valid');
  assert.match(script, /values\.has\('--model'\).*values\.has\('--judge'\).*values\.has\('--case'\)/);
  assert.match(script, /runOnly:/);
  assert.doesNotMatch(script, /\/api\/eval-runs\/start|\/api\/eval-runs\/run/);
});

test('protocol examples and evidence define independent version, identity and ordering', () => {
  const examples = [...reference.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]!));
  assert.deepEqual(examples.slice(1, 3).map((item) => item.operation), ['describe', 'execute']);
  for (const item of examples.slice(1)) assert.equal(item.protocolVersion, 1);
  for (const item of examples.slice(2, 3)) {
    assert.equal(validateEvalSuiteContract({ ...example(), testCases: item.testCases }).status, 'valid');
    assert.equal(item.judgeModel, 'fake/judge');
    assert.equal('repeats' in item, false);
  }
  for (const requirement of ['judgeModels', 'runId', 'caseId', 'attempt', 'sequence', 'redaction uncertainty', 'hidden chain-of-thought', 'execute-event validator', 'Sibu-owned deterministic']) {
    assert.ok(reference.includes(requirement), requirement);
  }
});

test('distributed minimal source record passes production validator; wrong link and incomplete chunk fail', () => {
  const source = JSON.parse(reference.match(/```source-record-json\n([\s\S]*?)\n```/)![1]!) as Record<string, unknown>;
  const bytes = Buffer.from(JSON.stringify(source));
  const selected: ExecutionSelection = { runId: 'run', model: 'fake',
    suite: example() as unknown as ExecutionSelection['suite'],
    cases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hello.' } }],
      toolMocks: [], assertions: [{ id: 'exact', type: 'output-equals', expected: { type: 'inline', text: 'Hello.' } }], graders: [] }] };
  const e = (sequence: number, type: string, caseId: string | null, data: unknown) => ({
    protocolVersion: 2, requestId: 'request', sequence, type, runId: 'run', caseId, attempt: caseId ? 1 : null, data });
  const before = [e(0, 'run-started', null, { model: 'fake', judgeModel: null }),
    e(1, 'case-attempt-started', 'case', {}),
    e(2, 'conversation-turn-completed', 'case', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'Hello.' })];
  const chunk = (payload: Buffer, count = 1) => e(3, 'source-record-chunk', 'case', {
    recordId: 'call-1', index: 0, count, byteLength: bytes.length, base64: payload.toString('base64') });
  const validator = new ExecuteEventValidator('request', selected);
  for (const item of before) validator.accept(item);
  const accepted = validator.accept(chunk(bytes));
  assert.equal(accepted.type, 'source-record');
  assert.equal(validator.accept(e(4, 'case-attempt-completed', 'case', { status: 'completed', sourceEvidenceComplete: true })).type, 'case-completed');
  assert.equal(validator.accept(e(5, 'run-completed', null, { status: 'completed' })).type, 'run-completed');
  const wrong = new ExecuteEventValidator('request', selected); for (const item of before) wrong.accept(item);
  const wrongBytes = Buffer.from(JSON.stringify({ ...source, checkId: 'missing' }));
  assert.throws(() => wrong.accept(e(3, 'source-record-chunk', 'case', { recordId: 'call-1', index: 0,
    count: 1, byteLength: wrongBytes.length, base64: wrongBytes.toString('base64') })), /invalid-source-link/);
  const partial = new ExecuteEventValidator('request', selected); for (const item of before) partial.accept(item);
  partial.accept(chunk(bytes.subarray(0, 20), 2));
  assert.equal(partial.incompleteSource?.reason, 'incomplete');
  assert.throws(() => partial.accept(e(4, 'case-attempt-completed', 'case', { status: 'completed', sourceEvidenceComplete: true })));
});

test('distributed judge record passes production validator and rejects wrong links and malformed scores', () => {
  const source = JSON.parse(reference.match(/```source-record-json\n([\s\S]*?)\n```/)![1]!) as Record<string, unknown>;
  const judge = JSON.parse(reference.match(/```judge-record-json\n([\s\S]*?)\n```/)![1]!) as Record<string, unknown>;
  const selected: ExecutionSelection = { runId: 'run', model: 'fake', judgeModel: 'fake/judge',
    suite: example() as unknown as ExecutionSelection['suite'],
    cases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Hello.' } }],
      toolMocks: [], assertions: [{ id: 'exact', type: 'output-equals', expected: { type: 'inline', text: 'Hello.' } }],
      graders: [{ id: 'grounded', type: 'rubric', rubric: { type: 'inline', text: 'Report only the known status.' }, threshold: 0.8 }] }] };
  const event = (sequence: number, type: string, caseId: string | null, data: unknown) => ({
    protocolVersion: 2, requestId: 'request', sequence, type, runId: 'run', caseId, attempt: caseId ? 1 : null, data });
  const chunk = (sequence: number, record: Record<string, unknown>) => {
    const bytes = Buffer.from(JSON.stringify(record));
    return event(sequence, 'source-record-chunk', 'case', { recordId: record.id, index: 0, count: 1,
      byteLength: bytes.length, base64: bytes.toString('base64') });
  };
  const before = [event(0, 'run-started', null, { model: 'fake', judgeModel: 'fake/judge' }),
    event(1, 'case-attempt-started', 'case', {}),
    event(2, 'conversation-turn-completed', 'case', { turnIndex: 0, turnId: 'turn-1', role: 'assistant', output: 'Hello.' }),
    chunk(3, source), event(4, 'rubric-judgment-completed', 'case', { checkId: 'grounded', passed: false,
      score: 0.4, threshold: 0.8, judgeModel: 'fake/judge', evidence: 'Synthetic score', diagnostics: [] })];
  const validator = new ExecuteEventValidator('request', selected);
  for (const item of before) validator.accept(item);
  assert.equal(validator.accept(chunk(5, judge)).type, 'source-record');
  assert.equal(validator.accept(event(6, 'case-attempt-completed', 'case', {
    status: 'completed', sourceEvidenceComplete: true, judgeEvidenceComplete: true })).type, 'case-completed');
  assert.equal(validator.accept(event(7, 'run-completed', null, { status: 'completed' })).type, 'run-completed');
  for (const invalid of [{ ...judge, checkId: 'wrong' }, { ...judge, eventSequence: 3 },
    { ...judge, result: { status: 'completed', score: '0.4', threshold: 0.8, passed: false } }]) {
    const rejected = new ExecuteEventValidator('request', selected);
    for (const item of before) rejected.accept(item);
    assert.throws(() => rejected.accept(chunk(5, invalid)));
  }
  const missing = new ExecuteEventValidator('request', selected);
  for (const item of before) missing.accept(item);
  assert.throws(() => missing.accept(event(5, 'case-attempt-completed', 'case', {
    status: 'completed', sourceEvidenceComplete: true, judgeEvidenceComplete: true })), /invalid-case-end/);
  const scoreless = new ExecuteEventValidator('request', selected);
  for (const item of before.slice(0, -1)) scoreless.accept(item);
  scoreless.accept(event(4, 'rubric-judgment-error', 'case', {
    checkId: 'grounded', judgeModel: 'fake/judge', code: 'malformed-score' }));
  const errored = { ...judge, response: '{bad-score', result: { status: 'grading-error', code: 'malformed-score' } };
  assert.equal(scoreless.accept(chunk(5, errored)).type, 'source-record');
  assert.equal(scoreless.accept(event(6, 'case-attempt-completed', 'case', {
    status: 'error', sourceEvidenceComplete: true, judgeEvidenceComplete: true })).type, 'case-completed');
  assert.equal(scoreless.accept(event(7, 'run-completed', null, { status: 'error' })).type, 'run-completed');
});
