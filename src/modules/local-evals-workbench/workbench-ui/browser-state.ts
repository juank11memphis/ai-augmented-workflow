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
  readonly focusRestoreKey: string | null;
};

export type EvalRunRequestPayload = {
  readonly suiteId: string;
  readonly evalRunModel: string;
  readonly scope: WorkbenchRunScope;
};

export function createBrowserState(viewModel: WorkbenchViewModel, latestRun?: RunLocalEvalSuiteResult): BrowserState {
  return { viewModel, latestRun, resultFilters: viewModel.resultDisplay.filters, selectedCell: null, focusRestoreKey: null };
}

export function selectSuite(state: BrowserState, suiteId: string): BrowserState {
  const viewModel = createWorkbenchViewModel({ discovery: state.viewModel.bootstrappedState.discovery, selectedSuiteId: suiteId, runScope: { type: 'all' } });
  return createBrowserState(viewModel);
}

export function selectModel(state: BrowserState, selectedEvalRunModel: string): BrowserState {
  return rebuildState({ ...state, focusRestoreKey: null }, { selectedEvalRunModel });
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
  return rebuildState({ ...state, selectedCell: selection, focusRestoreKey: createCellKey(selection, mode) });
}

export function clearSelectedCell(state: BrowserState, mode: ResultMatrixNavigationMode): BrowserState {
  const focusRestoreKey = state.selectedCell ? state.focusRestoreKey ?? createCellKey(state.selectedCell, mode) : state.focusRestoreKey;
  return rebuildState({ ...state, selectedCell: null, focusRestoreKey });
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
  return rebuildState({ ...state, selectedCell: null, focusRestoreKey: null }, { isRunning: true });
}

export function finishRun(state: BrowserState, latestRun: RunLocalEvalSuiteResult): BrowserState {
  const resultFilters = normalizeResultFilters(latestRun.matrix, state.resultFilters);
  const next = rebuildState({ ...state, latestRun, resultFilters, selectedCell: null, focusRestoreKey: null }, { latestRun });
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

export function parseEvalRunResponse(payload: unknown): RunLocalEvalSuiteResult {
  if (!isRecord(payload) || typeof payload.status !== 'string') return invalidResponse();
  if (payload.status === 'completed' && isRecord(payload.matrix)) return payload as RunLocalEvalSuiteResult;
  if (payload.status === 'blocked' || payload.status === 'error') return payload as RunLocalEvalSuiteResult;
  return invalidResponse();
}

function rebuildFilteredState(state: BrowserState, filters: Partial<WorkbenchResultFilters>): BrowserState {
  const resultFilters = normalizeResultFilters(state.latestRun?.matrix, filters);
  const selectedCell = state.selectedCell && isVisibleCell({ ...state, resultFilters, viewModel: rebuildViewModel(state, { resultFilters }) }, state.selectedCell) ? state.selectedCell : null;
  return rebuildState({ ...state, resultFilters, selectedCell });
}

function rebuildState(state: BrowserState, overrides: { readonly selectedEvalRunModel?: string; readonly runScope?: WorkbenchRunScope; readonly latestRun?: RunLocalEvalSuiteResult; readonly isRunning?: boolean } = {}): BrowserState {
  const viewModel = rebuildViewModel(state, overrides);
  return { ...state, viewModel, resultFilters: viewModel.resultDisplay.filters };
}

function rebuildViewModel(state: BrowserState, overrides: { readonly selectedEvalRunModel?: string; readonly runScope?: WorkbenchRunScope; readonly latestRun?: RunLocalEvalSuiteResult; readonly isRunning?: boolean; readonly resultFilters?: Partial<WorkbenchResultFilters> }): WorkbenchViewModel {
  return createWorkbenchViewModel({
    ...baseInput(state),
    ...overrides,
    resultFilters: overrides.resultFilters ?? state.resultFilters,
    selectedCell: state.selectedCell,
  });
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
