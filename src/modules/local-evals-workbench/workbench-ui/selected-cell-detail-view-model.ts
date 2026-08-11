import type { EvalCell, EvalDiagnostic, EvalMetric } from '../run-local-eval-suite/result.js';
import { createFailureWorkbenchViewModel, type FailureWorkbenchViewModel } from './failure-workbench-view-model.js';
import { createCellKey, statusIcon, statusLabel, type WorkbenchCellStatus, type WorkbenchDetailCell, type WorkbenchDetailItem, type WorkbenchDetailSection, type WorkbenchSelectedCellDetail } from './view-model.js';

export function summarizeCell(cell: WorkbenchDetailCell) {
  return {
    key: createCellKey(cell),
    testCaseId: cell.testCaseId,
    modelId: cell.modelId,
    modelLabel: cell.modelLabel,
    status: cell.status,
    statusLabel: statusLabel(cell.status),
    statusIcon: statusIcon(cell.status),
    assertionSummary: assertionSummary(cell),
    metricsSummary: metricsSummary(cell),
    outputPreview: cell.outputPreview?.trim() || 'Output will appear here.',
    diagnosticsSummary: diagnosticsSummary(cell.diagnostics),
    actionLabel: `Open ${cell.modelLabel} ${statusLabel(cell.status)} result for test case ${cell.testCaseId}`,
  };
}

export function createSelectedCellDetail(input: {
  readonly suiteId: string;
  readonly cell: EvalCell;
  readonly activeAssertionId?: string;
}): WorkbenchSelectedCellDetail {
  const cell = input.cell as WorkbenchDetailCell;
  const summary = summarizeCell(cell);
  const failureWorkbench = createFailureWorkbenchViewModel({ suiteId: input.suiteId, cell: input.cell, activeAssertionId: input.activeAssertionId });
  return {
    ...summary,
    title: failureWorkbench ? failureWorkbench.title : `${statusLabel(cell.status)} result`,
    description: failureWorkbench?.description ?? `${statusLabel(cell.status)} · ${cell.modelLabel} · ${cell.testCaseId}`,
    sections: failureWorkbench ? [] : detailSections(cell),
    failureWorkbench,
    recoveryGuidance: failureWorkbench ? null : recoveryGuidance(cell),
    retryActionLabel: cell.status === 'error' ? 'Try again' : null,
    dialogLabelId: 'cell-dialog-title',
    dialogDescriptionId: 'cell-dialog-description',
  };
}

export function detailSections(cell: WorkbenchDetailCell): readonly WorkbenchDetailSection[] {
  if (cell.status === 'running') return [detailSection('Status', 'Running local evals. Details will appear when this run finishes.', [])];
  if (cell.status === 'not-run') return [detailSection('Status', 'Output will appear after running the eval.', [])];

  return [
    detailSection('Assertions', assertionEmptyMessage(cell.status), cell.assertions.map((assertion) => ({
      label: `${statusLabel(assertion.status)}: ${assertion.label}`,
      value: assertion.message ?? (assertion.status === 'passed' ? 'Passed.' : 'No assertion message.'),
      tone: assertionTone(assertion.status),
      meta: [assertion.expectedPreview ? `Expected: ${assertion.expectedPreview}` : null, assertion.actualPreview ? `Actual: ${assertion.actualPreview}` : null].filter((item): item is string => Boolean(item)).join(' · ') || undefined,
    }))),
    detailSection('Diagnostics', 'No diagnostics.', cell.diagnostics.map((diagnostic) => ({ label: diagnostic.code, value: diagnostic.message, tone: diagnostic.severity === 'error' ? 'error' : diagnostic.severity === 'warning' ? 'warning' : 'neutral', meta: diagnostic.location }))),
    detailSection('Output', 'Output will appear after running the eval.', cell.outputPreview ? [{ label: 'Output preview', value: cell.outputPreview }] : []),
    detailSection('Metrics', 'Metrics unavailable.', metricItems(cell)),
    detailSection('Raw artifacts', 'No raw artifacts.', cell.artifacts.map((artifact) => ({ label: artifact.label, value: artifact.preview ?? artifact.reference ?? artifact.kind, meta: artifact.reference }))),
  ];
}

function detailSection(title: string, emptyMessage: string, items: readonly WorkbenchDetailItem[]): WorkbenchDetailSection {
  return { title, emptyMessage, items };
}

function metricItems(cell: WorkbenchDetailCell): readonly WorkbenchDetailItem[] {
  const duration = cell.durationMs === null ? [] : [{ label: 'Duration', value: `${Math.round(cell.durationMs)} ms` }];
  return [...duration, ...cell.metrics.map((metric) => ({ label: metric.name, value: `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` }))];
}

function recoveryGuidance(cell: WorkbenchDetailCell): string | null {
  if (cell.status === 'blocked') return 'Add local config, then run the eval again.';
  if (cell.status === 'error') return 'Try again after checking local setup.';
  if (cell.status === 'running') return 'Wait for this run to finish.';
  if (cell.status === 'not-run') return 'Run this eval to inspect output.';
  return null;
}

function assertionEmptyMessage(status: WorkbenchCellStatus): string {
  if (status === 'passed') return 'No assertions reported.';
  return 'No assertion details reported.';
}

function assertionTone(status: WorkbenchCellStatus): WorkbenchDetailItem['tone'] {
  if (status === 'passed') return 'success';
  if (status === 'blocked') return 'warning';
  if (status === 'failed' || status === 'error') return 'error';
  return 'neutral';
}

function assertionSummary(cell: WorkbenchDetailCell): string {
  const total = cell.assertions.length;
  if (total === 0) return cell.status === 'passed' ? 'No assertions reported.' : 'No assertion details reported.';
  const failed = cell.assertions.filter((assertion) => assertion.status === 'failed').length;
  const passed = cell.assertions.filter((assertion) => assertion.status === 'passed').length;
  if (failed > 0) return `${failed} failed / ${total}`;
  return `${passed} passed / ${total}`;
}

function metricsSummary(cell: WorkbenchDetailCell): string {
  const labels = [cell.durationMs === null ? null : `${Math.round(cell.durationMs)} ms`, tokenMetricLabel(cell.metrics), costMetricLabel(cell.metrics)].filter((label): label is string => Boolean(label));
  return labels.length > 0 ? labels.join(' · ') : 'Metrics unavailable';
}

function tokenMetricLabel(metrics: readonly EvalMetric[]): string | null {
  const metric = metrics.find((item) => item.name.includes('token'));
  return metric ? `${Math.round(metric.value).toLocaleString('en-US')} tokens` : null;
}

function costMetricLabel(metrics: readonly EvalMetric[]): string | null {
  const metric = metrics.find((item) => ['cost', 'total_cost', 'usd_cost'].includes(item.name) || item.unit === 'usd');
  return metric ? `$${metric.value.toFixed(4)}` : null;
}

function diagnosticsSummary(diagnostics: readonly EvalDiagnostic[]): string {
  if (diagnostics.length === 0) return 'No diagnostics.';
  return diagnostics[0]?.message ?? `${diagnostics.length} diagnostics reported.`;
}
