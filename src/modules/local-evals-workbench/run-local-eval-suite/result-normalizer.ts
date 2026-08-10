import type { EvalRunScope } from './command.js';
import type { EvalRunnerOutcome, RawEvalAssertionOutcome, RawEvalCellOutcome, RunnableEvalModelOption, RunnableEvalSuite, RunnableEvalTestCase } from './ports.js';
import type { EvalArtifact, EvalAssertionResult, EvalCell, EvalDiagnostic, EvalMatrix, EvalMatrixRow, EvalMetric, EvalRunAggregates, EvalRunStatus } from './result.js';

const OUTPUT_PREVIEW_LIMIT = 240;
const ARTIFACT_PREVIEW_LIMIT = 160;

export function normalizeEvalRunOutcome(request: {
  readonly suite: RunnableEvalSuite;
  readonly evalRunModel: RunnableEvalModelOption;
  readonly scope: EvalRunScope;
  readonly selectedTestCases: readonly RunnableEvalTestCase[];
  readonly outcome: EvalRunnerOutcome;
}): EvalMatrix {
  const rawCellsByTestCase = new Map(request.outcome.cells?.map((cell) => [cell.testCaseId, cell]) ?? []);
  const rows = request.selectedTestCases.map((testCase) => toMatrixRow(testCase, request.evalRunModel, rawCellsByTestCase.get(testCase.id)));
  const diagnostics = request.outcome.status === 'blocked' ? request.outcome.diagnostics : request.outcome.diagnostics ?? [];
  const aggregates = aggregateRows(rows);

  return {
    suiteId: request.suite.id,
    suiteName: request.suite.name,
    status: aggregateStatus(aggregates),
    rows,
    aggregates,
    diagnostics,
  };
}

function toMatrixRow(testCase: RunnableEvalTestCase, model: RunnableEvalModelOption, rawCell: RawEvalCellOutcome | undefined): EvalMatrixRow {
  const cell = toCell(testCase.id, model, rawCell);
  return {
    testCaseId: testCase.id,
    name: testCase.name,
    status: cell.status,
    cells: [cell],
  };
}

function toCell(testCaseId: string, model: RunnableEvalModelOption, rawCell: RawEvalCellOutcome | undefined): EvalCell {
  if (!rawCell) {
    return {
      testCaseId,
      modelId: model.id,
      modelLabel: model.label,
      status: 'error',
      outputPreview: null,
      assertions: [],
      diagnostics: [diagnostic('missing-runner-result', 'error', 'Eval runner did not return a result for this test case.')],
      metrics: [],
      artifacts: [],
      durationMs: null,
    };
  }

  const assertions = (rawCell.assertions ?? []).map(toAssertion);
  return {
    testCaseId,
    modelId: model.id,
    modelLabel: model.label,
    status: rawCell.status,
    outputPreview: rawCell.output ? boundedPreview(rawCell.output, OUTPUT_PREVIEW_LIMIT) : null,
    assertions,
    diagnostics: rawCell.diagnostics ?? [],
    metrics: rawCell.metrics ?? [],
    artifacts: safeArtifacts(rawCell.artifacts ?? []),
    durationMs: typeof rawCell.durationMs === 'number' && Number.isFinite(rawCell.durationMs) ? Math.max(0, rawCell.durationMs) : null,
  };
}

function toAssertion(rawAssertion: RawEvalAssertionOutcome): EvalAssertionResult {
  return {
    id: rawAssertion.id,
    label: rawAssertion.label,
    kind: rawAssertion.kind ?? 'assertion',
    status: rawAssertion.status,
    message: rawAssertion.message,
    expectedPreview: rawAssertion.expected ? boundedPreview(rawAssertion.expected, ARTIFACT_PREVIEW_LIMIT) : undefined,
    actualPreview: rawAssertion.actual ? boundedPreview(rawAssertion.actual, ARTIFACT_PREVIEW_LIMIT) : undefined,
    metrics: rawAssertion.metrics ?? [],
    diagnostics: rawAssertion.diagnostics ?? [],
    artifacts: safeArtifacts(rawAssertion.artifacts ?? []),
  };
}

function safeArtifacts(artifacts: readonly EvalArtifact[]): readonly EvalArtifact[] {
  return artifacts.map((artifact) => ({
    id: artifact.id,
    label: artifact.label,
    kind: artifact.kind,
    reference: artifact.reference,
    preview: artifact.preview ? boundedPreview(artifact.preview, ARTIFACT_PREVIEW_LIMIT) : undefined,
  }));
}

function aggregateRows(rows: readonly EvalMatrixRow[]): EvalRunAggregates {
  return rows.reduce<EvalRunAggregates>((totals, row) => incrementAggregate(totals, row.status), { total: 0, passed: 0, failed: 0, blocked: 0, error: 0 });
}

function incrementAggregate(totals: EvalRunAggregates, status: EvalRunStatus): EvalRunAggregates {
  return { ...totals, total: totals.total + 1, [status]: totals[status] + 1 };
}

function aggregateStatus(aggregates: EvalRunAggregates): EvalRunStatus {
  if (aggregates.error > 0) return 'error';
  if (aggregates.blocked > 0) return 'blocked';
  if (aggregates.failed > 0) return 'failed';
  return 'passed';
}

function diagnostic(code: string, severity: EvalDiagnostic['severity'], message: string): EvalDiagnostic {
  return { code, severity, message };
}

function boundedPreview(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, Math.max(0, limit - 1))}…`;
}
