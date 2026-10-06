import type { ExecuteEvalRunCommand } from './command.js';
import type { ExecuteEvalRunResult } from './result.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { Attempt, RunState, ToolEvidence, TurnEvidence } from '../run-history/contracts.js';
import type { ExecutionEvent } from '../run-execution/contracts.js';
import { normalizeGraderOutcome, normalizeGraderOutcomes } from '../run-execution/attempt-evidence.js';
import { boundedJson, attempt as validAttempt } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
import { reviewSources } from './review-sources.js';

const MAX_DIAGNOSTICS = 20;
const SAFE_REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SAFE_REASONS = new Set(['runner-absent', 'runner-unavailable', 'runner-start-failed', 'runner-exited',
  'runner-protocol-invalid', 'runner-timeout', 'runner-limit', 'runner-request-too-large',
  'required-setting-rejected', 'environment-missing', 'environment-undeclared', 'evidence-limit-exceeded',
  'unavailable', 'invalid-transition', 'limit-exceeded', 'corrupt']);
class PersistenceStopped extends Error {}
class EvidenceLimitStopped extends Error {}
type Current = { caseId: string; number: number; began: number; turns: TurnEvidence[]; tools: ToolEvidence[];
  graders: Extract<ExecutionEvent, { type: 'grader-completed' }>[]; output: string; diagnostics: string[] };

export async function executeEvalRun(command: ExecuteEvalRunCommand, ports: ExecuteEvalRunDependencies): Promise<ExecuteEvalRunResult> {
  const { suite, runId, cases } = command;
  const began = ports.clock();
  const log = (event: 'eval_run_started' | 'eval_run_finished' | 'eval_run_start_blocked' | 'eval_run_storage_failed',
    outcome: 'started' | 'completed' | 'blocked' | 'partial' | 'interrupted' | 'failed', reason?: string): void => {
    try { ports.logger?.record({ event, stage: 'execution', outcome,
      ...(reason ? { reason: SAFE_REASONS.has(reason) ? reason : 'unavailable' } : {}),
      ...(typeof command.reference === 'string' && SAFE_REFERENCE.test(command.reference) ? { reference: command.reference } : {}),
      ...(SAFE_RUN_ID.test(runId) ? { runId } : {}), durationMs: Math.max(0, ports.clock() - began) });
    } catch { /* Noncritical sink. */ }
  };
  const started = await ports.store.start(suite.id, runId);
  if (started.status === 'blocked') { log('eval_run_start_blocked', 'blocked', started.reason); return { status: 'blocked', runId, reason: started.reason }; }
  log('eval_run_started', 'started');
  let current: Current | undefined;
  const runDiagnostics: string[] = [];
  const addDiagnostic = (items: string[], code: string): void => { if (items.length < MAX_DIAGNOSTICS) items.push(code); };
  let caseIndex = 0;
  let attemptNumber = 1;
  let completed = 0;
  let terminal: 'completed' | 'error' | 'interrupted' | undefined;
  const persist = async (attempt: Attempt): Promise<void> => {
    if (!boundedJson(attempt, LIMITS.attemptBytes) || !validAttempt(attempt)) throw new EvidenceLimitStopped();
    const result = await ports.store.append(suite.id, runId, attempt);
    if (result.status !== 'ok') throw result.reason === 'limit-exceeded' ? new EvidenceLimitStopped() : new PersistenceStopped();
  };
  const evidence = (outcome: Attempt['outcome'], assertions: Attempt['assertions'] = [], calls: number | null = null, cost: number | null = null): Attempt => {
    if (!current) throw new Error('missing-attempt');
    return { version: 1, suiteId: suite.id, runId, caseId: current.caseId, number: current.number, outcome,
      durationMs: Math.max(0, ports.clock() - current.began), calls, cost, output: current.output,
      truncated: false, diagnostics: [...current.diagnostics], turns: [...current.turns], tools: [...current.tools], assertions,
      review: reviewSources(command, current.caseId) };
  };
  const consume = async (event: ExecutionEvent): Promise<void> => {
    if (terminal) throw new Error('event-after-terminal');
    if (event.type === 'case-started') {
      if (current || cases[caseIndex]?.id !== event.caseId || (event.attempt ?? 1) !== attemptNumber) throw new Error('attempt-order');
      current = { caseId: event.caseId, number: attemptNumber, began: ports.clock(), turns: [], tools: [], graders: [], output: '', diagnostics: [] };
      await persist(evidence('incomplete'));
    } else if (event.type === 'turn-completed') {
      if (!current || current.caseId !== event.caseId || (event.attempt ?? 1) !== current.number
        || (event.turnIndex ?? current.turns.length) !== current.turns.length || current.turns.some(turn => turn.id === event.turnId)) throw new Error('turn-order');
      current.output = event.output;
      current.turns.push({ id: event.turnId, role: 'assistant', content: event.output });
      await persist(evidence('incomplete'));
    } else if (event.type === 'tool-recorded') {
      if (!current || current.caseId !== event.caseId || event.attempt !== current.number
        || event.position !== current.tools.length || !current.turns.some(turn => turn.id === event.turnId)
        || current.tools.some(tool => tool.id === event.toolId)) throw new Error('tool-order');
      current.tools.push({ id: event.toolId, name: event.name, arguments: event.arguments, result: event.result,
        turnId: event.turnId, position: event.position, outcome: event.outcome });
      await persist(evidence('incomplete'));
    } else if (event.type === 'grader-completed') {
      if (!current || current.caseId !== event.caseId || event.attempt !== current.number
        || current.graders.some(item => item.checkId === event.checkId)) throw new Error('grader-order');
      const grader = cases[caseIndex]?.graders.find(item => item.id === event.checkId);
      if (!grader) throw new Error('grader-result-invalid');
      const result = normalizeGraderOutcome(grader, event, command.judgeModel ?? null);
      const previous = current.graders.map(item => normalizeGraderOutcome(
        cases[caseIndex]!.graders.find(grader => grader.id === item.checkId)!, item, command.judgeModel ?? null));
      current.graders.push(event);
      await persist(evidence('incomplete', [...previous, result]));
    } else if (event.type === 'case-completed') {
      if (!current || current.caseId !== event.caseId || (event.attempt ?? 1) !== current.number) throw new Error('attempt-order');
      if (event.status === 'completed') {
        if (current.turns.length !== cases[caseIndex]!.turns.length) throw new Error('missing-turn');
        const selected = cases[caseIndex]!;
        const assertions = ports.evaluator.evaluate(selected.assertions, { output: current.output, turns: current.turns, tools: current.tools });
        if (assertions.length !== selected.assertions.length || new Set(assertions.map(item => item.id)).size !== assertions.length
          || selected.assertions.some(item => !assertions.some(result => result.id === item.id))) throw new Error('assertion-results-invalid');
        const graders = normalizeGraderOutcomes(selected.graders, current.graders, command.judgeModel ?? null);
        const results = [...assertions, ...graders];
        await persist(evidence(results.every(item => item.outcome === 'passed') ? 'passed' : 'failed', results,
          event.calls ?? null, event.cost ?? null));
        completed++;
        current = undefined;
        caseIndex++;
      } else {
        addDiagnostic(current.diagnostics, 'case-error');
        await persist(evidence('incomplete'));
      }
    } else if (event.type === 'diagnostic') {
      addDiagnostic(runDiagnostics, event.code);
      if (current && event.caseId === current.caseId && (event.attempt === undefined || event.attempt === current.number)) {
        addDiagnostic(current.diagnostics, event.code);
        await persist(evidence('incomplete'));
      }
    } else if (event.type === 'run-completed') terminal = event.status;
  };
  try {
    const outcome = await ports.runner.execute(command, consume);
    const status: Exclude<RunState, 'queued' | 'running'> = outcome.status === 'blocked' && completed === 0 ? 'blocked'
      : outcome.status === 'interrupted' ? 'interrupted'
      : outcome.status === 'completed' && terminal === 'completed' && completed === cases.length ? 'completed'
      : completed ? 'partial' : 'error';
    const reason = outcome.reason ? SAFE_REASONS.has(outcome.reason) ? outcome.reason : 'unavailable' : undefined;
    if (reason) addDiagnostic(runDiagnostics, reason);
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics);
    if (finished.status === 'blocked') { log('eval_run_storage_failed', 'failed', finished.reason); return { status: 'storage-failed', runId, reason: finished.reason }; }
    log('eval_run_finished', status === 'error' ? 'failed' : status, reason);
    return { status, runId, ...(reason ? { reason } : {}) };
  } catch (error) {
    if (error instanceof PersistenceStopped) { log('eval_run_storage_failed', 'failed', 'unavailable'); return { status: 'storage-failed', runId }; }
    const status = completed ? 'partial' : 'error';
    const reason = error instanceof EvidenceLimitStopped ? 'evidence-limit-exceeded' : 'runner-protocol-invalid';
    addDiagnostic(runDiagnostics, reason);
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics);
    if (finished.status === 'blocked') { log('eval_run_storage_failed', 'failed', finished.reason); return { status: 'storage-failed', runId, reason: finished.reason }; }
    log('eval_run_finished', status === 'error' ? 'failed' : status, reason);
    return { status, runId, reason };
  }
}
