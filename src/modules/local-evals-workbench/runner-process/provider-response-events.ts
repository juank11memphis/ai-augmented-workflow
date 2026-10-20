import type { ExecutionEvent } from '../run-execution/contracts.js';
import { logicalId, record } from '../run-history/validation.js';

export const RESPONSE_CHUNK_BYTES = 40_000;

type Link = { caseId: string; attempt: number; callId: string; provisionalTurnId: string;
  role?: 'tested-model' | 'judge'; checkId?: string };
type Pending = Link & { contentType?: string; originalByteLength?: number; index: number; seen: number;
  chunks: Buffer[] };

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}

/** v3 tested-model observations are independent of completed turns and v2 source records. */
export class ProviderResponseEvents {
  private pending: Pending | undefined;
  private readonly calls = new Set<string>();

  resetAttempt(): void { this.pending = undefined; this.calls.clear(); }
  hasCall(callId: string): boolean { return this.calls.has(callId); }
  get incomplete(): ExecutionEvent | undefined {
    const value = this.pending;
    return value && { type: 'provider-response-gap', caseId: value.caseId, attempt: value.attempt,
      callId: value.callId, provisionalTurnId: value.provisionalTurnId,
      ...(value.role === undefined ? {} : { role: value.role }),
      ...(value.checkId === undefined ? {} : { checkId: value.checkId }),
      ...(value.contentType === undefined ? {} : { contentType: value.contentType }),
      ...(value.originalByteLength === undefined ? {} : { originalByteLength: value.originalByteLength }), reason: 'incomplete' };
  }

  get receivedBeforeInterruption(): ExecutionEvent | undefined {
    const value = this.pending;
    if (!value || value.seen === 0) return undefined;
    return { type: 'provider-response-observed', caseId: value.caseId, attempt: value.attempt,
      callId: value.callId, provisionalTurnId: value.provisionalTurnId,
      bytes: Buffer.concat(value.chunks, value.seen), completeness: 'incomplete',
      ...(value.role === undefined ? {} : { role: value.role }),
      ...(value.checkId === undefined ? {} : { checkId: value.checkId }),
      ...(value.contentType === undefined ? {} : { contentType: value.contentType }),
      ...(value.originalByteLength === undefined ? {} : { originalByteLength: value.originalByteLength }) };
  }

  accept(type: string, data: Record<string, unknown>, caseId: string, attempt: number, model: string,
    judgeModel?: string | null, rubricChecks: readonly string[] = []): ExecutionEvent {
    const role = data.role;
    const judge = role === 'judge';
    const identityValid = (role === undefined || role === 'tested-model' || judge)
      && (judge ? typeof judgeModel === 'string' && data.modelId === judgeModel
        && logicalId(data.checkId) && rubricChecks.includes(data.checkId)
        : data.modelId === model && data.checkId === undefined);
    if (type === 'provider-response-started') {
      if (!exactKeys(data, ['callId', 'provisionalTurnId', 'modelId'], ['role', 'checkId', 'contentType', 'originalByteLength'])
        || !logicalId(data.callId) || !logicalId(data.provisionalTurnId) || !identityValid
        || this.pending || this.calls.has(data.callId)
        || data.contentType !== undefined && (typeof data.contentType !== 'string' || !data.contentType
          || Buffer.byteLength(data.contentType) > 200)
        || data.originalByteLength !== undefined && (!Number.isSafeInteger(data.originalByteLength)
          || (data.originalByteLength as number) < 0)) throw new Error('invalid-response-start');
      this.calls.add(data.callId);
      this.pending = { caseId, attempt, callId: data.callId, provisionalTurnId: data.provisionalTurnId,
        ...(role === undefined ? {} : { role: role as 'tested-model' | 'judge' }),
        ...(judge ? { checkId: data.checkId as string } : {}),
        ...(data.contentType === undefined ? {} : { contentType: data.contentType as string }),
        ...(data.originalByteLength === undefined ? {} : { originalByteLength: data.originalByteLength as number }),
        index: 0, seen: 0, chunks: [] };
      return { type: 'source-chunk-accepted' };
    }
    if (type === 'provider-response-gap') {
      if (!exactKeys(data, ['callId', 'provisionalTurnId', 'reason'], ['role', 'checkId', 'modelId']) || !logicalId(data.callId)
        || !logicalId(data.provisionalTurnId) || !['not-observed', 'not-emitted', 'capture-failed'].includes(String(data.reason))
        || !(judge ? identityValid : (role === undefined || role === 'tested-model')
          && data.checkId === undefined && (data.modelId === undefined || data.modelId === model))
        || this.pending || this.calls.has(data.callId)) throw new Error('invalid-response-gap');
      this.calls.add(data.callId);
      return { type: 'provider-response-gap', caseId, attempt, callId: data.callId,
        provisionalTurnId: data.provisionalTurnId,
        ...(role === undefined ? {} : { role: role as 'tested-model' | 'judge' }),
        ...(judge ? { checkId: data.checkId as string } : {}),
        reason: data.reason as 'not-observed' | 'not-emitted' | 'capture-failed' };
    }
    const pending = this.pending;
    if (!pending || !exactKeys(data, ['callId', ...(type === 'provider-response-chunk' ? ['index', 'base64'] : ['completeness'])])
      || data.callId !== pending.callId) throw new Error('invalid-response-order');
    if (type === 'provider-response-chunk') {
      if (data.index !== pending.index || typeof data.base64 !== 'string'
        || data.base64.length > 4 * Math.ceil(RESPONSE_CHUNK_BYTES / 3)
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.base64))
        throw new Error('invalid-response-chunk');
      const bytes = Buffer.from(data.base64, 'base64');
      if (!bytes.length || bytes.length > RESPONSE_CHUNK_BYTES || pending.seen + bytes.length > Number.MAX_SAFE_INTEGER
        || pending.originalByteLength !== undefined && pending.seen + bytes.length > pending.originalByteLength)
        throw new Error('invalid-response-size');
      pending.index++;
      pending.seen += bytes.length;
      pending.chunks.push(bytes);
      return { type: 'source-chunk-accepted' };
    }
    if (type !== 'provider-response-completed' || !['complete', 'truncated', 'incomplete'].includes(String(data.completeness))
      || data.completeness === 'complete' && pending.originalByteLength !== undefined
        && pending.seen !== pending.originalByteLength
      || data.completeness === 'truncated' && pending.originalByteLength !== undefined
        && pending.seen >= pending.originalByteLength) throw new Error('invalid-response-end');
    this.pending = undefined;
    return { type: 'provider-response-observed', caseId, attempt, callId: pending.callId,
      provisionalTurnId: pending.provisionalTurnId, bytes: Buffer.concat(pending.chunks, pending.seen),
      ...(pending.role === undefined ? {} : { role: pending.role }),
      ...(pending.checkId === undefined ? {} : { checkId: pending.checkId }),
      ...(pending.contentType === undefined ? {} : { contentType: pending.contentType }),
      ...(pending.originalByteLength === undefined ? {} : { originalByteLength: pending.originalByteLength }),
      completeness: data.completeness as 'complete' | 'truncated' | 'incomplete' };
  }
}
