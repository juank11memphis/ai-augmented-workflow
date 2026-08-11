import type { EvalSuiteDiscoveryDiagnostic, EvalSuiteDiscoveryResult, EvalSuiteSummary } from '../discover-conventional-eval-suites/result.js';
import type { EvalCell, EvalDiagnostic, EvalMatrix, EvalMatrixRow, EvalRunStatus, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import type { FailureWorkbenchViewModel } from './failure-workbench-view-model.js';
import { createSelectedCellDetail, summarizeCell } from './selected-cell-detail-view-model.js';

export type WorkbenchLifecycleStatus = 'ready' | 'running' | 'passed' | 'failed' | 'blocked' | 'error';
export type WorkbenchCellStatus = EvalRunStatus | 'running' | 'not-run';
export type WorkbenchRunScope = { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string };
export type ResultMatrixNavigationMode = 'desktop' | 'phone';
export type ResultMatrixNavigationDirection = 'up' | 'down' | 'left' | 'right';

export type WorkbenchViewModel = {
  readonly title: 'Local Sibu Evals';
  readonly eyebrow: 'Workflow evals';
  readonly status: WorkbenchLifecycleStatus;
  readonly statusLabel: string;
  readonly statusMessage: string;
  readonly suites: readonly WorkbenchSuiteOption[];
  readonly selectedSuite: WorkbenchSuiteOption;
  readonly modelOptions: readonly WorkbenchModelOption[];
  readonly selectedEvalRunModel: string;
  readonly runScope: WorkbenchRunScope;
  readonly runScopeOptions: readonly WorkbenchRunScopeOption[];
  readonly runButtonLabel: string;
  readonly controlsDisabled: boolean;
  readonly summary: WorkbenchSummary;
  readonly progress: WorkbenchProgress;
  readonly diagnostics: readonly WorkbenchDiagnostic[];
  readonly resultDisplay: WorkbenchResultDisplay;
  readonly bootstrappedState: WorkbenchBootstrapState;
};

export type WorkbenchBootstrapState = {
  readonly discovery: EvalSuiteDiscoveryResult;
  readonly selectedSuiteId: string;
  readonly selectedEvalRunModel: string;
  readonly runScope: WorkbenchRunScope;
};

export type WorkbenchSuiteOption = { readonly id: string; readonly name: string; readonly description: string; readonly readyTestCaseCount: number; readonly selected: boolean };
export type WorkbenchModelOption = { readonly id: string; readonly label: string; readonly selected: boolean };
export type WorkbenchRunScopeOption = { readonly type: WorkbenchRunScope['type']; readonly label: string; readonly selected: boolean; readonly disabled: boolean };
export type WorkbenchSummary = { readonly passRateLabel: string; readonly averageLatencyLabel: string; readonly totalCostLabel: string };
export type WorkbenchProgress = { readonly completed: number; readonly total: number; readonly percent: number; readonly label: string };
export type WorkbenchDiagnostic = { readonly code: string; readonly severity: 'info' | 'warning' | 'error'; readonly message: string };

export type WorkbenchResultFilters = {
  readonly failuresOnly: boolean;
  readonly searchQuery: string;
  readonly visibleVariantIds: readonly string[];
};

export type WorkbenchCellSelection = { readonly testCaseId: string; readonly modelId: string; readonly activeAssertionId?: string };
export type WorkbenchResultVariant = { readonly id: string; readonly label: string; readonly selected: boolean };
export type WorkbenchResultRow = { readonly testCaseId: string; readonly name: string; readonly status: EvalRunStatus; readonly statusLabel: string; readonly cells: readonly WorkbenchCellSummary[] };

export type WorkbenchCellSummary = {
  readonly key: string;
  readonly testCaseId: string;
  readonly modelId: string;
  readonly modelLabel: string;
  readonly status: WorkbenchCellStatus;
  readonly statusLabel: string;
  readonly statusIcon: string;
  readonly assertionSummary: string;
  readonly metricsSummary: string;
  readonly outputPreview: string;
  readonly diagnosticsSummary: string;
  readonly actionLabel: string;
};

export type WorkbenchSelectedCellDetail = WorkbenchCellSummary & {
  readonly title: string;
  readonly description: string;
  readonly sections: readonly WorkbenchDetailSection[];
  readonly failureWorkbench: FailureWorkbenchViewModel | null;
  readonly recoveryGuidance: string | null;
  readonly retryActionLabel: string | null;
  readonly dialogLabelId: 'cell-dialog-title';
  readonly dialogDescriptionId: 'cell-dialog-description';
};

export type WorkbenchDetailSection = {
  readonly title: string;
  readonly emptyMessage: string;
  readonly items: readonly WorkbenchDetailItem[];
};

export type WorkbenchDetailItem = {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'neutral' | 'success' | 'warning' | 'error';
  readonly meta?: string;
};

export type WorkbenchDetailCell = Omit<EvalCell, 'status'> & { readonly status: WorkbenchCellStatus };

export type WorkbenchResultDisplay = {
  readonly hasMatrix: boolean;
  readonly filters: WorkbenchResultFilters;
  readonly variants: readonly WorkbenchResultVariant[];
  readonly visibleVariants: readonly WorkbenchResultVariant[];
  readonly rows: readonly WorkbenchResultRow[];
  readonly selectedCell: WorkbenchSelectedCellDetail | null;
  readonly emptyMessage: string | null;
};

export type CreateWorkbenchViewModelInput = {
  readonly discovery: EvalSuiteDiscoveryResult;
  readonly selectedSuiteId?: string;
  readonly selectedEvalRunModel?: string;
  readonly runScope?: WorkbenchRunScope;
  readonly latestRun?: RunLocalEvalSuiteResult;
  readonly isRunning?: boolean;
  readonly resultFilters?: Partial<WorkbenchResultFilters>;
  readonly selectedCell?: WorkbenchCellSelection | null;
};

const EMPTY_SUITE: EvalSuiteSummary = { id: 'no-suite', name: 'No eval suites', description: 'Add local config, then run the eval again.', readyTestCaseCount: 0, modelOptions: [] };
const FALLBACK_MODEL = { id: 'gpt-5-mini', label: 'GPT-5 mini' } as const;

export function createWorkbenchViewModel(input: CreateWorkbenchViewModelInput): WorkbenchViewModel {
  const selectedSuite = selectSuite(input.discovery.suites, input.selectedSuiteId);
  const selectedModel = selectModel(selectedSuite, input.selectedEvalRunModel);
  const runScope = normalizeRunScope(input.runScope, selectedSuite);
  const matrix = matrixForSelectedSuite(input.latestRun, selectedSuite.id);
  const status = resolveStatus(input.discovery, input.latestRun, Boolean(input.isRunning));
  const progress = createProgress(status, selectedSuite, matrix);
  const diagnostics = createDiagnostics(input.discovery, input.latestRun);

  return {
    title: 'Local Sibu Evals',
    eyebrow: 'Workflow evals',
    status,
    statusLabel: statusLabel(status),
    statusMessage: statusMessage(status, input.discovery, input.latestRun, selectedSuite, progress),
    suites: input.discovery.suites.map((suite) => toSuiteOption(suite, selectedSuite.id)),
    selectedSuite: toSuiteOption(selectedSuite, selectedSuite.id),
    modelOptions: modelOptions(selectedSuite, selectedModel),
    selectedEvalRunModel: selectedModel,
    runScope,
    runScopeOptions: runScopeOptions(runScope, selectedSuite, status),
    runButtonLabel: runButtonLabel(status, runScope, selectedSuite.readyTestCaseCount),
    controlsDisabled: status === 'running' || status === 'blocked',
    summary: createSummary(matrix),
    progress,
    diagnostics,
    resultDisplay: createResultDisplay(matrix, input.resultFilters, input.selectedCell),
    bootstrappedState: { discovery: input.discovery, selectedSuiteId: selectedSuite.id, selectedEvalRunModel: selectedModel, runScope },
  };
}

export function createResultDisplay(matrix: EvalMatrix | undefined, filters: Partial<WorkbenchResultFilters> = {}, selectedCell?: WorkbenchCellSelection | null): WorkbenchResultDisplay {
  if (!matrix) return emptyResultDisplay(filters);
  const allVariants = collectVariants(matrix);
  const normalizedFilters = normalizeResultFilters(matrix, filters);
  const visibleVariantIdSet = new Set(normalizedFilters.visibleVariantIds);
  const variants = allVariants.map((variant) => ({ ...variant, selected: visibleVariantIdSet.has(variant.id) }));
  const visibleVariants = variants.filter((variant) => variant.selected);
  const rows = filterMatrixRows(matrix.rows, normalizedFilters).map((row) => toResultRow(row, visibleVariantIdSet));
  const selectedSummary = selectedCell ? findCellSummary(matrix, selectedCell) : null;

  return {
    hasMatrix: true,
    filters: normalizedFilters,
    variants,
    visibleVariants,
    rows,
    selectedCell: selectedSummary,
    emptyMessage: rows.length === 0 ? emptyResultMessage(normalizedFilters) : null,
  };
}

export function normalizeResultFilters(matrix: EvalMatrix | undefined, filters: Partial<WorkbenchResultFilters> = {}): WorkbenchResultFilters {
  const availableVariantIds = matrix ? collectVariants(matrix).map((variant) => variant.id) : [];
  const requestedVisibleIds = filters.visibleVariantIds?.filter((id) => availableVariantIds.includes(id)) ?? availableVariantIds;
  const visibleVariantIds = requestedVisibleIds.length > 0 ? requestedVisibleIds : availableVariantIds.slice(0, 1);
  return { failuresOnly: Boolean(filters.failuresOnly), searchQuery: filters.searchQuery?.trim() ?? '', visibleVariantIds };
}

export function findCellSummary(matrix: EvalMatrix, selection: WorkbenchCellSelection): WorkbenchSelectedCellDetail | null {
  const cell = findMatrixCell(matrix.rows, selection);
  return cell ? createSelectedCellDetail({ suiteId: matrix.suiteId, cell, activeAssertionId: selection.activeAssertionId }) : null;
}

export function findNextResultCellSelection(input: {
  readonly rows: readonly WorkbenchResultRow[];
  readonly current: WorkbenchCellSelection;
  readonly direction: ResultMatrixNavigationDirection;
  readonly mode: ResultMatrixNavigationMode;
}): WorkbenchCellSelection | null {
  const grid = input.mode === 'phone' ? phoneNavigationGrid(input.rows) : desktopNavigationGrid(input.rows);
  const position = findGridPosition(grid, input.current);
  if (!position) return null;
  const nextPosition = nextGridPosition(position, input.direction, input.mode);
  return grid[nextPosition.row]?.[nextPosition.column] ?? null;
}

export function createCellKey(selection: WorkbenchCellSelection, mode?: ResultMatrixNavigationMode): string {
  const suffix = mode ? `:${mode}` : '';
  return `${selection.testCaseId}:${selection.modelId}${suffix}`;
}

function emptyResultDisplay(filters: Partial<WorkbenchResultFilters>): WorkbenchResultDisplay {
  const normalizedFilters = { failuresOnly: Boolean(filters.failuresOnly), searchQuery: filters.searchQuery?.trim() ?? '', visibleVariantIds: filters.visibleVariantIds ?? [] };
  return { hasMatrix: false, filters: normalizedFilters, variants: [], visibleVariants: [], rows: [], selectedCell: null, emptyMessage: 'Run evals to see result cards and the matrix.' };
}

function collectVariants(matrix: EvalMatrix): readonly WorkbenchResultVariant[] {
  const variants = new Map<string, WorkbenchResultVariant>();
  for (const row of matrix.rows) {
    for (const cell of row.cells) variants.set(cell.modelId, { id: cell.modelId, label: cell.modelLabel, selected: true });
  }
  return [...variants.values()];
}

function filterMatrixRows(rows: readonly EvalMatrixRow[], filters: WorkbenchResultFilters): readonly EvalMatrixRow[] {
  const visibleVariantIdSet = new Set(filters.visibleVariantIds);
  const query = filters.searchQuery.toLowerCase();
  return rows.filter((row) => {
    if (query && !`${row.name} ${row.testCaseId}`.toLowerCase().includes(query)) return false;
    const visibleCells = row.cells.filter((cell) => visibleVariantIdSet.has(cell.modelId));
    if (visibleCells.length === 0) return false;
    return !filters.failuresOnly || visibleCells.some((cell) => cell.status === 'failed');
  });
}

function toResultRow(row: EvalMatrixRow, visibleVariantIdSet: ReadonlySet<string>): WorkbenchResultRow {
  const cells = row.cells.filter((cell) => visibleVariantIdSet.has(cell.modelId)).map(summarizeCell);
  return { testCaseId: row.testCaseId, name: row.name, status: row.status, statusLabel: statusLabel(row.status), cells };
}

function findMatrixCell(rows: readonly EvalMatrixRow[], selection: WorkbenchCellSelection): EvalCell | undefined {
  return rows.find((row) => row.testCaseId === selection.testCaseId)?.cells.find((cell) => cell.modelId === selection.modelId);
}

function emptyResultMessage(filters: WorkbenchResultFilters): string {
  if (filters.failuresOnly && filters.searchQuery) return 'No failed results match this search.';
  if (filters.failuresOnly) return 'No failed results are visible.';
  if (filters.searchQuery) return 'No test cases match this search.';
  return 'No results are visible with the selected models.';
}

function desktopNavigationGrid(rows: readonly WorkbenchResultRow[]): readonly (readonly WorkbenchCellSelection[])[] {
  return rows.map((row) => row.cells.map((cell) => ({ testCaseId: row.testCaseId, modelId: cell.modelId })));
}

function phoneNavigationGrid(rows: readonly WorkbenchResultRow[]): readonly (readonly WorkbenchCellSelection[])[] {
  return rows.flatMap((row) => row.cells.map((cell) => [{ testCaseId: row.testCaseId, modelId: cell.modelId }]));
}

function findGridPosition(grid: readonly (readonly WorkbenchCellSelection[])[], current: WorkbenchCellSelection): { readonly row: number; readonly column: number } | null {
  for (let row = 0; row < grid.length; row += 1) {
    const column = grid[row]?.findIndex((cell) => cell.testCaseId === current.testCaseId && cell.modelId === current.modelId) ?? -1;
    if (column >= 0) return { row, column };
  }
  return null;
}

function nextGridPosition(position: { readonly row: number; readonly column: number }, direction: ResultMatrixNavigationDirection, mode: ResultMatrixNavigationMode): { readonly row: number; readonly column: number } {
  if (mode === 'phone') return { row: position.row + (direction === 'down' || direction === 'right' ? 1 : direction === 'up' || direction === 'left' ? -1 : 0), column: 0 };
  if (direction === 'up') return { row: position.row - 1, column: position.column };
  if (direction === 'down') return { row: position.row + 1, column: position.column };
  if (direction === 'left') return { row: position.row, column: position.column - 1 };
  return { row: position.row, column: position.column + 1 };
}

function selectSuite(suites: readonly EvalSuiteSummary[], selectedSuiteId: string | undefined): EvalSuiteSummary {
  return suites.find((suite) => suite.id === selectedSuiteId) ?? suites[0] ?? EMPTY_SUITE;
}

function selectModel(suite: EvalSuiteSummary, selectedEvalRunModel: string | undefined): string {
  if (selectedEvalRunModel && suite.modelOptions.some((option) => option.id === selectedEvalRunModel)) return selectedEvalRunModel;
  return suite.modelOptions[0]?.id ?? FALLBACK_MODEL.id;
}

function normalizeRunScope(scope: WorkbenchRunScope | undefined, suite: EvalSuiteSummary): WorkbenchRunScope {
  if (scope?.type === 'test_case' && scope.testCaseId.trim().length > 0) return scope;
  return { type: 'all' };
}

function resolveStatus(discovery: EvalSuiteDiscoveryResult, latestRun: RunLocalEvalSuiteResult | undefined, isRunning: boolean): WorkbenchLifecycleStatus {
  if (isRunning) return 'running';
  if (latestRun?.status === 'completed') return latestRun.matrix.status;
  if (latestRun?.status === 'blocked') return 'blocked';
  if (latestRun?.status === 'error') return 'error';
  return discovery.status === 'blocked' ? 'blocked' : 'ready';
}

export function statusLabel(status: WorkbenchLifecycleStatus | WorkbenchCellStatus): string {
  return ({ ready: 'Ready', running: 'Running...', 'not-run': 'Not run', passed: 'Passed', failed: 'Failed', blocked: 'Blocked', error: 'Could not run' } as const)[status];
}

export function statusIcon(status: WorkbenchCellStatus): string {
  return ({ passed: '✓', failed: '!', blocked: '◇', error: '×', running: '…', 'not-run': '○' } as const)[status];
}

function statusMessage(status: WorkbenchLifecycleStatus, discovery: EvalSuiteDiscoveryResult, latestRun: RunLocalEvalSuiteResult | undefined, suite: EvalSuiteSummary, progress: WorkbenchProgress): string {
  if (status === 'ready') return `${suite.readyTestCaseCount} test case${suite.readyTestCaseCount === 1 ? '' : 's'} ready.`;
  if (status === 'running') return 'Running local evals. Controls are disabled until this run finishes.';
  if (status === 'passed') return 'All completed eval results passed.';
  if (status === 'failed') return 'One or more eval results failed.';
  if (status === 'blocked') return latestRun?.status === 'blocked' ? latestRun.message : discovery.status === 'blocked' ? discovery.message : 'Add local config, then run the eval again.';
  if (latestRun?.status === 'error') return latestRun.message;
  return `The eval did not finish. ${progress.label}`;
}

function matrixForSelectedSuite(latestRun: RunLocalEvalSuiteResult | undefined, suiteId: string): EvalMatrix | undefined {
  const matrix = latestRun?.matrix;
  return matrix?.suiteId === suiteId ? matrix : undefined;
}

function modelOptions(suite: EvalSuiteSummary, selectedModel: string): readonly WorkbenchModelOption[] {
  const options = suite.modelOptions.length > 0 ? suite.modelOptions : [FALLBACK_MODEL];
  return options.map((option) => ({ ...option, selected: option.id === selectedModel }));
}

function runScopeOptions(scope: WorkbenchRunScope, suite: EvalSuiteSummary, status: WorkbenchLifecycleStatus): readonly WorkbenchRunScopeOption[] {
  const disabled = status === 'running' || status === 'blocked';
  return [
    { type: 'all', label: 'All test cases', selected: scope.type === 'all', disabled },
    { type: 'test_case', label: 'Selected test case', selected: scope.type === 'test_case', disabled: disabled || suite.readyTestCaseCount === 0 },
  ];
}

function runButtonLabel(status: WorkbenchLifecycleStatus, scope: WorkbenchRunScope, total: number): string {
  if (status === 'running') return 'Running...';
  if (status === 'error') return 'Try again';
  if (scope.type === 'test_case') return 'Run 1 test case';
  return `Run all ${total} test case${total === 1 ? '' : 's'}`;
}

function createSummary(matrix: EvalMatrix | undefined): WorkbenchSummary {
  if (!matrix) return { passRateLabel: '—', averageLatencyLabel: '—', totalCostLabel: '$0.0000' };
  const completed = matrix.aggregates.passed + matrix.aggregates.failed + matrix.aggregates.blocked + matrix.aggregates.error;
  const passRate = completed > 0 ? Math.round((matrix.aggregates.passed / completed) * 100) : 0;
  return { passRateLabel: `${passRate}%`, averageLatencyLabel: averageLatencyLabel(matrix), totalCostLabel: totalCostLabel(matrix) };
}

function averageLatencyLabel(matrix: EvalMatrix): string {
  const durations = matrix.rows.flatMap((row) => row.cells.map((cell) => cell.durationMs)).filter((value): value is number => typeof value === 'number');
  if (durations.length === 0) return '—';
  return `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} ms`;
}

function totalCostLabel(matrix: EvalMatrix): string {
  const total = matrix.rows.flatMap((row) => row.cells).flatMap((cell) => cell.metrics).filter((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd').reduce((sum, metric) => sum + metric.value, 0);
  return `$${total.toFixed(4)}`;
}

function createProgress(status: WorkbenchLifecycleStatus, suite: EvalSuiteSummary, matrix: EvalMatrix | undefined): WorkbenchProgress {
  const total = matrix?.aggregates.total ?? suite.readyTestCaseCount;
  const completed = status === 'running' ? countCompleted(matrix) : matrix?.aggregates.total ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent, label: `${completed}/${total} complete` };
}

function countCompleted(matrix: EvalMatrix | undefined): number {
  if (!matrix) return 0;
  return matrix.rows.filter((row) => row.status !== 'blocked').length;
}

function createDiagnostics(discovery: EvalSuiteDiscoveryResult, latestRun: RunLocalEvalSuiteResult | undefined): readonly WorkbenchDiagnostic[] {
  const runDiagnostics = latestRun?.status === 'completed' ? latestRun.matrix.diagnostics : latestRun?.diagnostics;
  return [...discovery.diagnostics.map(discoveryDiagnostic), ...(runDiagnostics ?? []).map(runDiagnostic)];
}

function discoveryDiagnostic(diagnostic: EvalSuiteDiscoveryDiagnostic): WorkbenchDiagnostic {
  return { code: diagnostic.code, severity: diagnostic.severity, message: diagnostic.message };
}

function runDiagnostic(diagnostic: EvalDiagnostic): WorkbenchDiagnostic {
  return { code: diagnostic.code, severity: diagnostic.severity, message: diagnostic.message };
}

function toSuiteOption(suite: EvalSuiteSummary, selectedSuiteId: string): WorkbenchSuiteOption {
  return { id: suite.id, name: suite.name, description: suite.description, readyTestCaseCount: suite.readyTestCaseCount, selected: suite.id === selectedSuiteId };
}
