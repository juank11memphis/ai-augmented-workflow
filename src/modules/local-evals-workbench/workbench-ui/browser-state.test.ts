import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, EvalRunStatus, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createBrowserState, createRunRequestPayload, failRun, finishRun, navigateResultCell, parseEvalRunResponse, resolveFocusRestoreSelection, selectCell, selectModel, selectRunScope, selectSuite, setFailuresOnly, setSearchQuery, setVisibleVariantIds, startRun, type BrowserState } from './browser-state.js';
import { createWorkbenchViewModel } from './view-model.js';

describe('browser-state', () => {
  it('resets display state when changing suite', () => {
    const state = selectSuite(selectCell(initialState(), { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, 'desktop'), 'prompt-drift');

    assert.equal(state.viewModel.selectedSuite.id, 'prompt-drift');
    assert.deepEqual(state.viewModel.runScope, { type: 'all' });
    assert.equal(state.selectedCell, null);
    assert.equal(state.latestRun, undefined);
  });

  it('updates model and run scope without changing display filters', () => {
    const filtered = setFailuresOnly(initialState(), true);
    const state = selectRunScope(selectModel(filtered, 'gpt-5'), { type: 'test_case', testCaseId: 'names-artifact' });

    assert.equal(state.viewModel.selectedEvalRunModel, 'gpt-5');
    assert.deepEqual(state.viewModel.runScope, { type: 'test_case', testCaseId: 'names-artifact' });
    assert.equal(state.resultFilters.failuresOnly, true);
  });

  it('builds run request payloads independent of display filters', () => {
    const state = setSearchQuery(selectRunScope(initialState(), { type: 'test_case', testCaseId: 'names-artifact' }), 'boundary');

    assert.deepEqual(createRunRequestPayload(state), { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'names-artifact' } });
  });

  it('toggles failures-only, search, and variant visibility safely', () => {
    const state = setVisibleVariantIds(setSearchQuery(setFailuresOnly(initialState(), true), 'boundary'), []);

    assert.equal(state.resultFilters.failuresOnly, true);
    assert.equal(state.resultFilters.searchQuery, 'boundary');
    assert.deepEqual(state.resultFilters.visibleVariantIds, ['gpt-5-mini']);
    assert.deepEqual(state.viewModel.resultDisplay.rows.map((row) => row.testCaseId), ['missing-skill-boundary']);
  });

  it('tracks selected cells, clears them, and restores nearest visible focus', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    const filteredAway = setSearchQuery(selected, 'names');

    assert.equal(selected.selectedCell?.testCaseId, 'missing-skill-boundary');
    assert.equal(selected.focusRestoreKey, 'missing-skill-boundary:gpt-5-mini:desktop');
    assert.equal(filteredAway.selectedCell, null);
    assert.deepEqual(resolveFocusRestoreSelection(filteredAway, 'desktop'), { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' });
  });

  it('navigates only visible cells and returns null at boundaries', () => {
    const state = setVisibleVariantIds(initialState(), ['gpt-5-mini', 'gpt-5']);

    assert.deepEqual(navigateResultCell(state, { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, 'right', 'desktop'), { testCaseId: 'names-artifact', modelId: 'gpt-5' });
    assert.deepEqual(navigateResultCell(setVisibleVariantIds(state, ['gpt-5-mini']), { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, 'down', 'desktop'), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' });
    assert.equal(navigateResultCell(state, { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, 'up', 'phone'), null);
  });

  it('transitions ready to running, passed, blocked, and error summaries', () => {
    const running = startRun(initialState());

    assert.equal(running.viewModel.runButtonLabel, 'Running...');
    assert.equal(finishRun(running, completedRun('passed')).viewModel.status, 'passed');
    assert.equal(finishRun(running, blockedRun()).viewModel.status, 'blocked');
    assert.equal(failRun(running).viewModel.status, 'error');
  });

  it('turns malformed endpoint responses into explicit errors', () => {
    const parsed = parseEvalRunResponse({ nope: true });

    assert.equal(parsed.status, 'error');
    assert.equal(parsed.diagnostics[0]?.code, 'invalid-eval-run-response');
  });
});

function initialState(runScope: { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string } = { type: 'all' }): BrowserState {
  const latestRun = completedRun('failed');
  return createBrowserState(createWorkbenchViewModel({ discovery: discovery(), runScope, latestRun }), latestRun);
}

function discovery(): EvalSuiteDiscoveryResult {
  return { status: 'ready', suites: [
    { id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }, { id: 'gpt-5', label: 'GPT-5' }] },
    { id: 'prompt-drift', name: 'Prompt drift checks', description: 'Checks prompt drift.', readyTestCaseCount: 1, modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
  ], diagnostics: [] };
}

function completedRun(status: EvalRunStatus): RunLocalEvalSuiteResult & { status: 'completed' } {
  return { status: 'completed', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill authoring checks', status, aggregates: { total: 4, passed: 2, failed: status === 'failed' ? 2 : 0, blocked: 0, error: 0 }, diagnostics: [], rows: [
    { testCaseId: 'names-artifact', name: 'Names artifact', status: 'passed', cells: [cell('names-artifact', 'gpt-5-mini', 'passed'), cell('names-artifact', 'gpt-5', 'passed')] },
    { testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status, cells: [cell('missing-skill-boundary', 'gpt-5-mini', status), cell('missing-skill-boundary', 'gpt-5', 'passed')] },
  ] } };
}

function cell(testCaseId: string, modelId: string, status: EvalRunStatus): EvalCell {
  return { testCaseId, modelId, modelLabel: modelId, status, outputPreview: null, assertions: [{ id: 'a1', label: 'A', kind: 'assertion', status, metrics: [], diagnostics: [], artifacts: [] }], diagnostics: [], metrics: [], artifacts: [], durationMs: null };
}

function blockedRun(): RunLocalEvalSuiteResult {
  return { status: 'blocked', reason: 'runner-blocked', message: 'Runner blocked.', diagnostics: [] };
}
