import type { HeadlessEvalRunCommand } from './command.js';
import type { HeadlessEvalRunDependencies } from './ports.js';
import type { HeadlessEvalRunResult } from './result.js';
import { compatibleDescription, hasRubric, requiredCapabilities } from '../runtime-description.js';
import { logicalId } from '../run-history/validation.js';
import { failedAssertionLocators } from '../run-history/failed-assertion-locators.js';

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
  const blocked = (reason: string): HeadlessEvalRunResult => finish({ status: 'blocked', ...(runId ? { runId } : {}), reason });
  try {
    if (!logicalId(command.suiteId) || !command.model ||
      command.scope.type === 'test_case' && !logicalId(command.scope.testCaseId)) return blocked('invalid-input');
    const suite = await ports.suites.load(command.suiteId);
    if (!suite) return blocked('suite-unavailable');
    const selectedId = command.scope.type === 'test_case' ? command.scope.testCaseId : undefined;
    const cases = selectedId === undefined ? suite.testCases : suite.testCases.filter(item => item.id === selectedId);
    if (!cases.length || scope === 'selected' && cases.length !== 1) return blocked('case-unavailable');
    const described = await ports.runner.describe(suite);
    if (described.status === 'blocked') return blocked(described.reason);
    const incompatibility = compatibleDescription(suite, described.value);
    if (incompatibility) return blocked(incompatibility);
    if (requiredCapabilities(cases).some(capability => !described.value.capabilities.includes(capability))) return blocked('capability-unsupported');
    if (!described.value.models.includes(command.model)) return blocked('model-unavailable');
    const judgeRequired = hasRubric(cases);
    if (judgeRequired && (!command.judgeModel || !described.value.judgeModels.includes(command.judgeModel)) ||
      !judgeRequired && command.judgeModel) return blocked('judge-unavailable');
    const ready = await ports.artifacts.check();
    if (ready.status === 'blocked') return blocked(ready.reason);
    const inputs = await ports.inputs.resolve(cases);
    if (inputs.status === 'blocked') return blocked(inputs.reason);
    const created = await ports.store.create({ suiteId: suite.id, caseIds: cases.map(item => item.id), scope,
      testedModel: command.model, judgeModel: command.judgeModel ?? null });
    if (created.status === 'blocked') return blocked(created.reason);
    runId = created.value.runId;
    const execution = await ports.executor.execute({ runId, suite, cases: inputs.value,
      model: command.model, judgeModel: command.judgeModel ?? null });
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
