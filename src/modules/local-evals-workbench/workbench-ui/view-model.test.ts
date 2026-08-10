import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createWorkbenchViewModel } from './view-model.js';

describe('createWorkbenchViewModel', () => {
  it('creates a ready summary with default suite and model', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery() });

    assert.equal(viewModel.status, 'ready');
    assert.equal(viewModel.statusLabel, 'Ready');
    assert.equal(viewModel.selectedSuite.id, 'skill-authoring');
    assert.equal(viewModel.selectedEvalRunModel, 'gpt-5-mini');
    assert.equal(viewModel.runButtonLabel, 'Run all 2 test cases');
    assert.deepEqual(viewModel.summary, { passRateLabel: '—', averageLatencyLabel: '—', totalCostLabel: '$0.0000' });
    assert.equal(viewModel.progress.label, '0/2 complete');
  });

  it('preserves valid selected suite and model, and falls back from invalid model', () => {
    const selected = createWorkbenchViewModel({ discovery: readyDiscovery(), selectedSuiteId: 'prompt-drift', selectedEvalRunModel: 'gpt-5' });
    const fallback = createWorkbenchViewModel({ discovery: readyDiscovery(), selectedSuiteId: 'prompt-drift', selectedEvalRunModel: 'missing' });

    assert.equal(selected.selectedSuite.name, 'Prompt drift checks');
    assert.equal(selected.selectedEvalRunModel, 'gpt-5');
    assert.equal(fallback.selectedEvalRunModel, 'gpt-5-mini');
  });

  it('creates a running status summary and disables controls', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery(), isRunning: true });

    assert.equal(viewModel.status, 'running');
    assert.equal(viewModel.statusLabel, 'Running...');
    assert.equal(viewModel.runButtonLabel, 'Running...');
    assert.equal(viewModel.controlsDisabled, true);
  });

  it('summarizes passed run results', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun('passed') });

    assert.equal(viewModel.status, 'passed');
    assert.equal(viewModel.statusLabel, 'Passed');
    assert.equal(viewModel.summary.passRateLabel, '100%');
    assert.equal(viewModel.summary.averageLatencyLabel, '150 ms');
    assert.equal(viewModel.summary.totalCostLabel, '$0.0300');
    assert.equal(viewModel.progress.percent, 100);
  });

  it('summarizes failed, blocked, and error run states', () => {
    assert.equal(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun('failed') }).statusLabel, 'Failed');
    assert.equal(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: blockedRun() }).statusMessage, 'Selected test case was not found.');
    assert.equal(createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: errorRun() }).statusLabel, 'Could not run');
  });

  it('surfaces blocked discovery diagnostics', () => {
    const viewModel = createWorkbenchViewModel({ discovery: blockedDiscovery() });

    assert.equal(viewModel.status, 'blocked');
    assert.equal(viewModel.statusMessage, 'No conventional evals folder was found.');
    assert.equal(viewModel.controlsDisabled, true);
    assert.equal(viewModel.diagnostics[0]?.message, 'Project does not contain a root evals/ folder.');
  });

  it('uses one-test-case run button copy', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery(), runScope: { type: 'test_case', testCaseId: 'missing-skill-boundary' } });

    assert.equal(viewModel.runButtonLabel, 'Run 1 test case');
  });
});

function readyDiscovery(): EvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    suites: [
      { id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
      { id: 'prompt-drift', name: 'Prompt drift checks', description: 'Checks prompt behavior.', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }, { id: 'gpt-5', label: 'GPT-5' }] },
    ],
    diagnostics: [],
  };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return {
    status: 'blocked',
    reason: 'missing-evals-folder',
    message: 'No conventional evals folder was found.',
    guidance: ['Add evals.'],
    suites: [],
    diagnostics: [{ code: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Project does not contain a root evals/ folder.' }],
  };
}

function completedRun(status: 'passed' | 'failed' | 'blocked' | 'error'): RunLocalEvalSuiteResult {
  return {
    status: 'completed',
    scope: 'all',
    matrix: {
      suiteId: 'skill-authoring',
      suiteName: 'Skill authoring checks',
      status,
      aggregates: { total: 2, passed: status === 'passed' ? 2 : 1, failed: status === 'failed' ? 1 : 0, blocked: status === 'blocked' ? 1 : 0, error: status === 'error' ? 1 : 0 },
      diagnostics: [],
      rows: [
        { testCaseId: 'a', name: 'A', status: 'passed', cells: [cell('a', 'passed', 100, 0.01)] },
        { testCaseId: 'b', name: 'B', status, cells: [cell('b', status, 200, 0.02)] },
      ],
    },
  };
}

function cell(testCaseId: string, status: 'passed' | 'failed' | 'blocked' | 'error', durationMs: number, cost: number) {
  return { testCaseId, modelId: 'gpt-5-mini', modelLabel: 'GPT-5 mini', status, outputPreview: null, assertions: [], diagnostics: [], metrics: [{ name: 'total_cost', value: cost, unit: 'usd' }], artifacts: [], durationMs };
}

function blockedRun(): RunLocalEvalSuiteResult {
  return { status: 'blocked', reason: 'invalid-test-case-id', message: 'Selected test case was not found.', diagnostics: [{ code: 'invalid-test-case-id', severity: 'error', message: 'Choose one of the suite test cases.' }] };
}

function errorRun(): RunLocalEvalSuiteResult {
  return { status: 'error', reason: 'runner-error', message: 'Eval runner failed before producing a complete result.', diagnostics: [{ code: 'runner-error', severity: 'error', message: 'Review local setup.' }] };
}
