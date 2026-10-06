import type { StartEvalRunCommand } from './command.js';
import type { StartEvalRunResult } from './result.js';
import type { StartEvalRunDependencies } from './ports.js';
import { compatibleDescription, hasRubric, requiredCapabilities } from '../runtime-description.js';
import { logicalId } from '../run-history/validation.js';

const SAFE_REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SAFE_REASONS = new Set([
  'suite-unavailable', 'runner-unavailable', 'runner-absent', 'runner-start-failed', 'runner-exited',
  'runner-request-invalid', 'runner-protocol-invalid', 'runner-invalid', 'runner-timeout', 'environment-missing',
  'required-setting-rejected', 'runner-request-too-large', 'environment-undeclared',
  'capability-unsupported', 'model-unavailable', 'judge-unavailable', 'case-unavailable',
  'artifact-unsafe', 'artifact-not-ignored', 'artifact-tracked',
  'artifact-git-unavailable', 'artifact-root-unsafe', 'estimate-invalid', 'input-unsafe',
  'invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts', 'git-unavailable',
  'unverifiable-root', 'unavailable', 'not-found', 'corrupt', 'limit-exceeded',
  'invalid-transition', 'owner-unknown', 'index-stale', 'review-stale', 'schedule-failed',
]);

export async function startEvalRun(command: StartEvalRunCommand, ports: StartEvalRunDependencies): Promise<StartEvalRunResult> {
  const began = Date.now();
  const reference = typeof command.reference === 'string' && SAFE_REFERENCE.test(command.reference) ? command.reference : undefined;
  const log = (outcome: 'blocked' | 'queued', reason?: string, runId?: string): void => {
    try {
      ports.logger?.record({ event: outcome === 'queued' ? 'eval_run_queued' : 'eval_run_start_blocked',
        stage: 'run-start', outcome, ...(reason ? { reason: SAFE_REASONS.has(reason) ? reason as Extract<StartEvalRunResult, { status: 'blocked' }>['reason'] : 'unavailable' } : {}),
        ...(reference ? { reference } : {}), ...(runId && SAFE_RUN_ID.test(runId) ? { runId } : {}),
        durationMs: Math.max(0, Date.now() - began) });
    } catch { /* Noncritical sink. */ }
  };
  const blocked = (reason: Extract<StartEvalRunResult, { status: 'blocked' }>['reason']): StartEvalRunResult => {
    log('blocked', reason);
    return { status: 'blocked', reason };
  };
  try {
    if (!logicalId(command.suiteId) || !command.model) return blocked('input-unsafe');
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
    const estimate = await ports.runner.estimate(suite, { model: command.model, judgeModel: judgeModel ?? null, testCases: inputs.value });
    if (estimate.status === 'blocked') return blocked(estimate.reason);
    if (!description.value.costEstimation && estimate.value.cost.status === 'available') return blocked('estimate-invalid');
    const snapshot = { selectedCaseIds: cases.map(item => item.id), ...estimate.value };
    if (JSON.stringify(snapshot) !== JSON.stringify(command.review)) return blocked('review-stale');
    const queued = await ports.store.create({ suiteId: suite.id, caseIds: snapshot.selectedCaseIds, scope: command.scope.type === 'all' ? 'all' : 'selected', testedModel: command.model, judgeModel: judgeModel ?? null });
    if (queued.status === 'blocked') return blocked(queued.reason);
    try { ports.scheduler.schedule({ runId: queued.value.runId, suite, cases: inputs.value, model: command.model, judgeModel: judgeModel ?? null, ...(reference ? { reference } : {}) }); }
    catch {
      await ports.store.finalize(suite.id, queued.value.runId, 'error', ['schedule-failed']);
      return blocked('schedule-failed');
    }
    log('queued', undefined, queued.value.runId);
    return { status: 'queued', suiteId: suite.id, runId: queued.value.runId };
  } catch { return blocked('unavailable'); }
}
