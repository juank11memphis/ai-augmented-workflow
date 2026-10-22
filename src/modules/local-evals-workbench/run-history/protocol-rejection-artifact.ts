import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import type { EvidenceFieldRange, Outcome } from './contracts.js';
import { ArtifactFault, ArtifactPaths, failure, missing } from './artifact-paths.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { AtomicArtifactFile, SafetyFault } from './atomic-artifact-file.js';
import { logicalId } from './validation.js';

export const MAX_REJECTED_OUTPUT_BYTES = 64_000;
const RANGE_BYTES = 1024;

export class ProtocolRejectionArtifact {
  constructor(private readonly paths: ArtifactPaths, private readonly files?: AtomicArtifactFile) {}

  async save(suiteId: string, runId: string, bytes: Uint8Array): Promise<Outcome<string>> {
    if (!logicalId(suiteId) || !logicalId(runId) || !(bytes instanceof Uint8Array)
      || bytes.length < 1 || bytes.length > MAX_REJECTED_OUTPUT_BYTES || !this.files)
      return { status: 'blocked', reason: 'invalid-input' };
    try {
      const relative = this.paths.protocolRejection(suiteId, runId);
      const target = await this.paths.verify(relative);
      try { await lstat(target); return { status: 'blocked', reason: 'corrupt' }; }
      catch (error) { if (!missing(error)) throw error; }
      await this.files.writeBytes(relative, bytes);
      return { status: 'ok', value: relative };
    } catch (error) { return error instanceof SafetyFault ? { status: 'blocked', reason: error.reason } : failure(error); }
  }

  async range(suiteId: string, runId: string, locator: string, byteCount: number, offset: number,
    limit = RANGE_BYTES): Promise<Outcome<EvidenceFieldRange>> {
    if (!logicalId(suiteId) || !logicalId(runId) || locator !== this.paths.protocolRejection(suiteId, runId)
      || !Number.isSafeInteger(byteCount) || byteCount < 1 || byteCount > MAX_REJECTED_OUTPUT_BYTES
      || !Number.isSafeInteger(offset) || offset < 0 || offset >= byteCount
      || !Number.isSafeInteger(limit) || limit < 1 || limit > RANGE_BYTES)
      return { status: 'blocked', reason: 'invalid-input' };
    const safety = await new ArtifactSafetyAdapter(this.paths).check([locator]);
    if (safety.status !== 'ok') return safety;
    try {
      const target = await this.paths.verify(locator);
      const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const before = await file.stat();
        if (!before.isFile() || before.nlink !== 1 || before.size !== byteCount) throw new ArtifactFault('corrupt');
        const bytes = Buffer.alloc(Math.min(limit, byteCount - offset));
        let count = 0;
        while (count < bytes.length) {
          const read = await file.read(bytes, count, bytes.length - count, offset + count);
          if (read.bytesRead === 0) throw new ArtifactFault('corrupt');
          count += read.bytesRead;
        }
        const after = await lstat(await this.paths.verify(locator));
        if (before.ino !== after.ino || before.dev !== after.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs)
          throw new ArtifactFault('unsafe-path');
        return { status: 'ok', value: { locator, offset, byteLength: bytes.length, bytes,
          nextOffset: offset + bytes.length < byteCount ? offset + bytes.length : null } };
      } finally { await file.close(); }
    } catch (error) { return failure(error); }
  }
}
