import type { StartEvalRunCommand } from './command.js';
import type { StartEvalRunResult } from './result.js';
import type { StartEvalRunDependencies } from './ports.js';
import { resolveRunSnapshot } from '../resolve-run-snapshot.js';
import { logicalId } from '../run-history/validation.js';
import { orderedRunPlan } from '../run-execution/contracts.js';

const SAFE_REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SAFE_REASONS = new Set([
  'suite-unavailable', 'runner-unavailable', 'runner-absent', 'runner-start-failed', 'runner-exited',
  'runner-request-invalid', 'runner-protocol-invalid', 'runner-invalid', 'runner-timeout', 'environment-missing',
  'required-setting-rejected', 'runner-request-too-large', 'environment-undeclared',
  'capability-unsupported', 'model-unavailable', 'judge-unavailable', 'case-unavailable',
  'missing-suite-default', 'saved-model-unavailable', 'invalid-run-only-choice',
  'run-only-scope-unsupported', 'run-only-model-unavailable', 'suite-changed',
  'artifact-unsafe', 'artifact-not-ignored', 'artifact-tracked',
  'artifact-git-unavailable', 'artifact-root-unsafe', 'input-unsafe',
  'invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts', 'git-unavailable',
  'unverifiable-root', 'unavailable', 'not-found', 'corrupt', 'limit-exceeded',
  'invalid-transition', 'owner-unknown', 'index-stale', 'schedule-failed',
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
  const blocked = (reason: Extract<StartEvalRunResult, { status: 'blocked' }>['reason'], caseId?: string, role?: 'tested' | 'judge'): StartEvalRunResult => {
    log('blocked', reason);
    return { status: 'blocked', reason, ...(caseId ? { caseId } : {}), ...(role ? { role } : {}) };
  };
  try {
    if (!logicalId(command.suiteId)) return blocked('input-unsafe');
    const snapshot = await resolveRunSnapshot({ suiteId: command.suiteId, scope: command.scope,
      ...(command.runOnly ? { runOnly: command.runOnly } : {}) }, ports);
    if (snapshot.selection.status === 'blocked') return blocked(snapshot.selection.reason, snapshot.selection.caseId, snapshot.selection.role);
    if (command.previewToken && command.previewToken !== snapshot.previewToken) return blocked('suite-changed');
    const suite = snapshot.suite!;
    const cases = snapshot.selection.cases.map(selected => suite.testCases.find(item => item.id === selected.caseId)!);
    const caseSelections = orderedRunPlan(cases.map(item => item.id), snapshot.selection.cases);
    if (!caseSelections) return blocked('invalid-input');
    const model = snapshot.selection.cases[0]!.testedModel;
    const judgeModel = snapshot.selection.cases[0]!.judgeModel;
    const ready = await ports.artifacts.check();
    if (ready.status === 'blocked') return blocked(ready.reason);
    const inputs = await ports.inputs.resolve(cases);
    if (inputs.status === 'blocked') return blocked(inputs.reason);
    if (inputs.value.length !== cases.length || inputs.value.some((item, index) => item.id !== caseSelections[index]?.caseId)) return blocked('invalid-input');
    const queued = await ports.store.create({ suiteId: suite.id, caseIds: cases.map(item => item.id), scope: command.scope.type === 'all' ? 'all' : 'selected', testedModel: model, judgeModel, caseSelections });
    if (queued.status === 'blocked') return blocked(queued.reason);
    try { ports.scheduler.schedule({ runId: queued.value.runId, suite, cases: inputs.value, model, judgeModel, caseSelections, ...(reference ? { reference } : {}) }); }
    catch {
      await ports.store.finalize(suite.id, queued.value.runId, 'error', ['schedule-failed']);
      return blocked('schedule-failed');
    }
    log('queued', undefined, queued.value.runId);
    return { status: 'queued', suiteId: suite.id, runId: queued.value.runId };
  } catch { return blocked('unavailable'); }
}
