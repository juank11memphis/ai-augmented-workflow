import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
import { boundedJson, logicalId, record } from '../run-history/validation.js';

function text(value: unknown, max = 8192): value is string {
  return typeof value === 'string' && Buffer.byteLength(value) <= max;
}
function amount(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
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
  private graders = new Set<string>();
  private failedCase = false;
  private state: 'initial' | 'running' | 'finished' = 'initial';
  private terminal: 'completed' | 'error' | 'interrupted' | undefined;
  constructor(private readonly requestId: string, private readonly selection: ExecutionSelection) {}

  get completion() { return this.terminal; }

  accept(raw: unknown): ExecutionEvent {
    if (!record(raw) || raw.protocolVersion !== 1 || raw.requestId !== this.requestId
      || raw.runId !== this.selection.runId || raw.sequence !== this.sequence++
      || this.state === 'finished' || !record(raw.data) || !boundedJson(raw, 64_000)
      || !keys(raw, ['protocolVersion', 'requestId', 'runId', 'sequence', 'type', 'caseId', 'attempt', 'data'])) throw new Error('invalid-envelope');
    const data = raw.data;
    if (raw.type === 'run-started') {
      if (this.state !== 'initial' || raw.caseId !== null || raw.attempt !== null
        || !keys(data, ['model', 'judgeModel']) || data.model !== this.selection.model
        || data.judgeModel !== (this.selection.judgeModel ?? null)) throw new Error('invalid-run-start');
      this.state = 'running';
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
      if (raw.caseId !== null || raw.attempt !== null || !keys(data, ['status'])
        || !['completed', 'error', 'interrupted'].includes(String(data.status))) throw new Error('invalid-run-end');
      if (data.status === 'completed' && (this.activeCase || this.caseIndex !== this.selection.cases.length)) throw new Error('incomplete-run');
      this.terminal = data.status as 'completed' | 'error' | 'interrupted';
      this.state = 'finished';
      return { type: 'run-completed', status: this.terminal };
    }
    if (this.failedCase) throw new Error('case-already-failed');
    if (raw.attempt !== this.attemptNumber || raw.caseId !== (this.activeCase ?? this.selection.cases[this.caseIndex]?.id)) throw new Error('invalid-case');
    const caseId = raw.caseId as string;
    const selected = this.selection.cases[this.caseIndex];
    if (!selected) throw new Error('invalid-case');
    if (raw.type === 'case-attempt-started') {
      if (this.activeCase || Object.keys(data).length) throw new Error('invalid-case-start');
      this.activeCase = caseId; this.turns = 0; this.tools = 0; this.turnIds.clear(); this.toolIds.clear(); this.graders.clear();
      return { type: 'case-started', caseId, attempt: this.attemptNumber };
    }
    if (!this.activeCase) throw new Error('case-not-started');
    if (raw.type === 'conversation-turn-completed') {
      if (!keys(data, ['turnIndex', 'turnId', 'role', 'output']) || data.turnIndex !== this.turns
        || data.role !== 'assistant' || !text(data.output) || this.turns >= selected.turns.length) throw new Error('invalid-turn');
      const turnId = data.turnId === undefined ? `turn-${this.turns + 1}` : data.turnId;
      if (!logicalId(turnId) || this.turnIds.has(turnId)) throw new Error('invalid-turn');
      this.turnIds.add(turnId);
      const turnIndex = this.turns++;
      return { type: 'turn-completed', caseId, attempt: this.attemptNumber, turnId, turnIndex, output: data.output };
    }
    if (raw.type === 'tool-interaction-recorded') {
      if (!keys(data, ['toolId', 'turnId', 'position', 'name', 'arguments', 'outcome', 'result'])
        || !logicalId(data.toolId) || this.toolIds.has(data.toolId) || !logicalId(data.turnId) || !this.turnIds.has(data.turnId) || data.position !== this.tools
        || !text(data.name, 200) || !['result', 'error', 'unexpected-response'].includes(String(data.outcome))
        || this.turns === 0 || !boundedJson(data.arguments, 8192) || !boundedJson(data.result, 8192)) throw new Error('invalid-tool');
      this.tools++; this.toolIds.add(data.toolId);
      return { type: 'tool-recorded', caseId, attempt: this.attemptNumber, toolId: data.toolId,
        turnId: data.turnId, position: data.position as number, name: data.name,
        arguments: JSON.stringify(data.arguments), outcome: data.outcome as 'result' | 'error' | 'unexpected-response',
        result: JSON.stringify(data.result) };
    }
    if (raw.type === 'custom-assertion-completed' || raw.type === 'rubric-judgment-completed') {
      const grader = raw.type === 'custom-assertion-completed' ? 'custom' : 'rubric';
      const declared = selected.graders.find(item => item.id === data.checkId);
      if (!keys(data, ['checkId', 'passed', 'score', 'threshold', 'judgeModel', 'evidence', 'diagnostics'])
        || !declared || declared.type !== grader || this.graders.has(declared.id)
        || typeof data.passed !== 'boolean' || !amount(data.score) || data.score !== null && data.score > 1
        || !text(data.evidence, 500) || !data.evidence || !Array.isArray(data.diagnostics)
        || data.diagnostics.length > 20 || !data.diagnostics.every(item => text(item, 500))) throw new Error('invalid-grader');
      if (declared.type === 'rubric' && (data.judgeModel !== this.selection.judgeModel || data.threshold !== declared.threshold
        || typeof data.score !== 'number' || data.passed !== (data.score >= declared.threshold))) throw new Error('invalid-rubric');
      if (grader === 'custom' && (data.judgeModel !== undefined || data.threshold !== undefined)) throw new Error('invalid-custom');
      this.graders.add(declared.id);
      return { type: 'grader-completed', caseId, attempt: this.attemptNumber, checkId: declared.id, grader,
        passed: data.passed, score: data.score, ...(grader === 'rubric' ? { threshold: data.threshold as number, judgeModel: data.judgeModel as string } : {}),
        evidence: data.evidence, diagnostics: data.diagnostics as string[] };
    }
    if (raw.type === 'case-attempt-completed') {
      if (!keys(data, ['status', 'calls', 'cost']) || data.status !== 'completed' && data.status !== 'error'
        || data.calls !== undefined && !(data.calls === null || typeof data.calls === 'number' && Number.isSafeInteger(data.calls) && data.calls >= 0)
        || data.cost !== undefined && !amount(data.cost)
        || data.status === 'completed' && (this.turns !== selected.turns.length || this.graders.size !== selected.graders.length)) throw new Error('invalid-case-end');
      this.activeCase = undefined;
      if (data.status === 'completed') {
        this.caseIndex++;
      } else this.failedCase = true;
      return { type: 'case-completed', caseId, attempt: raw.attempt as number, status: data.status,
        ...(data.calls !== undefined ? { calls: data.calls as number | null } : {}),
        ...(data.cost !== undefined ? { cost: data.cost as number | null } : {}) };
    }
    throw new Error('unsupported-event');
  }
}
