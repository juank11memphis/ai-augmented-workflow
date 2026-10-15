import type { PreviewEvalRunCommand } from './command.js';
import type { PreviewEvalRunResult, PreviewStage } from './result.js';
import type { ArtifactReadinessPort, CaseInputResolverPort, PreviewOutcomeLoggerPort, RunnerDescriptorPort, SuiteRuntimeRegistryPort } from './ports.js';
import type { SelectionBlockReason } from '../resolve-eval-run-selection/result.js';
import { resolveRunSnapshot } from '../resolve-run-snapshot.js';
import type { NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';

export type PreviewEvalRunDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort;
  readonly artifacts: ArtifactReadinessPort;
  readonly inputs: CaseInputResolverPort;
  readonly logger?: PreviewOutcomeLoggerPort;
};
export async function previewEvalRun(command: PreviewEvalRunCommand, dependencies: PreviewEvalRunDependencies): Promise<PreviewEvalRunResult> {
  const started = Date.now();
  const log = (event: 'eval_preview_started' | 'eval_preview_blocked' | 'eval_preview_failed' | 'eval_preview_completed',
    stage: 'preview' | PreviewStage, outcome: 'started' | 'blocked' | 'failed' | 'completed',
    reason?: SelectionBlockReason | 'unknown-cause'): void => {
    try { dependencies.logger?.record({ event, stage, outcome, reason, durationMs: Date.now() - started }); } catch { /* Noncritical sink. */ }
  };
  log('eval_preview_started', 'preview', 'started');
  let stage: PreviewStage = 'selection';
  const blocked = (reason: SelectionBlockReason, caseId?: string, role?: 'tested' | 'judge'): PreviewEvalRunResult => {
    log('eval_preview_blocked', stage, 'blocked', reason);
    return { status: 'blocked', stage, reason, ...(caseId ? { caseId } : {}), ...(role ? { role } : {}) };
  };
  try {
    const snapshot = await resolveRunSnapshot({ suiteId: command.suiteId, scope: command.scope,
      ...(command.runOnly ? { runOnly: command.runOnly } : {}) }, {
      suites: dependencies.suites,
      runner: { describe: async suite => { stage = 'description'; return dependencies.runner.describe(suite); } },
    });
    if (snapshot.selection.status === 'blocked') {
      if (snapshot.selection.reason === 'missing-suite-default' || snapshot.selection.reason === 'case-unavailable'
        || snapshot.selection.reason === 'suite-unavailable' || snapshot.selection.reason.startsWith('run-only-')
        || snapshot.selection.reason === 'invalid-run-only-choice') stage = 'selection';
      return blocked(snapshot.selection.reason, snapshot.selection.caseId, snapshot.selection.role);
    }
    const suite = snapshot.suite!;
    const cases: readonly NormalizedEvalTestCase[] = snapshot.selection.cases.map(selected => suite.testCases.find(item => item.id === selected.caseId)!);
    stage = 'artifact-readiness';
    const readiness = await dependencies.artifacts.check();
    if (readiness.status === 'blocked') return blocked(readiness.reason);
    stage = 'resolved-inputs';
    const resolved = await dependencies.inputs.resolve(cases);
    if (resolved.status === 'blocked') return blocked(resolved.reason);
    log('eval_preview_completed', 'preview', 'completed');
    return {
      status: 'ready', suiteId: suite.id, selectedCaseIds: cases.map((testCase) => testCase.id),
      model: snapshot.selection.cases[0]!.testedModel, judgeModel: snapshot.selection.cases[0]!.judgeModel,
      previewToken: snapshot.previewToken!,
    };
  } catch {
    log('eval_preview_failed', stage, 'failed', 'unknown-cause');
    return { status: 'error', stage, reason: 'unknown-cause' };
  }
}
