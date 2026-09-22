import type { RunLocalEvalSuiteCommand } from './command.js';
import type { EvalRunnerOutcome, EvalRunnerPort, EvalSuiteRegistryPort, RunArtifactStorePort, RunLocalEvalSuiteLoggerPort, RunnableEvalModelOption, RunnableEvalSuite, RunnableEvalTestCase } from './ports.js';
import type { EvalDiagnostic, RunLocalEvalSuiteResult } from './result.js';
import { normalizeEvalRunOutcome } from './result-normalizer.js';

export type RunLocalEvalSuiteDependencies = {
  readonly suiteRegistry: EvalSuiteRegistryPort;
  readonly evalRunner: EvalRunnerPort;
  readonly artifactStore: RunArtifactStorePort;
  readonly logger: RunLocalEvalSuiteLoggerPort;
  readonly clock?: () => number;
};

export async function runLocalEvalSuite(command: RunLocalEvalSuiteCommand, dependencies: RunLocalEvalSuiteDependencies): Promise<RunLocalEvalSuiteResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const scopeMetadata = scopeLogMetadata(command);
  const suite = await dependencies.suiteRegistry.findSuite(command.projectRoot, command.suiteId);
  const model = suite?.modelOptions.find((option) => option.id === command.evalRunModel);

  dependencies.logger.info({ event: 'local_eval_run_requested', suiteId: command.suiteId, modelId: command.evalRunModel, modelLabel: model?.label ?? command.evalRunModel, ...scopeMetadata });

  if (!suite) {
    return blocked('invalid-suite-id', 'Eval suite was not found.', [diagnostic('invalid-suite-id', 'error', 'Select a discovered eval suite.')], command, dependencies, startedAt);
  }

  if (suite.version !== 2) {
    return blocked('unsupported-suite-version', 'Version-1 eval suites are not runnable.', [diagnostic('unsupported-suite-version', 'error', 'Regenerate this suite using Sibu eval suite version 2.')], command, dependencies, startedAt);
  }

  if (!model) {
    return blocked('unsupported-model', 'Selected eval-run model is not supported by this suite.', [diagnostic('unsupported-model', 'error', 'Choose one of the suite model options.')], command, dependencies, startedAt);
  }

  const selectedTestCases = selectTestCases(suite, command);
  if (selectedTestCases.length === 0) {
    return blocked('invalid-test-case-id', 'Selected test case was not found.', [diagnostic('invalid-test-case-id', 'error', 'Choose one of the suite test cases.')], command, dependencies, startedAt);
  }

  try {
    const outcome = await dependencies.evalRunner.runSuite({ projectRoot: command.projectRoot, suite, evalRunModel: model, scope: command.scope, testCases: selectedTestCases });
    const matrix = normalizeEvalRunOutcome({ suite, evalRunModel: model, scope: command.scope, selectedTestCases, outcome });
    await dependencies.artifactStore.storeRunArtifact({ projectRoot: command.projectRoot, suiteId: suite.id, scope: command.scope, evalRunModel: model, matrix });

    if (outcome.status === 'blocked') {
      dependencies.logger.warn({ event: 'local_eval_run_blocked', suiteId: suite.id, modelId: model.id, reason: 'runner-blocked', durationMs: elapsed(startedAt, dependencies), ...scopeMetadata });
      return { status: 'blocked', reason: 'runner-blocked', message: outcome.message, diagnostics: outcome.diagnostics, matrix };
    }

    dependencies.logger.info({ event: 'local_eval_run_completed', suiteId: suite.id, modelId: model.id, modelLabel: model.label, rowCount: matrix.rows.length, outcome: matrix.status, durationMs: elapsed(startedAt, dependencies), ...scopeMetadata });
    return { status: 'completed', scope: command.scope.type, matrix };
  } catch {
    dependencies.logger.error({ event: 'local_eval_run_error', suiteId: suite.id, modelId: model.id, reason: 'runner-error', durationMs: elapsed(startedAt, dependencies), ...scopeMetadata });
    return { status: 'error', reason: 'runner-error', message: 'Eval runner failed before producing a complete result.', diagnostics: [diagnostic('runner-error', 'error', 'Review local eval runner setup and try again.')] };
  }
}

function selectTestCases(suite: RunnableEvalSuite, command: RunLocalEvalSuiteCommand): readonly RunnableEvalTestCase[] {
  const scope = command.scope;
  if (scope.type === 'all') {
    return suite.testCases;
  }

  return suite.testCases.filter((testCase) => testCase.id === scope.testCaseId);
}

function blocked(reason: 'invalid-suite-id' | 'invalid-test-case-id' | 'unsupported-model' | 'unsupported-suite-version', message: string, diagnostics: readonly EvalDiagnostic[], command: RunLocalEvalSuiteCommand, dependencies: RunLocalEvalSuiteDependencies, startedAt: number): RunLocalEvalSuiteResult {
  dependencies.logger.warn({ event: 'local_eval_run_blocked', suiteId: command.suiteId, modelId: command.evalRunModel, reason, durationMs: elapsed(startedAt, dependencies), ...scopeLogMetadata(command) });
  return { status: 'blocked', reason, message, diagnostics };
}

function diagnostic(code: string, severity: EvalDiagnostic['severity'], message: string): EvalDiagnostic {
  return { code, severity, message };
}

function scopeLogMetadata(command: RunLocalEvalSuiteCommand): { readonly scope: 'all' | 'test_case'; readonly testCaseId?: string } {
  return command.scope.type === 'test_case' ? { scope: 'test_case', testCaseId: command.scope.testCaseId } : { scope: 'all' };
}

function elapsed(startedAt: number, dependencies: RunLocalEvalSuiteDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
