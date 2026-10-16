import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import type { RuntimeDescription } from '../runtime-description.js';
import { resolveEvalRunSelection } from './handler.js';
import type { ResolveEvalRunSelectionCommand } from './command.js';

const deterministicCase: NormalizedEvalSuite['testCases'][number] = {
  id: 'deterministic', name: 'Deterministic', turns: [{ role: 'user', content: { type: 'inline', text: 'Hi' } }],
  toolMocks: [], assertions: [], graders: [],
};
const rubricCase: NormalizedEvalSuite['testCases'][number] = {
  ...deterministicCase, id: 'rubric', name: 'Rubric',
  graders: [{ id: 'judge', type: 'rubric', rubric: { type: 'inline', text: 'Score' }, threshold: 0.8 }],
};
const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Synthetic',
  defaultTestedModel: 'saved/tested', defaultJudgeModel: 'saved/judge',
  target: { id: 'target', kind: 'agent', path: 'src/target.mjs' },
  coverage: { categories: [], gaps: [] },
  runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
  testCases: [deterministicCase, rubricCase],
};
const description: RuntimeDescription = {
  runnerId: 'fake', capabilities: ['single-turn', 'rubric'],
  models: ['saved/tested', 'run/tested'], judgeModels: ['saved/judge', 'run/judge'], requiredEnvironment: [],
};
const all: ResolveEvalRunSelectionCommand = { suiteId: 'suite', scope: { type: 'all' } };
const one: ResolveEvalRunSelectionCommand = { suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'rubric' } };

function fake(saved: NormalizedEvalSuite = suite, advertised: RuntimeDescription = description) {
  let describes = 0;
  let executionCalls = 0;
  const ports = {
    suites: { load: async () => saved },
    runner: { describe: async () => { describes++; return { status: 'ready' as const, value: advertised }; } },
  };
  return { ports, calls: () => ({ describes, executionCalls }) };
}

test('independent saved tested and judge defaults resolve in source order; deterministic case omits judge', async () => {
  const context = fake();
  assert.deepEqual(await resolveEvalRunSelection(all, context.ports), {
    status: 'ready', suiteId: 'suite', cases: [
      { caseId: 'deterministic', testedModel: 'saved/tested', judgeModel: null },
      { caseId: 'rubric', testedModel: 'saved/tested', judgeModel: 'saved/judge' },
    ],
  });
  assert.deepEqual(context.calls(), { describes: 1, executionCalls: 0 });
});

test('deterministic-only scope needs no saved or advertised judge model', async () => {
  const context = fake({ ...suite, defaultJudgeModel: undefined }, { ...description, judgeModels: [] });
  assert.deepEqual(await resolveEvalRunSelection({ ...one, scope: { type: 'test_case', testCaseId: 'deterministic' } }, context.ports), {
    status: 'ready', suiteId: 'suite', cases: [{ caseId: 'deterministic', testedModel: 'saved/tested', judgeModel: null }],
  });
});

test('old unset suite defaults block before description, even with a temporary choice', async () => {
  const context = fake({ ...suite, defaultTestedModel: undefined, defaultJudgeModel: undefined });
  assert.deepEqual(await resolveEvalRunSelection({ ...one, runOnly: { testedModel: 'run/tested' } }, context.ports), {
    status: 'blocked', reason: 'missing-suite-default', suiteId: 'suite', caseId: 'rubric', role: 'tested', source: 'suite-default',
  });
  assert.deepEqual(context.calls(), { describes: 0, executionCalls: 0 });
  const missingJudge = fake({ ...suite, defaultJudgeModel: undefined });
  assert.deepEqual(await resolveEvalRunSelection(one, missingJudge.ports), {
    status: 'blocked', reason: 'missing-suite-default', suiteId: 'suite', caseId: 'rubric', role: 'judge', source: 'suite-default',
  });
});

test('unavailable saved tested or judge choice blocks without fallback after a catalog change', async () => {
  for (const [role, changed] of [
    ['tested', { ...description, models: ['run/tested'] }],
    ['judge', { ...description, judgeModels: ['run/judge'] }],
  ] as const) {
    const context = fake(suite, changed);
    const result = await resolveEvalRunSelection({ ...one, runOnly: { testedModel: 'run/tested', judgeModel: 'run/judge' } }, context.ports);
    assert.deepEqual(result, { status: 'blocked', reason: 'saved-model-unavailable', suiteId: 'suite', caseId: 'rubric', role, source: 'suite-default' });
    assert.deepEqual(context.calls(), { describes: 1, executionCalls: 0 });
  }
});

test('single-case run-only tested and judge choices are temporary and leave saved suite unchanged', async () => {
  const context = fake();
  const before = JSON.stringify(suite);
  assert.deepEqual(await resolveEvalRunSelection({ ...one, runOnly: { testedModel: 'run/tested', judgeModel: 'run/judge' } }, context.ports), {
    status: 'ready', suiteId: 'suite', cases: [{ caseId: 'rubric', testedModel: 'run/tested', judgeModel: 'run/judge' }],
  });
  assert.equal(JSON.stringify(suite), before);
  assert.deepEqual(context.calls(), { describes: 1, executionCalls: 0 });
});

test('full-suite run-only and malformed or unavailable temporary choices block with typed scope or role', async () => {
  const context = fake();
  assert.deepEqual(await resolveEvalRunSelection({ ...all, runOnly: { testedModel: 'run/tested' } }, context.ports), {
    status: 'blocked', reason: 'run-only-scope-unsupported', suiteId: 'suite',
  });
  assert.deepEqual(await resolveEvalRunSelection({ ...one, runOnly: { judgeModel: '' } }, context.ports), {
    status: 'blocked', reason: 'invalid-run-only-choice', suiteId: 'suite', caseId: 'rubric', role: 'judge', source: 'run-only',
  });
  assert.deepEqual(await resolveEvalRunSelection({ ...one, runOnly: { testedModel: 'not/advertised' } }, context.ports), {
    status: 'blocked', reason: 'run-only-model-unavailable', suiteId: 'suite', caseId: 'rubric', role: 'tested', source: 'run-only',
  });
  assert.deepEqual(context.calls(), { describes: 1, executionCalls: 0 });
});

test('nine cases resolve in order with independent tested and judge overrides; reset inherits', async () => {
  const cases: NormalizedEvalSuite['testCases'][number][] = Array.from({ length: 9 }, (_, index) => ({ ...rubricCase, id: `case-${index}` }));
  cases[4] = { ...cases[4]!, testedModel: 'run/tested' };
  cases[6] = { ...cases[6]!, judgeModel: 'run/judge' };
  const selected = { ...suite, testCases: cases };
  const ready = await resolveEvalRunSelection(all, fake(selected).ports);
  assert.equal(ready.status, 'ready');
  if (ready.status !== 'ready') return;
  assert.deepEqual(ready.cases.map(item => item.caseId), cases.map(item => item.id));
  assert.deepEqual(ready.cases.map(item => item.testedModel), cases.map((_, index) => index === 4 ? 'run/tested' : 'saved/tested'));
  assert.deepEqual(ready.cases.map(item => item.judgeModel), cases.map((_, index) => index === 6 ? 'run/judge' : 'saved/judge'));
  const reset = await resolveEvalRunSelection(all, fake({ ...selected, testCases: cases.map(item => item.id === 'case-4' ? { ...item, testedModel: undefined } : item) }).ports);
  assert.equal(reset.status, 'ready');
  if (reset.status === 'ready') assert.equal(reset.cases[4]?.testedModel, 'saved/tested');
});

test('missing or unavailable default blocks even when every case overrides; unavailable override never falls back', async () => {
  const overridden = { ...suite, testCases: [{ ...rubricCase, testedModel: 'run/tested', judgeModel: 'run/judge' }] };
  assert.deepEqual(await resolveEvalRunSelection(all, fake({ ...overridden, defaultTestedModel: undefined }).ports),
    { status: 'blocked', reason: 'missing-suite-default', suiteId: 'suite', caseId: 'rubric', role: 'tested', source: 'suite-default' });
  assert.deepEqual(await resolveEvalRunSelection(all, fake({ ...overridden, defaultJudgeModel: undefined }).ports),
    { status: 'blocked', reason: 'missing-suite-default', suiteId: 'suite', caseId: 'rubric', role: 'judge', source: 'suite-default' });
  for (const [role, changed] of [
    ['tested', { ...description, models: ['saved/tested'] }],
    ['judge', { ...description, judgeModels: ['saved/judge'] }],
  ] as const) assert.deepEqual(await resolveEvalRunSelection(all, fake(overridden, changed).ports),
    { status: 'blocked', reason: 'saved-model-unavailable', suiteId: 'suite', caseId: 'rubric', role, source: 'case-override' });
});
