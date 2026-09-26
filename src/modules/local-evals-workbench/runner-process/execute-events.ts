import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class ExecuteEventValidator {
  private sequence = 0;
  private caseIndex = 0;
  private activeCase: string | undefined;
  private turns = 0;
  private failedCase = false;
  private state: 'initial' | 'running' | 'finished' = 'initial';
  private terminal: 'completed' | 'error' | 'interrupted' | undefined;
  constructor(private readonly requestId: string, private readonly selection: ExecutionSelection) {}

  get completion() { return this.terminal; }

  accept(raw: unknown): ExecutionEvent {
    if (!object(raw) || raw.protocolVersion !== 1 || raw.requestId !== this.requestId
      || raw.runId !== this.selection.runId || raw.sequence !== this.sequence++
      || this.state === 'finished' || !object(raw.data)) throw new Error('invalid-envelope');
    const data = raw.data;
    if (raw.type === 'run-started') {
      if (this.state !== 'initial' || raw.caseId !== null || raw.attempt !== null
        || data.model !== this.selection.model || data.judgeModel !== null) throw new Error('invalid-run-start');
      this.state = 'running';
      return { type: 'run-started' };
    }
    if (this.state !== 'running') throw new Error('invalid-order');
    if (raw.type === 'run-diagnostic') {
      if (raw.caseId !== (this.activeCase ?? null) || raw.attempt !== (this.activeCase ? 1 : null)
        || typeof data.code !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(data.code)) throw new Error('invalid-diagnostic');
      return { type: 'diagnostic', code: data.code, caseId: this.activeCase ?? null };
    }
    if (raw.type === 'run-completed') {
      if (raw.caseId !== null || raw.attempt !== null || !['completed', 'error', 'interrupted'].includes(String(data.status))) throw new Error('invalid-run-end');
      if (data.status === 'completed' && (this.activeCase || this.caseIndex !== this.selection.cases.length)) throw new Error('incomplete-run');
      this.terminal = data.status as 'completed' | 'error' | 'interrupted';
      this.state = 'finished';
      return { type: 'run-completed', status: this.terminal };
    }
    if (this.failedCase) throw new Error('case-already-failed');
    if (raw.attempt !== 1 || raw.caseId !== (this.activeCase ?? this.selection.cases[this.caseIndex]?.id)) throw new Error('invalid-case');
    const caseId = raw.caseId as string;
    if (raw.type === 'case-attempt-started') {
      if (this.activeCase || Object.keys(data).length) throw new Error('invalid-case-start');
      this.activeCase = caseId; this.turns = 0;
      return { type: 'case-started', caseId };
    }
    if (!this.activeCase) throw new Error('case-not-started');
    if (raw.type === 'conversation-turn-completed') {
      if (this.turns || data.turnIndex !== 0 || data.role !== 'assistant' || typeof data.output !== 'string'
        || Buffer.byteLength(data.output) > 8192) throw new Error('invalid-turn');
      this.turns++;
      return { type: 'turn-completed', caseId, turnId: 'turn-1', output: data.output };
    }
    if (raw.type === 'case-attempt-completed') {
      if (data.status !== 'completed' && data.status !== 'error' || data.status === 'completed' && this.turns !== 1) throw new Error('invalid-case-end');
      this.activeCase = undefined;
      if (data.status === 'completed') this.caseIndex++;
      else this.failedCase = true;
      return { type: 'case-completed', caseId, status: data.status };
    }
    throw new Error('unsupported-event');
  }
}
