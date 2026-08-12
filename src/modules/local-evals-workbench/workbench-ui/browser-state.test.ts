import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, EvalRunStatus, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createBrowserState, createRunRequestPayload, createSelectedCellRetryPayload, failRun, finishRun, navigateResultCell, createFailureAnalysisRequestPayload, createRepairProposalRequestPayload, finishFailureAnalysis, finishRepairProposal, parseEvalRunResponse, parseFailureAnalysisResponse, parseRepairProposalResponse, resolveFocusRestoreSelection, selectActiveFailedAssertion, selectCell, startFailureAnalysis, startRepairProposal, selectModel, selectRunScope, selectSuite, setFailuresOnly, setSearchQuery, setVisibleVariantIds, startRun, type BrowserState } from './browser-state.js';
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


  it('defaults failed cells to first assertion and switches active assertion scope', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    const switched = selectActiveFailedAssertion(selected, 'a2');

    assert.equal(selected.selectedCell?.activeAssertionId, 'a1');
    assert.equal(selected.activeConversationScopeKey, 'skill-authoring:missing-skill-boundary:gpt-5-mini:a1');
    assert.equal(switched.selectedCell?.testCaseId, 'missing-skill-boundary');
    assert.equal(switched.selectedCell?.modelId, 'gpt-5-mini');
    assert.equal(switched.selectedCell?.activeAssertionId, 'a2');
    assert.equal(switched.activeConversationScopeKey, 'skill-authoring:missing-skill-boundary:gpt-5-mini:a2');
    assert.equal(switched.viewModel.resultDisplay.selectedCell?.failureWorkbench?.activeEvidence.label, 'B');
  });

  it('avoids active assertion state for non-failed selected cells', () => {
    const selected = selectCell(initialState(), { testCaseId: 'names-artifact', modelId: 'gpt-5-mini' }, 'desktop');

    assert.equal(selected.selectedCell?.activeAssertionId, undefined);
    assert.equal(selected.activeConversationScopeKey, null);
    assert.equal(selected.viewModel.resultDisplay.selectedCell?.failureWorkbench, null);
  });


  it('builds single active assertion analysis payload and resets analysis when assertion changes', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    const loading = startFailureAnalysis(selected);
    const ready = finishFailureAnalysis(loading, analysisReady('a1'));
    const switched = selectActiveFailedAssertion(ready, 'a2');

    assert.deepEqual(createFailureAnalysisRequestPayload(selected), { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1' });
    assert.equal(loading.analysis.status, 'loading');
    assert.equal(ready.analysis.status, 'ready');
    assert.equal(switched.activeConversationScopeKey, 'skill-authoring:missing-skill-boundary:gpt-5-mini:a2');
    assert.equal(switched.analysis.status, 'idle');
  });

  it('tracks unavailable and endpoint error analysis without affecting evidence inspection', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    const unavailable = finishFailureAnalysis(selected, { status: 'analysis-unavailable', reason: 'missing-openai-api-key', message: 'Analysis unavailable', setupGuidance: ['Set OPENAI_API_KEY.'], assistanceModelLabel: 'gpt-5-mini' });
    const error = finishFailureAnalysis(selected, parseFailureAnalysisResponse({ nope: true }));

    assert.equal(unavailable.analysis.status, 'unavailable');
    assert.equal(unavailable.viewModel.resultDisplay.selectedCell?.failureWorkbench?.activeEvidence.assertionId, 'a1');
    assert.equal(error.analysis.status, 'error');
    assert.equal(createFailureAnalysisRequestPayload(initialState()), null);
  });


  it('builds active assertion proposal payload, tracks preview states, and resets when assertion changes', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    const drafting = startRepairProposal(selected);
    const ready = finishRepairProposal(drafting, proposalReady());
    const switched = selectActiveFailedAssertion(ready, 'a2');

    assert.deepEqual(createRepairProposalRequestPayload(selected, { type: 'prompt_issue' }), { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1', repairDirection: { type: 'prompt_issue' }, priorAnalysis: undefined });
    assert.equal(drafting.proposal.status, 'drafting');
    assert.equal(ready.proposal.status, 'ready');
    if (ready.proposal.status === 'ready') assert.equal(ready.proposal.result.proposal.approvalState, 'pending');
    assert.equal(switched.proposal.status, 'idle');
  });

  it('tracks unavailable, rejected, unsafe blocker, and endpoint error proposal states', () => {
    const selected = selectCell(initialState(), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini' }, 'desktop');
    assert.equal(finishRepairProposal(selected, { status: 'proposal-unavailable', reason: 'missing-openai-api-key', message: 'Proposal unavailable', setupGuidance: ['Set OPENAI_API_KEY.'], assistanceModelLabel: 'gpt-5-mini' }).proposal.status, 'unavailable');
    assert.equal(finishRepairProposal(selected, { status: 'proposal-rejected', reason: 'vague-proposal', message: 'Too vague.', assistanceModelLabel: 'gpt-5-mini' }).proposal.status, 'rejected');
    assert.equal(finishRepairProposal(selected, { status: 'blocked', reason: 'unsafe-target-files', message: 'Unsafe target.' }).proposal.status, 'rejected');
    assert.equal(finishRepairProposal(selected, parseRepairProposalResponse({ nope: true })).proposal.status, 'error');
    assert.equal(createRepairProposalRequestPayload(initialState(), { type: 'prompt_issue' }), null);
  });

  it('builds selected-cell retry payload for the current suite, cell model, and test case scope', () => {
    const state = selectCell(setVisibleVariantIds(initialState(), ['gpt-5-mini', 'gpt-5']), { testCaseId: 'missing-skill-boundary', modelId: 'gpt-5' }, 'desktop');

    assert.deepEqual(createSelectedCellRetryPayload(state), { suiteId: 'skill-authoring', evalRunModel: 'gpt-5', scope: { type: 'test_case', testCaseId: 'missing-skill-boundary' } });
    assert.equal(createSelectedCellRetryPayload(initialState()), null);
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
  return { testCaseId, modelId, modelLabel: modelId, status, outputPreview: null, assertions: [{ id: 'a1', label: 'A', kind: 'assertion', status, metrics: [], diagnostics: [], artifacts: [] }, { id: 'a2', label: 'B', kind: 'grader', status: status === 'failed' ? 'failed' : 'passed', actualPreview: 'second actual', expectedPreview: 'second expected', metrics: [], diagnostics: [], artifacts: [] }], diagnostics: [], metrics: [], artifacts: [], durationMs: null };
}

function blockedRun(): RunLocalEvalSuiteResult {
  return { status: 'blocked', reason: 'runner-blocked', message: 'Runner blocked.', diagnostics: [] };
}


function analysisReady(assertionId: string) {
  return { status: 'analysis-ready' as const, assistanceModelLabel: 'gpt-5-mini', evidence: { suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'gpt-5-mini', assertionId, assertionLabel: 'A', assertionKind: 'assertion' as const, assertionMessage: 'Failed.', actualOutputPreview: 'actual', expectedPreview: 'expected', cellOutputPreview: null, diagnostics: [], artifacts: [] }, analysis: { exactFailureExplanation: 'Failed.', likelyCause: 'prompt_issue' as const, evidenceSummary: 'Evidence.', uncertainty: 'Low.' } };
}


function proposalReady() {
  return { status: 'proposal-ready' as const, assistanceModelLabel: 'gpt-5-mini', evidence: analysisReady('a1').evidence, proposal: { proposalId: 'repair_1', affectedProjectFiles: ['prompts/skill.md'], changeSummary: 'Add hard stop rule.', rationale: 'The active failure skipped the rule.', expectedEvalImpact: 'The selected assertion should pass.', proposedChange: { kind: 'instructions' as const, representation: 'Add rule.' }, approvalState: 'pending' as const } };
}
