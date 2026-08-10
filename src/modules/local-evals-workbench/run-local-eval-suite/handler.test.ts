import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runLocalEvalSuite, type RunLocalEvalSuiteDependencies } from './handler.js';
import type { EvalRunnerOutcome, RunLocalEvalSuiteLogEvent, RunnableEvalSuite } from './ports.js';

const suite: RunnableEvalSuite = {
  id: 'skill-authoring',
  name: 'Skill authoring checks',
  modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
  testCases: [{ id: 'case-1', name: 'Case 1' }, { id: 'case-2', name: 'Case 2' }],
};

describe('runLocalEvalSuite', () => {
  it('runs all ready test cases and returns a full-suite matrix', async () => {
    const calls: string[][] = [];
    const deps = dependencies({ calls });
    const result = await runLocalEvalSuite(command({ scope: { type: 'all' } }), deps);

    assert.equal(result.status, 'completed');
    if (result.status === 'completed') {
      assert.equal(result.matrix.rows.length, 2);
      assert.equal(result.matrix.aggregates.passed, 2);
    }
    assert.deepEqual(calls, [['case-1', 'case-2']]);
  });

  it('runs exactly one selected test case and returns a single merge-ready row', async () => {
    const calls: string[][] = [];
    const deps = dependencies({ calls });
    const result = await runLocalEvalSuite(command({ scope: { type: 'test_case', testCaseId: 'case-2' } }), deps);

    assert.equal(result.status, 'completed');
    if (result.status === 'completed') {
      assert.equal(result.scope, 'test_case');
      assert.deepEqual(result.matrix.rows.map((row) => row.testCaseId), ['case-2']);
    }
    assert.deepEqual(calls, [['case-2']]);
  });

  it('blocks invalid suite ids, test case ids, and unsupported models', async () => {
    assertBlockedReason(await runLocalEvalSuite(command({ suiteId: 'missing' }), dependencies({ suiteOverride: null })), 'invalid-suite-id');
    assertBlockedReason(await runLocalEvalSuite(command({ scope: { type: 'test_case', testCaseId: 'missing' } }), dependencies()), 'invalid-test-case-id');
    assertBlockedReason(await runLocalEvalSuite(command({ evalRunModel: 'unsupported' }), dependencies()), 'unsupported-model');
  });

  it('maps runner blocked outcomes into blocked results with diagnostics', async () => {
    const result = await runLocalEvalSuite(command(), dependencies({ outcome: { status: 'blocked', message: 'Add local config.', diagnostics: [{ code: 'missing-config', severity: 'warning', message: 'Config missing.' }] } }));

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'runner-blocked');
    assert.equal(result.diagnostics[0]?.code, 'missing-config');
    assert.equal(result.matrix?.status, 'error');
  });

  it('maps thrown runner failures into safe error results', async () => {
    const result = await runLocalEvalSuite(command(), dependencies({ throws: true }));

    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'runner-error');
    assert.doesNotMatch(JSON.stringify(result), /raw-output|secret|\/repo|stack/i);
  });

  it('logs safe suite, scope, test-case, and model metadata without raw outputs or project roots', async () => {
    const logs: RunLocalEvalSuiteLogEvent[] = [];
    await runLocalEvalSuite(command({ scope: { type: 'test_case', testCaseId: 'case-1' } }), dependencies({ logs }));

    const serializedLogs = JSON.stringify(logs);
    assert.match(serializedLogs, /skill-authoring|case-1|gpt-5-mini|test_case/);
    assert.doesNotMatch(serializedLogs, /raw-output|prompt|fixture|secret|\/repo/);
  });
});

function assertBlockedReason(result: Awaited<ReturnType<typeof runLocalEvalSuite>>, reason: string): void {
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, reason);
}

function command(overrides: Partial<Parameters<typeof runLocalEvalSuite>[0]> = {}): Parameters<typeof runLocalEvalSuite>[0] {
  return {
    type: 'run-local-eval-suite',
    projectRoot: '/repo',
    suiteId: 'skill-authoring',
    evalRunModel: 'gpt-5-mini',
    scope: { type: 'all' },
    ...overrides,
  };
}

function dependencies(options: {
  readonly calls?: string[][];
  readonly logs?: RunLocalEvalSuiteLogEvent[];
  readonly outcome?: EvalRunnerOutcome;
  readonly suiteOverride?: RunnableEvalSuite | null;
  readonly throws?: boolean;
} = {}): RunLocalEvalSuiteDependencies {
  const logs = options.logs ?? [];
  return {
    suiteRegistry: { findSuite: async () => options.suiteOverride === undefined ? suite : options.suiteOverride },
    evalRunner: {
      runSuite: async (request) => {
        options.calls?.push(request.testCases.map((testCase) => testCase.id));
        if (options.throws) throw new Error('raw-output secret /repo stack');
        return options.outcome ?? { status: 'completed', cells: request.testCases.map((testCase) => ({ testCaseId: testCase.id, status: 'passed', output: 'raw-output should only be normalized preview' })) };
      },
    },
    artifactStore: { storeRunArtifact: async () => undefined },
    logger: { info: (event) => logs.push(event), warn: (event) => logs.push(event), error: (event) => logs.push(event) },
    clock: () => 10,
  };
}
