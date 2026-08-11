import type { AnalyzeFailedAssertionResult } from '../analyze-failed-assertion/result.js';
import type { RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import {
  createCellKey,
  createWorkbenchViewModel,
  findNextResultCellSelection,
  normalizeResultFilters,
  type ResultMatrixNavigationDirection,
  type ResultMatrixNavigationMode,
  type WorkbenchCellSelection,
  type WorkbenchResultFilters,
  type WorkbenchRunScope,
  type WorkbenchViewModel,
} from './view-model.js';

export type BrowserState = {
  readonly viewModel: WorkbenchViewModel;
  readonly latestRun?: RunLocalEvalSuiteResult;
  readonly resultFilters: WorkbenchResultFilters;
  readonly selectedCell: WorkbenchCellSelection | null;
  readonly activeConversationScopeKey: string | null;
  readonly focusRestoreKey: string | null;
  readonly analysis: FailureAnalysisState;
};

export type FailureAnalysisState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly scopeKey: string }
  | { readonly status: 'ready'; readonly scopeKey: string; readonly result: AnalyzeFailedAssertionResult & { readonly status: 'analysis-ready' } }
  | { readonly status: 'unavailable'; readonly scopeKey: string; readonly result: AnalyzeFailedAssertionResult & { readonly status: 'analysis-unavailable' } }
  | { readonly status: 'error'; readonly scopeKey: string; readonly message: string };

export type EvalRunRequestPayload = {
  readonly suiteId: string;
  readonly evalRunModel: string;
  readonly scope: WorkbenchRunScope;
};

export function createBrowserState(viewModel: WorkbenchViewModel, latestRun?: RunLocalEvalSuiteResult): BrowserState {
  return { viewModel, latestRun, resultFilters: viewModel.resultDisplay.filters, selectedCell: null, activeConversationScopeKey: null, focusRestoreKey: null, analysis: { status: 'idle' } };
}

export function selectSuite(state: BrowserState, suiteId: string): BrowserState {
  const viewModel = createWorkbenchViewModel({ discovery: state.viewModel.bootstrappedState.discovery, selectedSuiteId: suiteId, runScope: { type: 'all' } });
  return createBrowserState(viewModel);
}

export function selectModel(state: BrowserState, selectedEvalRunModel: string): BrowserState {
  return rebuildState({ ...state, selectedCell: null, activeConversationScopeKey: null, focusRestoreKey: null }, { selectedEvalRunModel });
}

export function selectRunScope(state: BrowserState, runScope: WorkbenchRunScope): BrowserState {
  return rebuildState(state, { runScope });
}

export function setFailuresOnly(state: BrowserState, failuresOnly: boolean): BrowserState {
  return rebuildFilteredState(state, { ...state.resultFilters, failuresOnly });
}

export function setSearchQuery(state: BrowserState, searchQuery: string): BrowserState {
  return rebuildFilteredState(state, { ...state.resultFilters, searchQuery });
}

export function setVisibleVariantIds(state: BrowserState, visibleVariantIds: readonly string[]): BrowserState {
  return rebuildFilteredState(state, { ...state.resultFilters, visibleVariantIds });
}

export function selectCell(state: BrowserState, selection: WorkbenchCellSelection, mode: ResultMatrixNavigationMode): BrowserState {
  return rebuildState({ ...state, selectedCell: withoutActiveAssertion(selection), activeConversationScopeKey: null, focusRestoreKey: createCellKey(selection, mode) });
}

export function clearSelectedCell(state: BrowserState, mode: ResultMatrixNavigationMode): BrowserState {
  const focusRestoreKey = state.selectedCell ? state.focusRestoreKey ?? createCellKey(state.selectedCell, mode) : state.focusRestoreKey;
  return rebuildState({ ...state, selectedCell: null, activeConversationScopeKey: null, focusRestoreKey });
}

export function resolveFocusRestoreSelection(state: BrowserState, mode: ResultMatrixNavigationMode): WorkbenchCellSelection | null {
  const fromKey = state.focusRestoreKey ? parseCellKey(state.focusRestoreKey) : null;
  if (fromKey && isVisibleCell(state, fromKey)) return fromKey;
  const firstRow = state.viewModel.resultDisplay.rows[0];
  const firstCell = firstRow?.cells[0];
  return firstCell ? { testCaseId: firstCell.testCaseId, modelId: firstCell.modelId } : null;
}

export function navigateResultCell(state: BrowserState, current: WorkbenchCellSelection, direction: ResultMatrixNavigationDirection, mode: ResultMatrixNavigationMode): WorkbenchCellSelection | null {
  return findNextResultCellSelection({ rows: state.viewModel.resultDisplay.rows, current, direction, mode });
}

export function startRun(state: BrowserState): BrowserState {
  return rebuildState({ ...state, selectedCell: null, activeConversationScopeKey: null, focusRestoreKey: null }, { isRunning: true });
}

export function finishRun(state: BrowserState, latestRun: RunLocalEvalSuiteResult): BrowserState {
  const resultFilters = normalizeResultFilters(latestRun.matrix, state.resultFilters);
  const next = rebuildState({ ...state, latestRun, resultFilters, selectedCell: null, activeConversationScopeKey: null, focusRestoreKey: null }, { latestRun });
  return { ...next, latestRun };
}

export function failRun(state: BrowserState, message = 'The eval could not finish. Try again after checking local setup.'): BrowserState {
  return finishRun(state, { status: 'error', reason: 'runner-error', message, diagnostics: [{ code: 'browser-run-error', severity: 'error', message }] });
}

export function createRunRequestPayload(state: BrowserState): EvalRunRequestPayload {
  return { suiteId: state.viewModel.selectedSuite.id, evalRunModel: state.viewModel.selectedEvalRunModel, scope: state.viewModel.runScope };
}

export function createSelectedCellRetryPayload(state: BrowserState): EvalRunRequestPayload | null {
  if (!state.selectedCell) return null;
  return {
    suiteId: state.viewModel.selectedSuite.id,
    evalRunModel: state.selectedCell.modelId,
    scope: { type: 'test_case', testCaseId: state.selectedCell.testCaseId },
  };
}


export function startFailureAnalysis(state: BrowserState): BrowserState {
  if (!state.activeConversationScopeKey) return state;
  return { ...state, analysis: { status: 'loading', scopeKey: state.activeConversationScopeKey } };
}

export function finishFailureAnalysis(state: BrowserState, result: AnalyzeFailedAssertionResult): BrowserState {
  const scopeKey = state.activeConversationScopeKey;
  if (!scopeKey) return { ...state, analysis: { status: 'idle' } };
  if (result.status === 'analysis-ready') return { ...state, analysis: { status: 'ready', scopeKey, result } };
  if (result.status === 'analysis-unavailable') return { ...state, analysis: { status: 'unavailable', scopeKey, result } };
  return { ...state, analysis: { status: 'error', scopeKey, message: result.message } };
}

export function createFailureAnalysisRequestPayload(state: BrowserState): unknown | null {
  const workbench = state.viewModel.resultDisplay.selectedCell?.failureWorkbench;
  if (!workbench || !state.selectedCell) return null;
  return {
    suiteId: state.viewModel.selectedSuite.id,
    testCaseId: state.selectedCell.testCaseId,
    evalRunModelId: state.selectedCell.modelId,
    runScope: state.viewModel.runScope,
    assertionId: workbench.activeEvidence.assertionId,
  };
}

export function parseFailureAnalysisResponse(payload: unknown): AnalyzeFailedAssertionResult {
  if (!isRecord(payload) || typeof payload.status !== 'string') return invalidAnalysisResponse();
  if (payload.status === 'analysis-ready' || payload.status === 'analysis-unavailable' || payload.status === 'blocked' || payload.status === 'error') return payload as AnalyzeFailedAssertionResult;
  return invalidAnalysisResponse();
}

export function parseEvalRunResponse(payload: unknown): RunLocalEvalSuiteResult {
  if (!isRecord(payload) || typeof payload.status !== 'string') return invalidResponse();
  if (payload.status === 'completed' && isRecord(payload.matrix)) return payload as RunLocalEvalSuiteResult;
  if (payload.status === 'blocked' || payload.status === 'error') return payload as RunLocalEvalSuiteResult;
  return invalidResponse();
}

function rebuildFilteredState(state: BrowserState, filters: Partial<WorkbenchResultFilters>): BrowserState {
  const resultFilters = normalizeResultFilters(state.latestRun?.matrix, filters);
  const filteredState = { ...state, resultFilters, viewModel: rebuildViewModel(state, { resultFilters }) };
  const selectedCell = state.selectedCell && isVisibleCell(filteredState, state.selectedCell) ? state.selectedCell : null;
  return rebuildState({ ...state, resultFilters, selectedCell, activeConversationScopeKey: selectedCell ? state.activeConversationScopeKey : null });
}

function rebuildState(state: BrowserState, overrides: { readonly selectedEvalRunModel?: string; readonly runScope?: WorkbenchRunScope; readonly latestRun?: RunLocalEvalSuiteResult; readonly isRunning?: boolean } = {}): BrowserState {
  const viewModel = rebuildViewModel(state, overrides);
  const activeConversationScopeKey = viewModel.resultDisplay.selectedCell?.failureWorkbench?.conversationScopeKey ?? null;
  const analysis = activeConversationScopeKey && analysisMatchesScope(state.analysis, activeConversationScopeKey) ? state.analysis : { status: 'idle' as const };
  return { ...state, viewModel, resultFilters: viewModel.resultDisplay.filters, activeConversationScopeKey, analysis, selectedCell: viewModel.resultDisplay.selectedCell?.failureWorkbench ? { ...state.selectedCell!, activeAssertionId: viewModel.resultDisplay.selectedCell.failureWorkbench.activeEvidence.assertionId } : state.selectedCell && viewModel.resultDisplay.selectedCell ? withoutActiveAssertion(state.selectedCell) : state.selectedCell };
}

function rebuildViewModel(state: BrowserState, overrides: { readonly selectedEvalRunModel?: string; readonly runScope?: WorkbenchRunScope; readonly latestRun?: RunLocalEvalSuiteResult; readonly isRunning?: boolean; readonly resultFilters?: Partial<WorkbenchResultFilters> }): WorkbenchViewModel {
  return createWorkbenchViewModel({
    ...baseInput(state),
    ...overrides,
    resultFilters: overrides.resultFilters ?? state.resultFilters,
    selectedCell: state.selectedCell,
  });
}

export function selectActiveFailedAssertion(state: BrowserState, activeAssertionId: string): BrowserState {
  if (!state.selectedCell || !state.viewModel.resultDisplay.selectedCell?.failureWorkbench) return state;
  return rebuildState({ ...state, selectedCell: { ...state.selectedCell, activeAssertionId } });
}

function withoutActiveAssertion(selection: WorkbenchCellSelection): WorkbenchCellSelection {
  return { testCaseId: selection.testCaseId, modelId: selection.modelId };
}

function baseInput(state: BrowserState) {
  return {
    discovery: state.viewModel.bootstrappedState.discovery,
    selectedSuiteId: state.viewModel.selectedSuite.id,
    selectedEvalRunModel: state.viewModel.selectedEvalRunModel,
    runScope: state.viewModel.runScope,
    latestRun: state.latestRun,
  };
}

function isVisibleCell(state: BrowserState, selection: WorkbenchCellSelection): boolean {
  return state.viewModel.resultDisplay.rows.some((row) => row.testCaseId === selection.testCaseId && row.cells.some((cell) => cell.modelId === selection.modelId));
}

function parseCellKey(key: string): WorkbenchCellSelection | null {
  const [testCaseId, modelId] = key.split(':');
  if (!testCaseId || !modelId) return null;
  return { testCaseId, modelId };
}

function invalidResponse(): RunLocalEvalSuiteResult {
  return { status: 'error', reason: 'runner-error', message: 'The eval server returned an unreadable response.', diagnostics: [{ code: 'invalid-eval-run-response', severity: 'error', message: 'Try again after checking the local workbench server.' }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function analysisMatchesScope(analysis: FailureAnalysisState, scopeKey: string): boolean {
  return analysis.status !== 'idle' && analysis.scopeKey === scopeKey;
}

function invalidAnalysisResponse(): AnalyzeFailedAssertionResult {
  return { status: 'error', reason: 'invalid-llm-response', message: 'The analysis server returned an unreadable response.', assistanceModelLabel: 'unknown' };
}
