import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import { boundedJson, logicalId, record } from '../run-history/validation.js';
import { SourceRecordChunks } from './source-records.js';
import { ProviderResponseEvents } from './provider-response-events.js';

function text(value: unknown, max = 8192): value is string {
  return typeof value === 'string' && Buffer.byteLength(value) <= max;
}
function amount(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}
function eventSize(value: Record<string, unknown>): boolean {
  try {
    return value.type === 'source-record-chunk' || value.type === 'provider-response-chunk'
      ? Buffer.byteLength(JSON.stringify(value)) <= 64_000
      : boundedJson(value, 64_000);
  } catch { return false; }
}

export class ExecuteEventValidator {
  private sequence = 0;
  private caseIndex = 0;
  private attemptNumber = 1;
  private activeCase: string | undefined;
  private turns = 0;
  private tools = 0;
  private turnIds = new Set<string>();
  private toolIds = new Set<string>();
  private toolDetails = new Map<string, { turnId: string; name: string; outcome: string }>();
  private graders = new Set<string>();
  private operationalError: { code: string; message: string } | undefined;
  private failedCase = false;
  private state: 'initial' | 'running' | 'finished' = 'initial';
  private terminal: 'completed' | 'error' | 'interrupted' | undefined;
  private version: 1 | 2 | 3 | 4 | undefined;
  private readonly modelCalls = new Map<string, { caseId: string; attempt: number; provisionalTurnId: string; role: string; checkId?: string; modelId: string; ended: boolean; completed: boolean }>();
  private readonly chunks = new SourceRecordChunks();
  private readonly responses = new ProviderResponseEvents();
  private readonly sourceCalls = new Map<string, { turnId: string; checkId: string }>();
  private readonly sourceTools = new Set<string>();
  private readonly judgments = new Map<string, { sequence: number; status: 'completed' | 'grading-error'; score?: number; threshold?: number; passed?: boolean; code?: string }>();
  private readonly judgeSources = new Set<string>();
  constructor(private readonly requestId: string, private readonly selection: ExecutionSelection) {}

  get expectedSequence() { return this.sequence; }
  get completion() { return this.terminal; }
  get incompleteSource() { return this.activeCase && (this.chunks.incompleteId || this.chunks.captureFailedId)
    ? { type: 'source-gap' as const, caseId: this.activeCase, attempt: this.attemptNumber,
      reason: this.chunks.captureFailedId ? 'capture-failed' as const : 'incomplete' as const,
      recordId: this.chunks.captureFailedId ?? this.chunks.incompleteId } : undefined; }
  get incompleteResponse() { return this.responses.incomplete; }
  get receivedBeforeInterruption() { return this.responses.receivedBeforeInterruption; }
  get missingCallResponses(): ExecutionEvent[] {
    if (this.version !== 4) return [];
    return [...this.modelCalls.entries()].filter(([callId]) => !this.responses.hasCall(callId))
      .map(([callId, call]) => ({ type: 'provider-response-gap', caseId: call.caseId, attempt: call.attempt,
        callId, provisionalTurnId: call.provisionalTurnId, role: call.role as 'tested-model' | 'judge',
        ...(call.checkId === undefined ? {} : { checkId: call.checkId }), reason: 'incomplete' }));
  }

  accept(raw: unknown): ExecutionEvent {
    if (!record(raw) || (raw.protocolVersion !== 1 && raw.protocolVersion !== 2 && raw.protocolVersion !== 3 && raw.protocolVersion !== 4)
      || (this.version !== undefined && raw.protocolVersion !== this.version) || raw.requestId !== this.requestId
      || raw.runId !== this.selection.runId || raw.sequence !== this.sequence++
      || this.state === 'finished' || !record(raw.data) || !eventSize(raw)
      || !keys(raw, ['protocolVersion', 'requestId', 'runId', 'sequence', 'type', 'caseId', 'attempt', 'data'])) throw new Error('invalid-envelope');
    const data = raw.data;
    if (raw.type === 'run-started') {
      if (this.state !== 'initial' || raw.caseId !== null || raw.attempt !== null
        || !keys(data, ['model', 'judgeModel']) || data.model !== this.selection.model
        || data.judgeModel !== (this.selection.judgeModel ?? null)) throw new Error('invalid-run-start');
      this.state = 'running';
      this.version = raw.protocolVersion;
      return { type: 'run-started' };
    }
    if (this.state !== 'running') throw new Error('invalid-order');
    if (raw.type === 'run-diagnostic') {
      if (raw.caseId !== (this.activeCase ?? null) || raw.attempt !== (this.activeCase ? this.attemptNumber : null)
        || !keys(data, ['code', 'message']) || typeof data.code !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(data.code)
        || data.message !== undefined && !text(data.message, 500)) throw new Error('invalid-diagnostic');
      return { type: 'diagnostic', code: data.code, caseId: this.activeCase ?? null,
        ...(this.activeCase ? { attempt: this.attemptNumber } : {}) };
    }
    if (raw.type === 'run-completed') {
      if (raw.caseId !== null || raw.attempt !== null || !keys(data, ['status', 'code'])
        || !['completed', 'error', 'interrupted'].includes(String(data.status))
        || data.code !== undefined && (data.status !== 'error' && data.status !== 'interrupted'
          || typeof data.code !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(data.code))) throw new Error('invalid-run-end');
      if (data.status === 'completed' && (this.activeCase || this.caseIndex !== this.selection.cases.length
        || this.chunks.incompleteId || this.responses.incomplete || [...this.modelCalls.values()].some(call => !call.ended))) throw new Error('incomplete-run');
      this.terminal = data.status as 'completed' | 'error' | 'interrupted';
      this.state = 'finished';
      return { type: 'run-completed', status: this.terminal, ...(data.code === undefined ? {} : { code: data.code as string }) };
    }
    if (this.failedCase) throw new Error('case-already-failed');
    if (raw.attempt !== this.attemptNumber || raw.caseId !== (this.activeCase ?? this.selection.cases[this.caseIndex]?.id)) throw new Error('invalid-case');
    const caseId = raw.caseId as string;
    const selected = this.selection.cases[this.caseIndex];
    if (!selected) throw new Error('invalid-case');
    if (raw.type === 'case-attempt-started') {
      if (this.activeCase || Object.keys(data).length) throw new Error('invalid-case-start');
      this.activeCase = caseId; this.turns = 0; this.tools = 0; this.turnIds.clear(); this.toolIds.clear(); this.graders.clear(); this.operationalError = undefined;
      this.chunks.reset(); this.responses.resetAttempt(); this.modelCalls.clear(); this.sourceCalls.clear(); this.sourceTools.clear(); this.toolDetails.clear(); this.judgments.clear(); this.judgeSources.clear();
      return { type: 'case-started', caseId, attempt: this.attemptNumber };
    }
    if (!this.activeCase) throw new Error('case-not-started');
    if (raw.type === 'model-call-started') {
      const judge = data.role === 'judge';
      if (this.version !== 4 || !keys(data, ['callId', 'provisionalTurnId', 'role', 'checkId', 'modelId', 'phase'])
        || !logicalId(data.callId) || !logicalId(data.provisionalTurnId) || this.modelCalls.has(data.callId)
        || (judge ? data.phase !== 'judge' || data.modelId !== this.selection.judgeModel
          || !logicalId(data.checkId) || !selected.graders.some(item => item.type === 'rubric' && item.id === data.checkId)
          : data.role !== 'tested-model' || data.checkId !== undefined || data.modelId !== this.selection.model
            || !['initial', 'correction', 'post-tool'].includes(String(data.phase))
            || data.phase === 'correction' && ![...this.modelCalls.values()].some(call =>
              call.role === 'tested-model' && call.provisionalTurnId === data.provisionalTurnId && call.completed))) throw new Error('invalid-call-start');
      this.modelCalls.set(data.callId, { caseId, attempt: this.attemptNumber, provisionalTurnId: data.provisionalTurnId, role: data.role as string,
        ...(judge ? { checkId: data.checkId as string } : {}), modelId: data.modelId as string, ended: false, completed: false });
      return { type: 'model-call-started', caseId, attempt: this.attemptNumber, callId: data.callId,
        provisionalTurnId: data.provisionalTurnId, role: data.role as 'tested-model' | 'judge',
        ...(judge ? { checkId: data.checkId as string } : {}), modelId: data.modelId as string,
        phase: data.phase as 'initial' | 'correction' | 'post-tool' | 'judge' };
    }
    if (raw.type === 'model-call-ended') {
      const call = this.modelCalls.get(data.callId as string);
      if (this.version !== 4 || !keys(data, ['callId', 'status', 'terminationSource']) || !call || call.ended
        || !['completed', 'failed', 'cancelled'].includes(String(data.status))
        || (data.status === 'completed' ? data.terminationSource !== undefined
          : !['application-deadline', 'provider-timeout', 'runner-failure', 'unknown'].includes(String(data.terminationSource))))
        throw new Error('invalid-call-end');
      call.ended = true;
      call.completed = data.status === 'completed';
      return { type: 'model-call-ended', caseId, attempt: this.attemptNumber, callId: data.callId as string,
        status: data.status as 'completed' | 'failed' | 'cancelled',
        ...(data.terminationSource === undefined ? {} : { terminationSource: data.terminationSource as 'application-deadline' | 'provider-timeout' | 'runner-failure' | 'unknown' }) };
    }
    if (typeof raw.type === 'string' && raw.type.startsWith('provider-response-')) {
      if (this.version !== 3 && this.version !== 4) throw new Error('unsupported-event');
      if (this.version === 4) {
        const call = this.modelCalls.get(data.callId as string);
        if (!call || call.ended || (raw.type === 'provider-response-started' || raw.type === 'provider-response-gap')
          && (call.provisionalTurnId !== data.provisionalTurnId || call.role !== (data.role ?? 'tested-model')
            || call.checkId !== data.checkId || (data.modelId !== undefined && call.modelId !== data.modelId)))
          throw new Error('invalid-response-call-link');
      }
      return this.responses.accept(raw.type, data, caseId, this.attemptNumber, this.selection.model,
        this.selection.judgeModel, selected.graders.filter(item => item.type === 'rubric').map(item => item.id));
    }
    if (raw.type === 'source-record-chunk') {
      if (this.version === 1) throw new Error('unsupported-event');
      const source = this.chunks.accept(data);
      if (!source) return { type: 'source-chunk-accepted' };
      if (!this.turnIds.has(source.turnId) || ![...selected.assertions, ...selected.graders].some(item => item.id === source.checkId)) throw new Error('invalid-source-link');
      if (source.kind === 'judge-exchange') {
        const declared = selected.graders.find(item => item.id === source.checkId);
        const judgment = this.judgments.get(source.checkId);
        if (declared?.type !== 'rubric' || source.judgeModel !== this.selection.judgeModel
          || !judgment || source.eventSequence !== judgment.sequence || raw.sequence <= judgment.sequence
          || source.result.status !== judgment.status || this.judgeSources.has(source.checkId)
          || judgment.status === 'completed' && (source.result.status !== 'completed'
            || source.result.score !== judgment.score || source.result.threshold !== judgment.threshold || source.result.passed !== judgment.passed)
          || judgment.status === 'grading-error' && (source.result.status !== 'grading-error' || source.result.code !== judgment.code)) throw new Error('invalid-source-judge');
        this.judgeSources.add(source.checkId);
      } else if (source.kind === 'model-call') {
        if (source.modelId !== this.selection.model || this.sourceCalls.has(source.id)
          || source.phase === 'correction' && ![...this.sourceCalls.values()].some(call => call.turnId === source.turnId)
          || source.phase === 'post-tool' && this.sourceTools.size === 0) throw new Error('invalid-source-call');
        this.sourceCalls.set(source.id, { turnId: source.turnId, checkId: source.checkId });
      } else {
        const call = this.sourceCalls.get(source.modelCallId);
        const tool = this.toolDetails.get(source.id);
        if (!call || call.turnId !== source.turnId || call.checkId !== source.checkId
          || !tool || tool.turnId !== source.turnId || tool.name !== source.name || tool.outcome !== source.outcome
          || this.sourceTools.has(source.id)) throw new Error('invalid-source-tool');
        this.sourceTools.add(source.id);
      }
      return { type: 'source-record', caseId, attempt: this.attemptNumber, sequence: raw.sequence as number, record: source };
    }
    if (raw.type === 'conversation-turn-completed') {
      if (!keys(data, ['turnIndex', 'turnId', 'role', 'output']) || data.turnIndex !== this.turns
        || data.role !== 'assistant' || !text(data.output) || this.turns >= selected.turns.length
        || this.operationalError) throw new Error('invalid-turn');
      const turnId = data.turnId === undefined ? `turn-${this.turns + 1}` : data.turnId;
      if (!logicalId(turnId) || this.turnIds.has(turnId)) throw new Error('invalid-turn');
      this.turnIds.add(turnId);
      const turnIndex = this.turns++;
      return { type: 'turn-completed', caseId, attempt: this.attemptNumber, turnId, turnIndex, output: data.output };
    }
    if (raw.type === 'operational-error-observed') {
      if (!selected.expectedOutcome || this.operationalError || this.graders.size > 0 || this.turns > 0
        || !keys(data, ['code', 'message']) || typeof data.code !== 'string'
        || !/^[a-z][a-z0-9-]{0,79}$/.test(data.code) || !text(data.message, 500) || !data.message)
        throw new Error('invalid-operational-error');
      this.operationalError = { code: data.code, message: data.message };
      return { type: 'operational-error-observed', caseId, attempt: this.attemptNumber, error: this.operationalError };
    }
    if (raw.type === 'tool-interaction-recorded') {
      if (!keys(data, ['toolId', 'turnId', 'position', 'name', 'arguments', 'outcome', 'result'])
        || !logicalId(data.toolId) || this.toolIds.has(data.toolId) || !logicalId(data.turnId) || !this.turnIds.has(data.turnId) || data.position !== this.tools
        || !text(data.name, 200) || !['result', 'error', 'unexpected-response'].includes(String(data.outcome))
        || this.turns === 0 || !boundedJson(data.arguments, 8192) || !boundedJson(data.result, 8192)) throw new Error('invalid-tool');
      this.tools++; this.toolIds.add(data.toolId);
      this.toolDetails.set(data.toolId, { turnId: data.turnId, name: data.name, outcome: String(data.outcome) });
      return { type: 'tool-recorded', caseId, attempt: this.attemptNumber, toolId: data.toolId,
        turnId: data.turnId, position: data.position as number, name: data.name,
        arguments: JSON.stringify(data.arguments), outcome: data.outcome as 'result' | 'error' | 'unexpected-response',
        result: JSON.stringify(data.result) };
    }
    if (raw.type === 'custom-assertion-completed' || raw.type === 'rubric-judgment-completed') {
      const grader = raw.type === 'custom-assertion-completed' ? 'custom' : 'rubric';
      const declared = selected.graders.find(item => item.id === data.checkId);
      if (!keys(data, ['checkId', 'passed', 'score', 'threshold', 'judgeModel', 'evidence', 'diagnostics', 'actualError'])
        || !declared || declared.type !== grader || this.graders.has(declared.id)
        || typeof data.passed !== 'boolean' || !amount(data.score) || data.score !== null && data.score > 1
        || !text(data.evidence, 500) || !data.evidence || !Array.isArray(data.diagnostics)
        || data.diagnostics.length > 20 || !data.diagnostics.every(item => text(item, 500))) throw new Error('invalid-grader');
      if (declared.type === 'rubric' && (data.judgeModel !== this.selection.judgeModel || data.threshold !== declared.threshold
        || typeof data.score !== 'number' || data.passed !== (data.score >= declared.threshold))) throw new Error('invalid-rubric');
      if (grader === 'custom' && (data.judgeModel !== undefined || data.threshold !== undefined
        || !!selected.expectedOutcome !== !!this.operationalError
        || selected.expectedOutcome && (!record(data.actualError) || !keys(data.actualError, ['code', 'message'])
          || data.actualError.code !== this.operationalError?.code || data.actualError.message !== this.operationalError?.message)
        || !selected.expectedOutcome && data.actualError !== undefined)) throw new Error('invalid-custom');
      this.graders.add(declared.id);
      if (grader === 'rubric') this.judgments.set(declared.id, { sequence: raw.sequence as number,
        status: 'completed', score: data.score as number, threshold: data.threshold as number, passed: data.passed });
      return { type: 'grader-completed', caseId, attempt: this.attemptNumber, checkId: declared.id, grader,
        passed: data.passed, score: data.score, ...(grader === 'rubric' ? { threshold: data.threshold as number, judgeModel: data.judgeModel as string } : {}),
        ...(this.operationalError ? { actualError: this.operationalError } : {}),
        evidence: data.evidence, diagnostics: data.diagnostics as string[], sequence: raw.sequence as number };
    }
    if (raw.type === 'rubric-judgment-error') {
      const declared = selected.graders.find(item => item.id === data.checkId);
      if (!keys(data, ['checkId', 'judgeModel', 'code']) || declared?.type !== 'rubric'
        || data.judgeModel !== this.selection.judgeModel || this.judgments.has(declared.id)
        || typeof data.code !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(data.code)) throw new Error('invalid-grading-error');
      this.judgments.set(declared.id, { sequence: raw.sequence as number, status: 'grading-error', code: data.code });
      return { type: 'grading-error', caseId, attempt: this.attemptNumber, checkId: declared.id,
        judgeModel: data.judgeModel as string, code: data.code, sequence: raw.sequence as number };
    }
    if (raw.type === 'case-attempt-completed') {
      if (!keys(data, ['status', 'calls', 'cost', 'sourceEvidenceComplete', 'judgeEvidenceComplete']) || data.status !== 'completed' && data.status !== 'error'
        || (this.version === 1 && data.sourceEvidenceComplete !== undefined)
        || (this.version !== 1 && typeof data.sourceEvidenceComplete !== 'boolean')
        || (data.judgeEvidenceComplete !== undefined && (this.version === 1 || typeof data.judgeEvidenceComplete !== 'boolean'))
        || (data.judgeEvidenceComplete === true && [...this.judgments.keys()].some(id => !this.judgeSources.has(id)))
        || (data.sourceEvidenceComplete === true && (this.chunks.incompleteId || this.sourceCalls.size === 0
          || this.turnIds.size !== new Set([...this.sourceCalls.values()].map(call => call.turnId)).size
          || this.toolIds.size !== this.sourceTools.size))
        || (data.status === 'completed' && (this.chunks.incompleteId || this.responses.incomplete
          || [...this.modelCalls.values()].some(call => !call.ended)
          || [...this.modelCalls.keys()].some(callId => !this.responses.hasCall(callId))))
        || data.calls !== undefined && !(data.calls === null || typeof data.calls === 'number' && Number.isSafeInteger(data.calls) && data.calls >= 0)
        || data.cost !== undefined && !amount(data.cost)
        || data.status === 'completed' && (this.turns !== (selected.expectedOutcome ? 0 : selected.turns.length)
          || !!selected.expectedOutcome !== !!this.operationalError || this.graders.size !== selected.graders.length)) throw new Error('invalid-case-end');
      this.activeCase = undefined;
      if (data.status === 'completed') {
        this.caseIndex++;
      } else this.failedCase = true;
      return { type: 'case-completed', caseId, attempt: raw.attempt as number, status: data.status,
        sourceCapture: this.version === 1 ? 'not-captured' : data.sourceEvidenceComplete ? 'complete' : 'incomplete',
        ...(data.calls !== undefined ? { calls: data.calls as number | null } : {}),
        ...(data.cost !== undefined ? { cost: data.cost as number | null } : {}) };
    }
    throw new Error('unsupported-event');
  }
}
