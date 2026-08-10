import type { EvalSuiteDiscoveryDiagnostic, EvalSuiteDiscoveryResult, EvalSuiteSummary } from '../discover-conventional-eval-suites/result.js';
import type { EvalDiagnostic, EvalMatrix, RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';

export type WorkbenchLifecycleStatus = 'ready' | 'running' | 'passed' | 'failed' | 'blocked' | 'error';
export type WorkbenchRunScope = { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string };

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
  readonly bootstrappedState: WorkbenchBootstrapState;
};

export type WorkbenchBootstrapState = {
  readonly discovery: EvalSuiteDiscoveryResult;
  readonly selectedSuiteId: string;
  readonly selectedEvalRunModel: string;
  readonly runScope: WorkbenchRunScope;
};

export type WorkbenchSuiteOption = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly readyTestCaseCount: number;
  readonly selected: boolean;
};

export type WorkbenchModelOption = { readonly id: string; readonly label: string; readonly selected: boolean };
export type WorkbenchRunScopeOption = { readonly type: WorkbenchRunScope['type']; readonly label: string; readonly selected: boolean; readonly disabled: boolean };
export type WorkbenchSummary = { readonly passRateLabel: string; readonly averageLatencyLabel: string; readonly totalCostLabel: string };
export type WorkbenchProgress = { readonly completed: number; readonly total: number; readonly percent: number; readonly label: string };
export type WorkbenchDiagnostic = { readonly code: string; readonly severity: 'info' | 'warning' | 'error'; readonly message: string };

export type CreateWorkbenchViewModelInput = {
  readonly discovery: EvalSuiteDiscoveryResult;
  readonly selectedSuiteId?: string;
  readonly selectedEvalRunModel?: string;
  readonly runScope?: WorkbenchRunScope;
  readonly latestRun?: RunLocalEvalSuiteResult;
  readonly isRunning?: boolean;
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
    bootstrappedState: { discovery: input.discovery, selectedSuiteId: selectedSuite.id, selectedEvalRunModel: selectedModel, runScope },
  };
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

function statusLabel(status: WorkbenchLifecycleStatus): string {
  return ({ ready: 'Ready', running: 'Running...', passed: 'Passed', failed: 'Failed', blocked: 'Blocked', error: 'Could not run' } as const)[status];
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
  const matrix = latestRun?.status === 'completed' || latestRun?.matrix ? latestRun.matrix : undefined;
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
