import type { ExecuteEvalRunCommand } from './command.js';
import type { ExecuteEvalRunResult } from './result.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { Attempt, RunState, TurnEvidence } from '../run-history/contracts.js';
import type { ExecutionEvent } from '../run-execution/contracts.js';

const MAX_DIAGNOSTICS = 20;

class PersistenceStopped extends Error {}

export async function executeEvalRun(command: ExecuteEvalRunCommand, ports: ExecuteEvalRunDependencies): Promise<ExecuteEvalRunResult> {
  const { suite, runId, cases } = command;
  const began = ports.clock();
  const log = (event: string, reason?: string): void => {
    try { ports.logger?.record({ event, suiteId: suite.id, reason, durationMs: ports.clock() - began }); } catch { /* Noncritical sink. */ }
  };
  const started = await ports.store.start(suite.id, runId);
  if (started.status === 'blocked') return { status: 'blocked', runId, reason: started.reason };
  log('eval_run_started');
  let current: { caseId: string; began: number; turns: TurnEvidence[]; output: string; diagnostics: string[] } | undefined;
  const runDiagnostics: string[] = [];
  const addDiagnostic = (items: string[], code: string): void => {
    if (items.length < MAX_DIAGNOSTICS) items.push(code);
  };
  let completed = 0;
  let terminal: 'completed' | 'error' | 'interrupted' | undefined;
  const persist = async (attempt: Attempt): Promise<void> => {
    const result = await ports.store.append(suite.id, runId, attempt);
    if (result.status !== 'ok') throw new PersistenceStopped();
  };
  const evidence = (outcome: Attempt['outcome'], assertions: Attempt['assertions'] = []): Attempt => {
    if (!current) throw new Error('missing-case');
    return { version: 1, suiteId: suite.id, runId, caseId: current.caseId, number: 1, outcome,
      durationMs: Math.max(0, ports.clock() - current.began), calls: null, cost: null,
      output: current.output, truncated: false, diagnostics: current.diagnostics, turns: current.turns, tools: [], assertions };
  };
  const consume = async (event: ExecutionEvent): Promise<void> => {
    if (event.type === 'case-started') {
      if (current || cases[completed]?.id !== event.caseId) throw new Error('case-order');
      current = { caseId: event.caseId, began: ports.clock(), turns: [], output: '', diagnostics: [] };
      await persist(evidence('incomplete'));
    } else if (event.type === 'turn-completed') {
      if (!current || current.caseId !== event.caseId || current.turns.length) throw new Error('turn-order');
      current.output = event.output;
      current.turns.push({ id: event.turnId, role: 'assistant', content: event.output });
      await persist(evidence('incomplete'));
    } else if (event.type === 'case-completed') {
      if (!current || current.caseId !== event.caseId) throw new Error('case-order');
      if (event.status === 'completed') {
        if (current.turns.length !== 1) throw new Error('missing-output');
        const selected = cases[completed];
        const assertions = ports.evaluator.evaluate(selected!.assertions, current.output, current.turns[0]!.id);
        await persist(evidence(assertions.every(assertion => assertion.outcome === 'passed') ? 'passed' : 'failed', assertions));
        completed++;
        current = undefined;
        log('eval_case_completed');
      } else {
        addDiagnostic(current.diagnostics, 'case-error');
        await persist(evidence('incomplete'));
      }
    } else if (event.type === 'diagnostic') {
      addDiagnostic(runDiagnostics, event.code);
      if (current && event.caseId === current.caseId) {
        addDiagnostic(current.diagnostics, event.code);
        await persist(evidence('incomplete'));
      }
    } else if (event.type === 'run-completed') {
      terminal = event.status;
    }
  };
  try {
    const outcome = await ports.runner.execute(command, consume);
    const status: Exclude<RunState, 'queued' | 'running'> = outcome.status === 'blocked' && completed === 0 ? 'blocked'
      : outcome.status === 'interrupted' ? 'interrupted'
      : outcome.status === 'completed' && terminal === 'completed' && completed === cases.length ? 'completed'
      : completed ? 'partial' : 'error';
    if (outcome.reason) addDiagnostic(runDiagnostics, outcome.reason);
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics);
    if (finished.status === 'blocked') return { status: 'storage-failed', runId, reason: finished.reason };
    log('eval_run_finished', status);
    return { status, runId, ...(outcome.reason ? { reason: outcome.reason } : {}) };
  } catch (error) {
    if (error instanceof PersistenceStopped) return { status: 'storage-failed', runId };
    const status = completed ? 'partial' : 'error';
    addDiagnostic(runDiagnostics, 'runner-invalid');
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics);
    if (finished.status === 'blocked') return { status: 'storage-failed', runId, reason: finished.reason };
    log('eval_run_finished', status);
    return { status, runId, reason: 'runner-invalid' };
  }
}
