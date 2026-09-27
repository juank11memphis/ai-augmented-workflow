import type { StartEvalRunCommand } from './command.js';
import type { StartEvalRunResult } from './result.js';
import type { StartEvalRunDependencies } from './ports.js';
import { compatibleDescription, hasRubric, requiredCapabilities } from '../runtime-description.js';
import { logicalId } from '../run-history/validation.js';
import { MAX_RUN_REPEATS } from '../run-configuration.js';

export async function startEvalRun(command: StartEvalRunCommand, ports: StartEvalRunDependencies): Promise<StartEvalRunResult> {
  const began = Date.now();
  const log = (event: string, reason?: string): void => {
    try { ports.logger?.record({ event, suiteId: command.suiteId, reason, durationMs: Date.now() - began }); } catch { /* Noncritical sink. */ }
  };
  const blocked = (reason: Extract<StartEvalRunResult, { status: 'blocked' }>['reason']): StartEvalRunResult => {
    log('eval_run_start_blocked', reason);
    return { status: 'blocked', reason };
  };
  try {
    const repeats = command.repeats ?? 1;
    if (!logicalId(command.suiteId) || !command.model || !Number.isSafeInteger(repeats) || repeats < 1 || repeats > MAX_RUN_REPEATS) return blocked('input-unsafe');
    const suite = await ports.suites.load(command.suiteId);
    if (!suite) return blocked('suite-unavailable');
    const selectedId = command.scope.type === 'test_case' ? command.scope.testCaseId : undefined;
    const cases = selectedId === undefined ? suite.testCases : suite.testCases.filter(item => item.id === selectedId);
    if (!cases.length || command.scope.type === 'test_case' && cases.length !== 1) return blocked('case-unavailable');
    const description = await ports.runner.describe(suite);
    if (description.status === 'blocked') return blocked(description.reason);
    const compatibility = compatibleDescription(suite, description.value);
    if (compatibility) return blocked(compatibility);
    if (requiredCapabilities(cases).some(capability => !description.value.capabilities.includes(capability))) return blocked('capability-unsupported');
    if (!description.value.models.includes(command.model)) return blocked('model-unavailable');
    const judgeRequired = hasRubric(cases);
    const judgeModel = judgeRequired ? command.judgeModel : null;
    if (judgeRequired && (!judgeModel || !description.value.judgeModels.includes(judgeModel)) || !judgeRequired && command.judgeModel) return blocked('judge-unavailable');
    const ready = await ports.artifacts.check();
    if (ready.status === 'blocked') return blocked(ready.reason);
    const inputs = await ports.inputs.resolve(cases);
    if (inputs.status === 'blocked') return blocked(inputs.reason);
    const estimate = await ports.runner.estimate(suite, { model: command.model, judgeModel: judgeModel ?? null, repeats, testCases: inputs.value });
    if (estimate.status === 'blocked') return blocked(estimate.reason);
    if (!description.value.costEstimation && estimate.value.cost.status === 'available') return blocked('estimate-invalid');
    const snapshot = { selectedCaseIds: cases.map(item => item.id), ...estimate.value };
    if (JSON.stringify(snapshot) !== JSON.stringify(command.review)) return blocked('review-stale');
    const queued = await ports.store.create({ suiteId: suite.id, caseIds: snapshot.selectedCaseIds, scope: command.scope.type === 'all' ? 'all' : 'selected', testedModel: command.model, judgeModel: judgeModel ?? null, repeats });
    if (queued.status === 'blocked') return blocked(queued.reason);
    try { ports.scheduler.schedule({ runId: queued.value.runId, suite, cases: inputs.value, model: command.model, judgeModel: judgeModel ?? null, repeats }); }
    catch {
      await ports.store.finalize(suite.id, queued.value.runId, 'error', ['schedule-failed']);
      return blocked('schedule-failed');
    }
    log('eval_run_queued');
    return { status: 'queued', suiteId: suite.id, runId: queued.value.runId };
  } catch { return blocked('unavailable'); }
}
