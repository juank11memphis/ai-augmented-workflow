import type { ExecuteEvalRunCommand } from './command.js';
import type { ExecuteEvalRunResult } from './result.js';
import type { ExecuteEvalRunDependencies } from './ports.js';
import type { Attempt, DiagnosticLink, FailureProvenance, ModelCallLifecycle, ProviderResponseGap, ProviderResponseReference, RunState, SourceReference, ToolEvidence, TurnEvidence } from '../run-history/contracts.js';
import type { ExecutionEvent, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import { normalizeGraderOutcome, normalizeGraderOutcomes, validJudgeSource } from '../run-execution/attempt-evidence.js';
import { boundedJson, attempt as validAttempt, logicalId } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
import { reviewSources } from './review-sources.js';
import { executionBatches } from '../run-execution/batches.js';
import { validDiagnosticLink, validFailureProvenance } from '../run-history/failure-provenance.js';

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
  operationalError?: { code: string; message: string };
  graders: Extract<ExecutionEvent, { type: 'grader-completed' }>[]; output: string; diagnostics: string[]; diagnosticLinks: DiagnosticLink[];
  gradingErrors: Extract<ExecutionEvent, { type: 'grading-error' }>[];
  sourceRecords: SourceReference[]; sourceGaps: { reason: 'incomplete' | 'capture-failed'; recordId?: string }[];
  providerResponses: ProviderResponseReference[]; providerResponseGaps: ProviderResponseGap[]; modelCalls: ModelCallLifecycle[] };

function validResponseLink(current: Current | undefined, event: Extract<ExecutionEvent,
  { type: 'provider-response-observed' | 'provider-response-gap' }>, rubricChecks: readonly string[]): current is Current {
  return !!current && current.caseId === event.caseId && current.number === event.attempt
    && logicalId(event.callId) && logicalId(event.provisionalTurnId)
    && (event.role === undefined || event.role === 'tested-model' || event.role === 'judge')
    && (event.role === 'judge' ? logicalId(event.checkId) && rubricChecks.includes(event.checkId)
      : event.checkId === undefined)
    && !current.providerResponses.some(item => item.callId === event.callId)
    && !current.providerResponseGaps.some(item => item.callId === event.callId);
}

function observedFailure(outcome: RunnerExecutionOutcome, terminal: 'completed' | 'error' | 'interrupted' | undefined): FailureProvenance | undefined {
  if (outcome.failureProvenance !== undefined) {
    if (!validFailureProvenance(outcome.failureProvenance) || outcome.status === 'completed'
      || outcome.failureProvenance.runnerReport && outcome.failureProvenance.runnerReport.status !== terminal)
      throw new Error('invalid-failure-provenance');
    return outcome.failureProvenance;
  }
  if (terminal === 'error' || terminal === 'interrupted') return { stage: 'runner-report', runnerReport: { status: terminal } };
  if (outcome.reason === 'runner-exited') return { stage: 'unexpected-process-exit', processExit: { code: null } };
  if (outcome.reason === 'runner-timeout') return { stage: 'timeout' };
  if (outcome.reason === 'runner-protocol-invalid') return { stage: 'protocol-rejection' };
  return undefined;
}

export async function executeEvalRun(command: ExecuteEvalRunCommand, ports: ExecuteEvalRunDependencies): Promise<ExecuteEvalRunResult> {
  const { suite, runId, cases } = command;
  const batches = executionBatches(command);
  const began = ports.clock();
  const log = (event: 'eval_run_started' | 'eval_run_finished' | 'eval_run_start_blocked' | 'eval_run_storage_failed',
    outcome: 'started' | 'completed' | 'blocked' | 'partial' | 'interrupted' | 'failed', reason?: string): void => {
    try { ports.logger?.record({ event, stage: 'execution', outcome,
      ...(reason ? { reason: SAFE_REASONS.has(reason) ? reason : 'unavailable' } : {}),
      ...(typeof command.reference === 'string' && SAFE_REFERENCE.test(command.reference) ? { reference: command.reference } : {}),
      ...(SAFE_RUN_ID.test(runId) ? { runId } : {}), durationMs: Math.max(0, ports.clock() - began) });
    } catch { /* Noncritical sink. */ }
  };
  if (!batches) { log('eval_run_start_blocked', 'blocked', 'runner-protocol-invalid'); return { status: 'blocked', runId, reason: 'runner-protocol-invalid' }; }
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
  let activeJudge: string | null = null;
  let activeModel = command.model;
  const persist = async (attempt: Attempt): Promise<void> => {
    if (!boundedJson(attempt, LIMITS.attemptBytes) || !validAttempt(attempt)) throw new EvidenceLimitStopped();
    const result = await ports.store.append(suite.id, runId, attempt);
    if (result.status !== 'ok') throw result.reason === 'limit-exceeded' ? new EvidenceLimitStopped() : new PersistenceStopped();
  };
  const evidence = (outcome: Attempt['outcome'], assertions: Attempt['assertions'] = [], calls: number | null = null,
    cost: number | null = null, failureProvenance?: FailureProvenance): Attempt => {
    if (!current) throw new Error('missing-attempt');
    const visibleAssertions = assertions.length ? assertions : [
      ...current.graders.map(item => normalizeGraderOutcome(
        cases[caseIndex]!.graders.find(grader => grader.id === item.checkId)!, item, activeJudge)),
      ...current.gradingErrors.map(item => ({
      id: item.checkId, kind: 'grader' as const, outcome: 'incomplete' as const, score: null,
      expected: 'rubric judgment', actual: '', diagnostics: [item.code], turnIds: [], toolIds: [], gradingError: { code: item.code } })),
    ];
    return { version: 1, suiteId: suite.id, runId, caseId: current.caseId, number: current.number, outcome,
      durationMs: Math.max(0, ports.clock() - current.began), calls, cost, output: current.output,
      truncated: false, diagnostics: [...current.diagnostics], diagnosticLinks: [...current.diagnosticLinks],
      ...(failureProvenance ? { failureProvenance } : {}), turns: [...current.turns], tools: [...current.tools], assertions: visibleAssertions,
      ...(current.operationalError ? { operationalError: current.operationalError } : {}),
      sourceCapture: { records: [...current.sourceRecords], gaps: [...current.sourceGaps] },
      ...(current.providerResponses.length || current.providerResponseGaps.length ? { providerResponses: {
        records: [...current.providerResponses], gaps: [...current.providerResponseGaps] } } : {}),
      ...(current.modelCalls.length ? { modelCalls: current.modelCalls.map(call => ({ ...call })) } : {}),
      review: reviewSources(command, current.caseId) };
  };
  const closePendingObservation = (source: ModelCallLifecycle['terminationSource']): void => {
    if (!current) return;
    current.modelCalls = current.modelCalls.map(call => call.status === 'pending'
      ? { ...call, observedUntilMs: Math.max(call.startedAtMs, ports.clock()), terminationSource: source } : call);
  };
  const consume = async (event: ExecutionEvent): Promise<void> => {
    if (terminal) throw new Error('event-after-terminal');
    if (event.type === 'case-started') {
      if (current || cases[caseIndex]?.id !== event.caseId || (event.attempt ?? 1) !== attemptNumber) throw new Error('attempt-order');
      current = { caseId: event.caseId, number: attemptNumber, began: ports.clock(), turns: [], tools: [], graders: [], gradingErrors: [], output: '', diagnostics: [], diagnosticLinks: [], sourceRecords: [], sourceGaps: [], providerResponses: [], providerResponseGaps: [], modelCalls: [] };
      await persist(evidence('incomplete'));
    } else if (event.type === 'model-call-started') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt
        || !logicalId(event.callId) || !logicalId(event.provisionalTurnId)
        || current.modelCalls.some(call => call.callId === event.callId) || current.modelCalls.length >= LIMITS.evidenceItems
        || (event.role === 'judge' ? event.phase !== 'judge' || event.modelId !== activeJudge
          || !cases[caseIndex]!.graders.some(item => item.type === 'rubric' && item.id === event.checkId)
          : event.role !== 'tested-model' || event.checkId !== undefined || event.modelId !== activeModel
            || !['initial', 'post-tool'].includes(event.phase))) throw new Error('model-call-link');
      current.modelCalls.push({ callId: event.callId, provisionalTurnId: event.provisionalTurnId,
        role: event.role, ...(event.checkId ? { checkId: event.checkId } : {}), modelId: event.modelId,
        phase: event.phase, startedAtMs: ports.clock(), status: 'pending' });
      await persist(evidence('incomplete'));
    } else if (event.type === 'model-call-ended') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt) throw new Error('model-call-link');
      const index = current.modelCalls.findIndex(call => call.callId === event.callId && call.status === 'pending');
      if (index < 0 || !['completed', 'failed', 'cancelled'].includes(event.status)
        || (event.status === 'completed' ? event.terminationSource !== undefined
          : !['application-deadline', 'provider-timeout', 'runner-failure', 'unknown'].includes(String(event.terminationSource))))
        throw new Error('model-call-end');
      const call = current.modelCalls[index]!;
      current.modelCalls[index] = { ...call, status: event.status, endedAtMs: Math.max(call.startedAtMs, ports.clock()),
        ...(event.terminationSource ? { terminationSource: event.terminationSource } : {}) };
      await persist(evidence('incomplete'));
    } else if (event.type === 'provider-response-observed') {
      if (!validResponseLink(current, event, cases[caseIndex]!.graders.filter(item => item.type === 'rubric').map(item => item.id))
        || event.role === 'judge' && !activeJudge || !(event.bytes instanceof Uint8Array)
        || event.contentType !== undefined && (typeof event.contentType !== 'string' || Buffer.byteLength(event.contentType) > 256)
        || event.originalByteLength !== undefined && (!Number.isSafeInteger(event.originalByteLength)
          || event.originalByteLength < event.bytes.byteLength)
        || event.completeness === 'complete' && event.originalByteLength !== undefined
          && event.originalByteLength !== event.bytes.byteLength) throw new Error('provider-response-link');
      let saved: Awaited<ReturnType<NonNullable<typeof ports.store.saveProviderResponse>>> =
        { status: 'blocked', reason: 'unavailable' };
      try {
        if (ports.store.saveProviderResponse) saved = await ports.store.saveProviderResponse({
          suiteId: suite.id, runId, caseId: current.caseId, attempt: current.number, callId: event.callId,
          provisionalTurnId: event.provisionalTurnId, bytes: event.bytes, completeness: event.completeness,
          ...(event.role === undefined ? {} : { role: event.role }),
          ...(event.checkId === undefined ? {} : { checkId: event.checkId }),
          ...(event.contentType === undefined ? {} : { contentType: event.contentType }),
          ...(event.originalByteLength === undefined ? {} : { originalByteLength: event.originalByteLength }),
        });
      } catch { /* A failed body write is a gap only if its checkpoint can be saved. */ }
      if (saved.status === 'ok') {
        const reference = saved.value;
        if (reference.callId !== event.callId || reference.provisionalTurnId !== event.provisionalTurnId
          || reference.role !== undefined && reference.role !== event.role
          || reference.checkId !== undefined && reference.checkId !== event.checkId
          || reference.status !== event.completeness || reference.byteLength !== event.bytes.byteLength
          || reference.contentType !== event.contentType || reference.originalByteLength !== event.originalByteLength
          || !reference.locator) throw new PersistenceStopped();
        current.providerResponses.push({ ...reference,
          ...(event.role === undefined ? {} : { role: event.role }),
          ...(event.checkId === undefined ? {} : { checkId: event.checkId }) });
      } else {
        current.providerResponseGaps.push({ callId: event.callId, provisionalTurnId: event.provisionalTurnId,
          ...(event.role === undefined ? {} : { role: event.role }),
          ...(event.checkId === undefined ? {} : { checkId: event.checkId }), reason: 'not-persisted' });
        addDiagnostic(current.diagnostics, 'provider-response-capture-failed');
      }
      await persist(evidence('incomplete'));
    } else if (event.type === 'provider-response-gap') {
      if (!validResponseLink(current, event, cases[caseIndex]!.graders.filter(item => item.type === 'rubric').map(item => item.id))
        || event.role === 'judge' && !activeJudge
        || !['not-observed', 'not-emitted', 'capture-failed', 'incomplete'].includes(event.reason))
        throw new Error('provider-response-gap-link');
      current.providerResponseGaps.push({ callId: event.callId, provisionalTurnId: event.provisionalTurnId,
        ...(event.role === undefined ? {} : { role: event.role }),
        ...(event.checkId === undefined ? {} : { checkId: event.checkId }),
        ...(event.contentType === undefined ? {} : { contentType: event.contentType }),
        ...(event.originalByteLength === undefined ? {} : { originalByteLength: event.originalByteLength }),
        reason: event.reason });
      await persist(evidence('incomplete'));
    } else if (event.type === 'source-record') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt
        || ![...cases[caseIndex]!.assertions, ...cases[caseIndex]!.graders].some(item => item.id === event.record.checkId)
        || !current.turns.some(turn => turn.id === event.record.turnId)
        || current.sourceRecords.some(record => record.id === event.record.id)) throw new Error('source-record-link');
      if (event.record.kind === 'judge-exchange') {
        const record = event.record;
        const declared = cases[caseIndex]?.graders.find(item => item.id === record.checkId);
        const completed = current.graders.find(item => item.checkId === record.checkId);
        const failed = current.gradingErrors.find(item => item.checkId === record.checkId);
        if (!validJudgeSource(record) || declared?.type !== 'rubric' || record.judgeModel !== activeJudge
          || current.sourceRecords.some(item => item.kind === 'judge-exchange' && item.checkId === record.checkId)
          || event.sequence <= record.eventSequence
          || record.result.status === 'completed' && (!completed || completed.grader !== 'rubric'
            || completed.sequence === undefined || completed.sequence !== record.eventSequence
            || completed.score !== record.result.score || completed.threshold !== record.result.threshold
            || completed.passed !== record.result.passed)
          || record.result.status === 'grading-error' && (!failed || failed.sequence !== record.eventSequence
            || failed.code !== record.result.code)) throw new Error('source-judge-link');
      }
      const saved = ports.store.saveSourceRecord ? await ports.store.saveSourceRecord({ version: 1, suiteId: suite.id, runId, caseId: current.caseId,
        attempt: current.number, sequence: current.sourceRecords.length, record: event.record }) : { status: 'blocked' as const, reason: 'unavailable' as const };
      if (saved.status !== 'ok') {
        current.sourceGaps.push({ reason: 'capture-failed', recordId: event.record.id });
        addDiagnostic(current.diagnostics, 'source-evidence-incomplete');
      } else current.sourceRecords.push(saved.value);
      await persist(evidence('incomplete'));
    } else if (event.type === 'source-gap') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt) throw new Error('source-gap-link');
      current.sourceGaps.push({ reason: event.reason, ...(event.recordId ? { recordId: event.recordId } : {}) });
      addDiagnostic(current.diagnostics, 'source-evidence-incomplete');
      await persist(evidence('incomplete'));
    } else if (event.type === 'turn-completed') {
      if (!current || current.caseId !== event.caseId || (event.attempt ?? 1) !== current.number
        || (event.turnIndex ?? current.turns.length) !== current.turns.length || current.turns.some(turn => turn.id === event.turnId)
        || current.operationalError) throw new Error('turn-order');
      current.output = event.output;
      current.turns.push({ id: event.turnId, role: 'assistant', content: event.output });
      await persist(evidence('incomplete'));
    } else if (event.type === 'operational-error-observed') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt
        || !cases[caseIndex]?.expectedOutcome || current.operationalError || current.turns.length > 0
        || current.graders.length > 0 || !/^[a-z][a-z0-9-]{0,79}$/.test(event.error.code)
        || !event.error.message || Buffer.byteLength(event.error.message) > 500) throw new Error('operational-error-order');
      current.operationalError = { code: event.error.code, message: event.error.message };
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
      if (cases[caseIndex]?.expectedOutcome && (!current.operationalError || grader.type !== 'custom'
        || event.actualError?.code !== current.operationalError.code || event.actualError.message !== current.operationalError.message))
        throw new Error('grader-result-invalid');
      const result = normalizeGraderOutcome(grader, event, activeJudge);
      const previous = current.graders.map(item => normalizeGraderOutcome(
        cases[caseIndex]!.graders.find(grader => grader.id === item.checkId)!, item, activeJudge));
      current.graders.push(event);
      await persist(evidence('incomplete', [...previous, result]));
    } else if (event.type === 'grading-error') {
      if (!current || current.caseId !== event.caseId || current.number !== event.attempt
        || current.gradingErrors.some(item => item.checkId === event.checkId)
        || current.graders.some(item => item.checkId === event.checkId)
        || cases[caseIndex]?.graders.find(item => item.id === event.checkId)?.type !== 'rubric'
        || event.judgeModel !== activeJudge || !/^[a-z][a-z0-9-]{0,79}$/.test(event.code)) throw new Error('grading-error-link');
      current.gradingErrors.push(event);
      addDiagnostic(current.diagnostics, `grading-error-${event.code}`);
      await persist(evidence('incomplete'));
    } else if (event.type === 'case-completed') {
      if (!current || current.caseId !== event.caseId || (event.attempt ?? 1) !== current.number) throw new Error('attempt-order');
      if (event.sourceCapture === 'complete' && (current.sourceGaps.length > 0 || current.sourceRecords.length === 0)) throw new Error('source-capture-invalid');
      if (event.sourceCapture === 'incomplete') {
        if (current.sourceGaps.length === 0) current.sourceGaps.push({ reason: 'incomplete' });
        addDiagnostic(current.diagnostics, 'source-evidence-incomplete');
      }
      if (event.status === 'completed') {
        if (current.turns.length !== (cases[caseIndex]!.expectedOutcome ? 0 : cases[caseIndex]!.turns.length)
          || !!cases[caseIndex]!.expectedOutcome !== !!current.operationalError) throw new Error('missing-turn');
        const selected = cases[caseIndex]!;
        const assertions = ports.evaluator.evaluate(selected.assertions, { output: current.output, turns: current.turns, tools: current.tools });
        if (assertions.length !== selected.assertions.length || new Set(assertions.map(item => item.id)).size !== assertions.length
          || selected.assertions.some(item => !assertions.some(result => result.id === item.id))) throw new Error('assertion-results-invalid');
        const graders = normalizeGraderOutcomes(selected.graders, current.graders, activeJudge);
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
      if (!validDiagnosticLink({ code: event.code, ...(event.turnId ? { turnId: event.turnId } : {}),
        ...(event.callId ? { callId: event.callId } : {}) })) throw new Error('invalid-diagnostic');
      addDiagnostic(runDiagnostics, event.code);
      if (current && event.caseId === current.caseId && (event.attempt === undefined || event.attempt === current.number)) {
        if (current.diagnostics.length < MAX_DIAGNOSTICS) {
          current.diagnostics.push(event.code);
          current.diagnosticLinks.push({ code: event.code, ...(event.turnId ? { turnId: event.turnId } : {}),
            ...(event.callId ? { callId: event.callId } : {}) });
        }
        await persist(evidence('incomplete'));
      }
    } else if (event.type === 'run-completed') terminal = event.status;
  };
  try {
    let outcome: Awaited<ReturnType<typeof ports.runner.execute>> = { status: 'completed' };
    for (const batch of batches) {
      const expectedEnd = caseIndex + batch.cases.length;
      terminal = undefined;
      activeModel = batch.model;
      activeJudge = batch.judgeModel ?? null;
      outcome = await ports.runner.execute(batch, consume);
      if (outcome.status !== 'completed') break;
      if (terminal !== 'completed' || caseIndex !== expectedEnd || current) throw new Error('batch-incomplete');
    }
    const failureProvenance = observedFailure(outcome, terminal);
    closePendingObservation(outcome.reason === 'runner-timeout' ? 'application-deadline'
      : outcome.reason === 'runner-exited' ? 'runner-failure' : 'unknown');
    if (current && (current.sourceRecords.length > 0 || current.sourceGaps.length > 0)) {
      if (current.sourceGaps.length === 0) current.sourceGaps.push({ reason: 'incomplete' });
      addDiagnostic(current.diagnostics, 'source-evidence-incomplete');
    }
    if (current && (failureProvenance || current.sourceGaps.length > 0 || current.modelCalls.length > 0))
      await persist(evidence('incomplete', [], null, null, failureProvenance));
    const status: Exclude<RunState, 'queued' | 'running'> = outcome.status === 'blocked' && completed === 0 ? 'blocked'
      : outcome.status === 'interrupted' ? 'interrupted'
      : outcome.status === 'completed' && terminal === 'completed' && completed === cases.length ? 'completed'
      : completed ? 'partial' : 'error';
    const reason = outcome.reason ? SAFE_REASONS.has(outcome.reason) ? outcome.reason : 'unavailable' : undefined;
    if (reason) addDiagnostic(runDiagnostics, reason);
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics, failureProvenance);
    if (finished.status === 'blocked') { log('eval_run_storage_failed', 'failed', finished.reason); return { status: 'storage-failed', runId, reason: finished.reason }; }
    log('eval_run_finished', status === 'error' ? 'failed' : status, reason);
    return { status, runId, ...(reason ? { reason } : {}) };
  } catch (error) {
    if (error instanceof PersistenceStopped) { log('eval_run_storage_failed', 'failed', 'unavailable'); return { status: 'storage-failed', runId }; }
    const status = completed ? 'partial' : 'error';
    const reason = error instanceof EvidenceLimitStopped ? 'evidence-limit-exceeded' : 'runner-protocol-invalid';
    const failureProvenance: FailureProvenance | undefined = error instanceof EvidenceLimitStopped ? undefined : { stage: 'protocol-rejection' };
    closePendingObservation('unknown');
    addDiagnostic(runDiagnostics, reason);
    if (current && (current.sourceRecords.length > 0 || current.modelCalls.length > 0 || failureProvenance)) {
      if (current.sourceRecords.length > 0) {
        if (current.sourceGaps.length === 0) current.sourceGaps.push({ reason: 'incomplete' });
        addDiagnostic(current.diagnostics, 'source-evidence-incomplete');
      }
      try { await persist(evidence('incomplete', [], null, null, failureProvenance)); }
      catch { log('eval_run_storage_failed', 'failed', 'unavailable'); return { status: 'storage-failed', runId }; }
    }
    const finished = await ports.store.finalize(suite.id, runId, status, runDiagnostics, failureProvenance);
    if (finished.status === 'blocked') { log('eval_run_storage_failed', 'failed', finished.reason); return { status: 'storage-failed', runId, reason: finished.reason }; }
    log('eval_run_finished', status === 'error' ? 'failed' : status, reason);
    return { status, runId, reason };
  }
}
