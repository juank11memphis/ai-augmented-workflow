import type { HeadlessEvalRunCommand } from './command.js';
import type { HeadlessEvalRunDependencies } from './ports.js';
import type { HeadlessEvalRunResult } from './result.js';
import { resolveRunSnapshot } from '../resolve-run-snapshot.js';
import { logicalId } from '../run-history/validation.js';
import { failedAssertionLocators } from '../run-history/failed-assertion-locators.js';
import { orderedRunPlan } from '../run-execution/contracts.js';

const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SAFE_REASON = /^[a-z][a-z0-9-]{0,79}$/;
const TERMINAL = new Set(['completed', 'partial', 'blocked', 'error', 'interrupted']);

export async function headlessEvalRun(command: HeadlessEvalRunCommand, ports: HeadlessEvalRunDependencies): Promise<HeadlessEvalRunResult> {
  const began = (ports.clock ?? Date.now)();
  const scope = command.scope.type === 'all' ? 'all' : 'selected';
  let runId: string | undefined;
  const finish = (result: HeadlessEvalRunResult): HeadlessEvalRunResult => {
    const status = TERMINAL.has(result.status) ? result.status as Exclude<HeadlessEvalRunResult['status'], 'queued' | 'running'> : 'error';
    try {
      ports.logger?.record({ event: status === 'blocked' ? 'headless_eval_run_blocked' : 'headless_eval_run_finished',
        scope, status, ...(result.runId && SAFE_RUN_ID.test(result.runId) ? { runId: result.runId } : {}),
        ...(result.reason && SAFE_REASON.test(result.reason) ? { reason: result.reason } : {}),
        durationMs: Math.max(0, (ports.clock ?? Date.now)() - began) });
    } catch { /* Logging is not part of the run outcome. */ }
    return result;
  };
  const blocked = (reason: string, caseId?: string, role?: 'tested' | 'judge'): HeadlessEvalRunResult =>
    finish({ status: 'blocked', ...(runId ? { runId } : {}), reason, ...(caseId ? { caseId } : {}), ...(role ? { role } : {}) });
  try {
    if (!logicalId(command.suiteId) ||
      command.scope.type === 'test_case' && !logicalId(command.scope.testCaseId)) return blocked('invalid-input');
    const runOnly = command.runOnly ?? (command.model || command.judgeModel
      ? { ...(command.model ? { testedModel: command.model } : {}), ...(command.judgeModel ? { judgeModel: command.judgeModel } : {}) }
      : undefined);
    const snapshot = await resolveRunSnapshot({ suiteId: command.suiteId, scope: command.scope,
      ...(runOnly ? { runOnly } : {}) }, ports);
    if (snapshot.selection.status === 'blocked') return blocked(snapshot.selection.reason, snapshot.selection.caseId, snapshot.selection.role);
    const suite = snapshot.suite!;
    const cases = snapshot.selection.cases.map(selected => suite.testCases.find(item => item.id === selected.caseId));
    const resolvedCases = cases.filter((item): item is NonNullable<typeof item> => item !== undefined);
    if (resolvedCases.length !== cases.length) return blocked('invalid-selection');
    const caseSelections = orderedRunPlan(resolvedCases.map(item => item.id), snapshot.selection.cases);
    if (!caseSelections) return blocked('invalid-selection');
    const model = caseSelections[0]!.testedModel;
    const judgeModel = caseSelections[0]!.judgeModel;
    const ready = await ports.artifacts.check();
    if (ready.status === 'blocked') return blocked(ready.reason);
    const inputs = await ports.inputs.resolve(resolvedCases);
    if (inputs.status === 'blocked') return blocked(inputs.reason);
    if (!orderedRunPlan(inputs.value.map(item => item.id), caseSelections)) return blocked('invalid-selection');
    const created = await ports.store.create({ suiteId: suite.id, caseIds: resolvedCases.map(item => item.id), scope,
      testedModel: model, judgeModel, caseSelections });
    if (created.status === 'blocked') return blocked(created.reason);
    runId = created.value.runId;
    const execution = await ports.executor.execute({ runId, suite, cases: inputs.value,
      model, judgeModel, caseSelections });
    const read = await ports.reader.get(suite.id, runId);
    if (read.status === 'blocked') return blocked(read.reason === 'not-found' ? 'missing-artifact' : read.reason);
    const manifest = read.value.summary;
    if (manifest.runId !== runId || manifest.suiteId !== suite.id) return blocked('corrupt-artifact');
    const reason = execution.reason && SAFE_REASON.test(execution.reason) ? execution.reason : undefined;
    if (manifest.state === 'queued' || manifest.state === 'running' || execution.status === 'storage-failed') {
      return finish({ status: 'error', runId, reason: reason ?? 'nonterminal-artifact' });
    }
    if (manifest.state !== execution.status || execution.runId !== runId) return finish({ status: 'error', runId, reason: 'persisted-state-mismatch' });
    return finish({ status: manifest.state, runId, ...(reason ? { reason } : {}), outcome: manifest.outcome,
      cases: await failedAssertionLocators(manifest, ports.reader),
      diagnostics: manifest.diagnostics.slice(0, 5).filter(item => SAFE_REASON.test(item)) });
  } catch { return finish({ status: 'error', ...(runId ? { runId } : {}), reason: 'unavailable' }); }
}
