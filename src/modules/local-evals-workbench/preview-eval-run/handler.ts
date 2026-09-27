import type { PreviewEvalRunCommand } from './command.js';
import type { PreviewEvalRunResult } from './result.js';
import type { ArtifactReadinessPort, CaseInputResolverPort, PreviewLoggerPort, RunnerDescriptorPort, RunnerEstimatorPort, SuiteRuntimeRegistryPort } from './ports.js';
import { compatibleDescription, hasRubric, requiredCapabilities, type RuntimeBlockReason } from '../runtime-description.js';
import type { NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import { MAX_RUN_REPEATS } from '../run-configuration.js';

/** Hard upper bound avoids surprising spend and unsafe call arithmetic. */
export const MAX_PREVIEW_REPEATS = MAX_RUN_REPEATS;
export type PreviewEvalRunDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort & RunnerEstimatorPort;
  readonly artifacts: ArtifactReadinessPort;
  readonly inputs: CaseInputResolverPort;
  readonly logger?: PreviewLoggerPort;
};
export async function previewEvalRun(command: PreviewEvalRunCommand, dependencies: PreviewEvalRunDependencies): Promise<PreviewEvalRunResult> {
  const started = Date.now();
  const log = (event: string, reason?: string): void => {
    try { dependencies.logger?.record({ event, suiteId: command.suiteId, reason, durationMs: Date.now() - started }); } catch { /* Noncritical sink. */ }
  };
  log('eval_preview_started');
  const blocked = (reason: RuntimeBlockReason): PreviewEvalRunResult => {
    log('eval_preview_blocked', reason);
    return { status: 'blocked', reason };
  };
  try {
    const repeats = command.repeats ?? 1;
    if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > MAX_PREVIEW_REPEATS) return blocked('repeats-invalid');
    const suite = await dependencies.suites.load(command.suiteId);
    if (!suite) return blocked('suite-unavailable');
    let cases: readonly NormalizedEvalTestCase[];
    if (command.scope.type === 'all') cases = suite.testCases;
    else {
      const selectedId = command.scope.testCaseId;
      const selected = suite.testCases.find((testCase) => testCase.id === selectedId);
      if (!selected) return blocked('case-unavailable');
      cases = [selected];
    }
    if (!cases.length) return blocked('case-unavailable');
    const description = await dependencies.runner.describe(suite);
    if (description.status === 'blocked') return blocked(description.reason);
    const compatibility = compatibleDescription(suite, description.value);
    if (compatibility) return blocked(compatibility);
    if (requiredCapabilities(cases).some((capability) => !description.value.capabilities.includes(capability))) return blocked('capability-unsupported');
    if (!description.value.models.includes(command.model)) return blocked('model-unavailable');
    const judgeRequired = hasRubric(cases);
    const judge = judgeRequired ? command.judgeModel : null;
    if (judgeRequired && (!judge || !description.value.judgeModels.includes(judge))) return blocked('judge-unavailable');
    if (!judgeRequired && command.judgeModel) return blocked('judge-unavailable');
    const readiness = await dependencies.artifacts.check();
    if (readiness.status === 'blocked') return blocked(readiness.reason);
    const resolved = await dependencies.inputs.resolve(cases);
    if (resolved.status === 'blocked') return blocked(resolved.reason);
    const estimate = await dependencies.runner.estimate(suite, { model: command.model, judgeModel: judge ?? null, repeats, testCases: resolved.value });
    if (estimate.status === 'blocked') return blocked(estimate.reason);
    if (!description.value.costEstimation && estimate.value.cost.status === 'available') return blocked('estimate-invalid');
    log('eval_preview_completed');
    return {
      status: 'ready', suiteId: suite.id, selectedCaseIds: cases.map((testCase) => testCase.id),
      model: command.model, judgeModel: judge ?? null, repeats,
      targetCalls: estimate.value.targetCalls, judgeCalls: estimate.value.judgeCalls,
      totalCalls: estimate.value.totalCalls, cost: estimate.value.cost, requiresConfirmation: true,
    };
  } catch { return blocked('runner-unavailable'); }
}
