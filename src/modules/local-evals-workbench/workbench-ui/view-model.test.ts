import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, EvalRunStatus, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createCellKey, createResultDisplay, createWorkbenchViewModel, findNextResultCellSelection } from './view-model.js';

describe('createWorkbenchViewModel', () => {
  it('creates a ready summary with default suite and model', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery() });

    assert.equal(viewModel.status, 'ready');
    assert.equal(viewModel.selectedSuite.id, 'skill-authoring');
    assert.equal(viewModel.selectedEvalRunModel, 'gpt-5-mini');
    assert.equal(viewModel.runButtonLabel, 'Run all 2 test cases');
    assert.deepEqual(viewModel.summary, { passRateLabel: '—', averageLatencyLabel: '—', totalCostLabel: '$0.0000' });
    assert.equal(viewModel.resultDisplay.emptyMessage, 'Run evals to see result cards and the matrix.');
  });

  it('summarizes completed run results and cell display details', () => {
    const viewModel = createWorkbenchViewModel({ discovery: readyDiscovery(), latestRun: completedRun('failed') });
    const failedCell = viewModel.resultDisplay.rows[1]?.cells[0];

    assert.equal(viewModel.statusLabel, 'Failed');
    assert.equal(viewModel.summary.averageLatencyLabel, '150 ms');
    assert.equal(viewModel.summary.totalCostLabel, '$0.0500');
    assert.equal(failedCell?.statusLabel, 'Failed');
    assert.equal(failedCell?.assertionSummary, '1 failed / 2');
    assert.equal(failedCell?.metricsSummary, '200 ms · 1,200 tokens · $0.0200');
    assert.equal(failedCell?.outputPreview, 'Output says the skill may continue.');
    assert.equal(failedCell?.diagnosticsSummary, 'Assertion failed: must stop first.');
  });


  it('builds passed selected-cell detail with assertions, metrics, output, and artifacts', () => {
    const display = createResultDisplay(completedRun('passed').matrix, {}, { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' });
    const detail = display.selectedCell;

    assert.equal(detail?.title, 'Passed result');
    assert.equal(detail?.description, 'Passed · GPT-5 mini · names-artifact');
    assert.equal(detail?.sections.find((section) => section.title === 'Assertions')?.items[0]?.label, 'Passed: Must hard-stop first');
    assert.equal(detail?.sections.find((section) => section.title === 'Raw artifacts')?.items[0]?.value, 'raw output preview');
    assert.equal(detail?.retryActionLabel, null);
  });

  it('builds selected-cell detail for running, blocked, error, and not-run states', () => {
    const matrix = completedRun('blocked').matrix;
    const rows = [
      rowWithCell('running-case', 'Running case', uiCell('running-case', 'gpt-5-mini', 'running')),
      rowWithCell('blocked-case', 'Blocked case', uiCell('blocked-case', 'gpt-5-mini', 'blocked')),
      rowWithCell('error-case', 'Error case', uiCell('error-case', 'gpt-5-mini', 'error')),
      rowWithCell('not-run-case', 'Not run case', uiCell('not-run-case', 'gpt-5-mini', 'not-run')),
    ];
    const displayMatrix = { ...matrix, rows } as typeof matrix;

    const running = createResultDisplay(displayMatrix, {}, { testCaseId: 'running-case', modelId: 'gpt-5-mini' }).selectedCell;
    const blocked = createResultDisplay(displayMatrix, {}, { testCaseId: 'blocked-case', modelId: 'gpt-5-mini' }).selectedCell;
    const error = createResultDisplay(displayMatrix, {}, { testCaseId: 'error-case', modelId: 'gpt-5-mini' }).selectedCell;
    const notRun = createResultDisplay(displayMatrix, {}, { testCaseId: 'not-run-case', modelId: 'gpt-5-mini' }).selectedCell;

    assert.equal(running?.recoveryGuidance, 'Wait for this run to finish.');
    assert.equal(running?.sections[0]?.emptyMessage, 'Running local evals. Details will appear when this run finishes.');
    assert.equal(blocked?.recoveryGuidance, 'Add local config, then run the eval again.');
    assert.equal(blocked?.sections.find((section) => section.title === 'Diagnostics')?.items[0]?.value, 'Diagnostic for blocked-case');
    assert.equal(error?.retryActionLabel, 'Try again');
    assert.equal(error?.recoveryGuidance, 'Try again after checking local setup.');
    assert.equal(notRun?.sections[0]?.emptyMessage, 'Output will appear after running the eval.');
  });

  it('filters failures, searches test case names and ids, and hides non-selected variants', () => {
    const matrix = completedRun('failed').matrix;
    const display = createResultDisplay(matrix, { failuresOnly: true, searchQuery: 'boundary', visibleVariantIds: ['gpt-5-mini'] });

    assert.deepEqual(display.visibleVariants.map((variant) => variant.id), ['gpt-5-mini']);
    assert.deepEqual(display.rows.map((row) => row.testCaseId), ['missing-skill-boundary']);
    assert.equal(display.rows[0]?.cells.length, 1);
    assert.equal(display.rows[0]?.cells[0]?.modelId, 'gpt-5-mini');
  });

  it('preserves at least one visible variant when all variants are hidden', () => {
    const display = createResultDisplay(completedRun('failed').matrix, { visibleVariantIds: [] });

    assert.deepEqual(display.filters.visibleVariantIds, ['gpt-5-mini']);
    assert.equal(display.visibleVariants.length, 1);
  });

  it('finds selected cells and stable cell keys', () => {
    const display = createResultDisplay(completedRun('failed').matrix, {}, { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' });

    assert.equal(display.selectedCell?.key, 'missing-skill-boundary:gpt-5-mini');
    assert.equal(createCellKey({ testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop'), 'missing-skill-boundary:gpt-5-mini:desktop');
  });

  it('returns expected next cells for desktop and phone navigation', () => {
    const rows = createResultDisplay(completedRun('failed').matrix, { visibleVariantIds: ['gpt-5-mini', 'gpt-5'] }).rows;

    assert.deepEqual(findNextResultCellSelection({ rows, current: { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, direction: 'right', mode: 'desktop' }), { testCaseId: 'names-artifact', modelId: 'gpt-5' });
    assert.deepEqual(findNextResultCellSelection({ rows, current: { testCaseId: 'names-artifact', modelId: 'gpt-5' }, direction: 'down', mode: 'desktop' }), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5' });
    assert.deepEqual(findNextResultCellSelection({ rows, current: { testCaseId: 'names-artifact', modelId: 'gpt-5' }, direction: 'down', mode: 'phone' }), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' });
    assert.equal(findNextResultCellSelection({ rows, current: { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, direction: 'up', mode: 'desktop' }), null);
  });

  it('summarizes blocked discovery diagnostics', () => {
    const viewModel = createWorkbenchViewModel({ discovery: blockedDiscovery() });

    assert.equal(viewModel.status, 'blocked');
    assert.equal(viewModel.controlsDisabled, true);
    assert.equal(viewModel.diagnostics[0]?.message, 'Project does not contain a root evals/ folder.');
  });
});

function readyDiscovery(): EvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    suites: [
      { id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }, { id: 'gpt-5', label: 'GPT-5' }] },
      { id: 'prompt-drift', name: 'Prompt drift checks', description: 'Checks prompt behavior.', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
    ],
    diagnostics: [],
  };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return { status: 'blocked', reason: 'missing-evals-folder', message: 'No conventional evals folder was found.', guidance: ['Add evals.'], suites: [], diagnostics: [{ code: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Project does not contain a root evals/ folder.' }] };
}

function completedRun(status: EvalRunStatus): RunLocalEvalSuiteResult & { status: 'completed' } {
  return {
    status: 'completed',
    scope: 'all',
    matrix: {
      suiteId: 'skill-authoring',
      suiteName: 'Skill authoring checks',
      status,
      aggregates: { total: 4, passed: status === 'passed' ? 4 : 2, failed: status === 'failed' ? 2 : 0, blocked: status === 'blocked' ? 2 : 0, error: status === 'error' ? 2 : 0 },
      diagnostics: [],
      rows: [
        { testCaseId: 'names-artifact', name: 'Names artifact', status: 'passed', cells: [cell('names-artifact', 'gpt-5-mini', 'passed', 100, 0.01), cell('names-artifact', 'gpt-5', 'passed', 120, 0.01)] },
        { testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status, cells: [cell('missing-skill-boundary', 'gpt-5-mini', status, 200, 0.02), cell('missing-skill-boundary', 'gpt-5', 'passed', 180, 0.01)] },
      ],
    },
  };
}

function rowWithCell(testCaseId: string, name: string, evalCell: EvalCell) {
  return { testCaseId, name, status: evalCell.status, cells: [evalCell] };
}

function uiCell(testCaseId: string, modelId: string, status: EvalRunStatus | 'running' | 'not-run'): EvalCell {
  return { ...cell(testCaseId, modelId, status === 'running' || status === 'not-run' ? 'blocked' : status, 0, 0), status, outputPreview: null, assertions: [], diagnostics: [{ code: 'diag', severity: status === 'error' ? 'error' : 'warning', message: `Diagnostic for ${testCaseId}` }] } as unknown as EvalCell;
}

function cell(testCaseId: string, modelId: string, status: EvalRunStatus, durationMs: number, cost: number): EvalCell {
  return {
    testCaseId,
    modelId,
    modelLabel: modelId === 'gpt-5' ? 'GPT-5' : 'GPT-5 mini',
    status,
    outputPreview: status === 'failed' ? 'Output says the skill may continue.' : 'Output follows the requested boundary.',
    assertions: [
      { id: 'a1', label: 'Must hard-stop first', kind: 'assertion', status, message: status === 'failed' ? 'Assertion failed: must stop first.' : 'Passed.', metrics: [], diagnostics: [], artifacts: [] },
      { id: 'a2', label: 'Must name artifact', kind: 'assertion', status: 'passed', metrics: [], diagnostics: [], artifacts: [] },
    ],
    diagnostics: status === 'failed' ? [{ code: 'assertion-failed', severity: 'error', message: 'Assertion failed: must stop first.' }] : [],
    metrics: [{ name: 'total_cost', value: cost, unit: 'usd' }, { name: 'total_tokens', value: 1200 }],
    artifacts: [{ id: 'raw-output', label: 'Raw output', kind: 'file', preview: 'raw output preview', reference: 'artifacts/result.json' }],
    durationMs,
  };
}
