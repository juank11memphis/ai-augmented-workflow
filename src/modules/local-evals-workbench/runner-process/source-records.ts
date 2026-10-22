import type { SourceRecord } from '../run-execution/contracts.js';
import { logicalId, record } from '../run-history/validation.js';

const MAX_RECORD_BYTES = 256_000;
const MAX_CHUNKS = 16;
const MAX_RECORDS = 100;
const roles = ['system', 'user', 'assistant', 'tool'];
const outcomes = ['result', 'error', 'unexpected-response'];

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(key => key in value) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
function boundedText(value: unknown, max = MAX_RECORD_BYTES): value is string {
  return typeof value === 'string' && Buffer.byteLength(value) <= max;
}
function elapsed(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function jsonValue(value: unknown): boolean {
  try { return Buffer.byteLength(JSON.stringify(value)) <= 32_000; } catch { return false; }
}
function redactions(value: unknown, allowed: readonly string[]): boolean {
  return value === undefined || Array.isArray(value) && value.length <= allowed.length
    && new Set(value).size === value.length && value.every(item => allowed.includes(item));
}
function score(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Validates complete source records, not chunks or fixture-declared substitutes. */
export function sourceRecord(value: unknown): value is SourceRecord {
  if (!record(value) || !logicalId(value.id) || !logicalId(value.turnId) || !logicalId(value.checkId)
    || !elapsed(value.elapsedMs)) return false;
  if (value.kind === 'judge-exchange') {
    if (!exactKeys(value, ['kind', 'id', 'turnId', 'checkId', 'judgeModel', 'eventSequence', 'elapsedMs', 'evaluatedRubric', 'request', 'result'],
      ['response', 'rationale', 'redactedFields']) || !boundedText(value.judgeModel, 200) || !value.judgeModel
      || !Number.isSafeInteger(value.eventSequence) || Number(value.eventSequence) < 0
      || !boundedText(value.evaluatedRubric) || !boundedText(value.request)
      || value.response !== undefined && !boundedText(value.response)
      || value.rationale !== undefined && !boundedText(value.rationale)
      || !redactions(value.redactedFields, ['evaluatedRubric', 'request', 'response', 'rationale'])
      || !record(value.result)) return false;
    return value.result.status === 'completed'
      ? exactKeys(value.result, ['status', 'score', 'threshold', 'passed'])
        && score(value.result.score) && score(value.result.threshold)
        && typeof value.result.passed === 'boolean' && value.result.passed === (value.result.score >= value.result.threshold)
        && value.response !== undefined && value.rationale !== undefined
      : value.result.status === 'grading-error'
        && exactKeys(value.result, ['status', 'code'])
        && typeof value.result.code === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value.result.code);
  }
  if (value.kind === 'model-call') {
    return exactKeys(value, ['kind', 'id', 'turnId', 'checkId', 'modelId', 'phase', 'elapsedMs', 'inputMessages', 'rawText', 'rawToolCalls', 'normalizedOutput'], ['approvedFacts', 'redactedFields'])
      && boundedText(value.modelId, 200) && value.modelId.length > 0
      && (value.phase === 'initial' || value.phase === 'correction' || value.phase === 'post-tool')
      && Array.isArray(value.inputMessages) && value.inputMessages.length <= 100
      && value.inputMessages.every(message => record(message) && exactKeys(message, ['role', 'content'])
        && roles.includes(String(message.role)) && boundedText(message.content))
      && boundedText(value.rawText) && boundedText(value.normalizedOutput)
      && Array.isArray(value.rawToolCalls) && value.rawToolCalls.length <= 100
      && value.rawToolCalls.every(call => record(call) && exactKeys(call, ['id', 'name', 'arguments'])
        && logicalId(call.id) && boundedText(call.name, 200) && jsonValue(call.arguments))
      && redactions(value.redactedFields, ['inputMessages', 'rawText', 'rawToolCalls', 'normalizedOutput'])
      && (value.approvedFacts === undefined || Array.isArray(value.approvedFacts) && value.approvedFacts.length <= 100
        && value.approvedFacts.every(fact => record(fact) && exactKeys(fact, ['factId', 'provenance'])
          && logicalId(fact.factId) && boundedText(fact.provenance, 1000)));
  }
  return value.kind === 'tool-delivery'
    && exactKeys(value, ['kind', 'id', 'turnId', 'checkId', 'modelCallId', 'name', 'request', 'result', 'outcome', 'elapsedMs'], ['redactedFields'])
    && logicalId(value.modelCallId) && boundedText(value.name, 200) && value.name.length > 0
    && outcomes.includes(String(value.outcome)) && jsonValue(value.request) && jsonValue(value.result)
    && redactions(value.redactedFields, ['request', 'result']);
}

type Pending = { readonly id: string; readonly count: number; readonly byteLength: number; readonly chunks: Buffer[] };

export class SourceRecordChunks {
  private pending: Pending | undefined;
  private failedId: string | undefined;
  private readonly ids = new Set<string>();

  get incompleteId(): string | undefined { return this.pending?.id; }
  get captureFailedId(): string | undefined { return this.failedId; }
  get count(): number { return this.ids.size; }
  reset(): void { this.pending = undefined; this.failedId = undefined; this.ids.clear(); }

  accept(data: Record<string, unknown>): SourceRecord | undefined {
    if (logicalId(data.recordId) && Number.isSafeInteger(data.byteLength) && Number(data.byteLength) > MAX_RECORD_BYTES) {
      this.failedId = data.recordId;
      throw new Error('source-capture-limit');
    }
    if (!exactKeys(data, ['recordId', 'index', 'count', 'byteLength', 'base64'])
      || !logicalId(data.recordId) || !Number.isSafeInteger(data.index) || Number(data.index) < 0
      || !Number.isSafeInteger(data.count) || Number(data.count) < 1 || Number(data.count) > MAX_CHUNKS
      || !Number.isSafeInteger(data.byteLength) || Number(data.byteLength) < 1 || Number(data.byteLength) > MAX_RECORD_BYTES
      || typeof data.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.base64)) throw new Error('invalid-source-chunk');
    const bytes = Buffer.from(data.base64, 'base64');
    if (bytes.length === 0 || bytes.length > 40_000 || bytes.toString('base64') !== data.base64) throw new Error('invalid-source-chunk');
    if (!this.pending) {
      if (data.index !== 0 || this.ids.has(data.recordId) || this.ids.size >= MAX_RECORDS) throw new Error('invalid-source-order');
      this.pending = { id: data.recordId, count: Number(data.count), byteLength: Number(data.byteLength), chunks: [] };
    }
    const pending = this.pending;
    if (pending.id !== data.recordId || pending.count !== data.count || pending.byteLength !== data.byteLength
      || data.index !== pending.chunks.length) throw new Error('invalid-source-order');
    pending.chunks.push(bytes);
    if (pending.chunks.reduce((length, chunk) => length + chunk.length, 0) > pending.byteLength) throw new Error('invalid-source-length');
    if (pending.chunks.length < pending.count) return undefined;
    this.pending = undefined;
    const joined = Buffer.concat(pending.chunks);
    if (joined.length !== pending.byteLength) throw new Error('invalid-source-length');
    let decoded: unknown;
    try { decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined)); }
    catch { throw new Error('invalid-source-json'); }
    if (!sourceRecord(decoded) || decoded.id !== pending.id) throw new Error('invalid-source-record');
    this.ids.add(pending.id);
    return decoded;
  }
}
