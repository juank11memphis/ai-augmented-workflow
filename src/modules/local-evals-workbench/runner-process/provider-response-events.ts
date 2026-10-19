import type { ExecutionEvent } from '../run-execution/contracts.js';
import { logicalId, record } from '../run-history/validation.js';

export const RESPONSE_BYTES = 128_000;
export const RUN_RESPONSE_BYTES = 512_000;

type Link = { caseId: string; attempt: number; callId: string; provisionalTurnId: string };
type Pending = Link & { contentType?: string; originalByteLength?: number; index: number; seen: number;
  retained: Buffer[]; retainedBytes: number; truncated: boolean };

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}

/** v3 tested-model observations are independent of completed turns and v2 source records. */
export class ProviderResponseEvents {
  private pending: Pending | undefined;
  private readonly calls = new Set<string>();
  private runBytes = 0;

  resetAttempt(): void { this.pending = undefined; this.calls.clear(); }
  get incomplete(): ExecutionEvent | undefined {
    const value = this.pending;
    return value && { type: 'provider-response-gap', caseId: value.caseId, attempt: value.attempt,
      callId: value.callId, provisionalTurnId: value.provisionalTurnId, reason: 'incomplete' };
  }

  accept(type: string, data: Record<string, unknown>, caseId: string, attempt: number, model: string): ExecutionEvent {
    if (type === 'provider-response-started') {
      if (!exactKeys(data, ['callId', 'provisionalTurnId', 'modelId'], ['contentType', 'originalByteLength'])
        || !logicalId(data.callId) || !logicalId(data.provisionalTurnId) || data.modelId !== model
        || this.pending || this.calls.has(data.callId)
        || data.contentType !== undefined && (typeof data.contentType !== 'string' || !data.contentType
          || Buffer.byteLength(data.contentType) > 200)
        || data.originalByteLength !== undefined && (!Number.isSafeInteger(data.originalByteLength)
          || (data.originalByteLength as number) < 0)) throw new Error('invalid-response-start');
      this.calls.add(data.callId);
      this.pending = { caseId, attempt, callId: data.callId, provisionalTurnId: data.provisionalTurnId,
        ...(data.contentType === undefined ? {} : { contentType: data.contentType as string }),
        ...(data.originalByteLength === undefined ? {} : { originalByteLength: data.originalByteLength as number }),
        index: 0, seen: 0, retained: [], retainedBytes: 0, truncated: false };
      return { type: 'source-chunk-accepted' };
    }
    if (type === 'provider-response-gap') {
      if (!exactKeys(data, ['callId', 'provisionalTurnId', 'reason']) || !logicalId(data.callId)
        || !logicalId(data.provisionalTurnId) || !['not-observed', 'not-emitted', 'capture-failed'].includes(String(data.reason))
        || this.pending || this.calls.has(data.callId)) throw new Error('invalid-response-gap');
      this.calls.add(data.callId);
      return { type: 'provider-response-gap', caseId, attempt, callId: data.callId,
        provisionalTurnId: data.provisionalTurnId, reason: data.reason as 'not-observed' | 'not-emitted' | 'capture-failed' };
    }
    const pending = this.pending;
    if (!pending || !exactKeys(data, ['callId', ...(type === 'provider-response-chunk' ? ['index', 'base64'] : ['completeness'])])
      || data.callId !== pending.callId) throw new Error('invalid-response-order');
    if (type === 'provider-response-chunk') {
      if (data.index !== pending.index || typeof data.base64 !== 'string' || data.base64.length > 60_000
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.base64))
        throw new Error('invalid-response-chunk');
      const bytes = Buffer.from(data.base64, 'base64');
      if (!bytes.length || pending.seen + bytes.length > Number.MAX_SAFE_INTEGER
        || pending.originalByteLength !== undefined && pending.seen + bytes.length > pending.originalByteLength)
        throw new Error('invalid-response-size');
      pending.index++;
      pending.seen += bytes.length;
      const available = Math.max(0, Math.min(RESPONSE_BYTES - pending.retainedBytes, RUN_RESPONSE_BYTES - this.runBytes));
      const retained = bytes.subarray(0, available);
      if (retained.length) { pending.retained.push(retained); pending.retainedBytes += retained.length; this.runBytes += retained.length; }
      if (retained.length < bytes.length) pending.truncated = true;
      return { type: 'source-chunk-accepted' };
    }
    if (type !== 'provider-response-completed' || !['complete', 'truncated', 'incomplete'].includes(String(data.completeness))
      || data.completeness === 'complete' && pending.originalByteLength !== undefined
        && pending.seen !== pending.originalByteLength
      || data.completeness === 'truncated' && pending.originalByteLength !== undefined
        && pending.seen >= pending.originalByteLength) throw new Error('invalid-response-end');
    this.pending = undefined;
    const completeness = pending.truncated || data.completeness === 'truncated' ? 'truncated' : data.completeness;
    return { type: 'provider-response-observed', caseId, attempt, callId: pending.callId,
      provisionalTurnId: pending.provisionalTurnId, bytes: Buffer.concat(pending.retained),
      ...(pending.contentType === undefined ? {} : { contentType: pending.contentType }),
      ...(pending.originalByteLength === undefined ? {} : { originalByteLength: pending.originalByteLength }),
      completeness: completeness as 'complete' | 'truncated' | 'incomplete' };
  }
}
