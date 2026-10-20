import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import type { EvidenceFieldRange, Outcome, ProviderResponseReference, ProviderResponseWrite } from './contracts.js';
import { ArtifactFault, ArtifactPaths, failure, missing } from './artifact-paths.js';
import { AtomicArtifactFile, SafetyFault } from './atomic-artifact-file.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { LIMITS } from './limits.js';
import { integer, logicalId } from './validation.js';

function contentType(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 256 && /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+\/-]*(?:; ?[A-Za-z0-9=._+-]+)*$/.test(value);
}

export class ProviderResponseArtifact {
  constructor(private readonly paths: ArtifactPaths, private readonly files?: AtomicArtifactFile) {}

  async save(value: ProviderResponseWrite): Promise<Outcome<ProviderResponseReference>> {
    if (![value.suiteId, value.runId, value.caseId, value.callId, value.provisionalTurnId].every(logicalId)
      || value.attempt !== 1 || !(value.bytes instanceof Uint8Array)
      || (value.role !== undefined && !['tested-model', 'judge'].includes(value.role))
      || (value.role === 'judge' ? !logicalId(value.checkId) : value.checkId !== undefined)
      || !['complete', 'truncated', 'incomplete'].includes(value.completeness)
      || value.contentType !== undefined && !contentType(value.contentType)
      || value.originalByteLength !== undefined && (!integer(value.originalByteLength) || value.originalByteLength < value.bytes.byteLength)
      || value.completeness === 'complete' && value.originalByteLength !== undefined && value.originalByteLength !== value.bytes.byteLength)
      return { status: 'blocked', reason: 'invalid-input' };
    if (!this.files) return { status: 'blocked', reason: 'unavailable' };
    try {
      const relative = this.paths.response(value.suiteId, value.runId, value.caseId, value.attempt, value.callId);
      const existing = await this.paths.verify(relative);
      try { await lstat(existing); return { status: 'blocked', reason: 'corrupt' }; }
      catch (error) { if (!missing(error)) throw error; }
      const reference: ProviderResponseReference = {
        callId: value.callId, provisionalTurnId: value.provisionalTurnId, status: value.completeness, locator: relative,
        ...(value.role === undefined ? {} : { role: value.role }),
        ...(value.checkId === undefined ? {} : { checkId: value.checkId }),
        byteLength: value.bytes.byteLength, ...(value.contentType === undefined ? {} : { contentType: value.contentType }),
        ...(value.originalByteLength === undefined ? {} : { originalByteLength: value.originalByteLength }),
      };
      await this.files.writeBytes(relative, value.bytes);
      return { status: 'ok', value: reference };
    } catch (error) { return error instanceof SafetyFault ? { status: 'blocked', reason: error.reason } : failure(error); }
  }

  async verify(suiteId: string, runId: string, caseId: string, attempt: number, reference: ProviderResponseReference): Promise<Outcome<null>> {
    if (![suiteId, runId, caseId, reference.callId, reference.provisionalTurnId].every(logicalId) || attempt !== 1
      || (reference.role !== undefined && !['tested-model', 'judge'].includes(reference.role))
      || (reference.role === 'judge' ? !logicalId(reference.checkId) : reference.checkId !== undefined)
      || !integer(reference.byteLength)
      || !['complete', 'truncated', 'incomplete'].includes(reference.status)
      || reference.contentType !== undefined && !contentType(reference.contentType)
      || reference.originalByteLength !== undefined && (!integer(reference.originalByteLength) || reference.originalByteLength < reference.byteLength)
      || reference.status === 'complete' && reference.originalByteLength !== undefined && reference.originalByteLength !== reference.byteLength)
      return { status: 'blocked', reason: 'corrupt' };
    try {
      const expected = this.paths.response(suiteId, runId, caseId, attempt, reference.callId);
      if (reference.locator !== expected) return { status: 'blocked', reason: 'corrupt' };
      const safety = await new ArtifactSafetyAdapter(this.paths).check([expected]);
      if (safety.status !== 'ok') return safety;
      const stat = await lstat(await this.paths.verify(expected));
      return stat.isFile() && stat.nlink === 1 && stat.size === reference.byteLength
        ? { status: 'ok', value: null } : { status: 'blocked', reason: 'corrupt' };
    } catch (error) { return failure(error); }
  }

  async range(suiteId: string, runId: string, caseId: string, attempt: number, reference: ProviderResponseReference,
    offset: number, limit = LIMITS.providerResponseRangeBytes): Promise<Outcome<EvidenceFieldRange>> {
    if (!integer(offset) || !integer(limit, LIMITS.providerResponseRangeBytes) || limit < 1)
      return { status: 'blocked', reason: 'invalid-input' };
    const checked = await this.verify(suiteId, runId, caseId, attempt, reference);
    if (checked.status !== 'ok') return checked;
    if (offset > reference.byteLength) return { status: 'blocked', reason: 'invalid-input' };
    try {
      const target = await this.paths.verify(reference.locator);
      const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const before = await file.stat();
        if (!before.isFile() || before.nlink !== 1 || before.size !== reference.byteLength) throw new ArtifactFault('unsafe-path');
        const bytes = Buffer.alloc(Math.min(limit, reference.byteLength - offset));
        let count = 0;
        while (count < bytes.length) {
          const read = await file.read(bytes, count, bytes.length - count, offset + count);
          if (read.bytesRead === 0) throw new ArtifactFault('corrupt');
          count += read.bytesRead;
        }
        const after = await lstat(await this.paths.verify(reference.locator));
        if (before.ino !== after.ino || before.dev !== after.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs)
          throw new ArtifactFault('unsafe-path');
        return { status: 'ok', value: { locator: reference.locator, offset, byteLength: bytes.length, bytes,
          nextOffset: offset + bytes.length < reference.byteLength ? offset + bytes.length : null } };
      } finally { await file.close(); }
    } catch (error) { return failure(error); }
  }

}
