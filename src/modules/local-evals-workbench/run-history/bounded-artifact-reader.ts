import { constants } from 'node:fs';
import { open, lstat } from 'node:fs/promises';
import type { Outcome } from './contracts.js';
import { ArtifactPaths, ArtifactFault, failure } from './artifact-paths.js';
import { boundedJson } from './validation.js';
export class BoundedArtifactReader {
  constructor(readonly paths: ArtifactPaths, private readonly onRead?: (relative: string) => void) {}
  async read<T>(relative: string, maxBytes: number, validate: (value: unknown) => value is T): Promise<Outcome<T>> {
    try {
      const target = await this.paths.verify(relative);
      const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.nlink !== 1) throw new ArtifactFault('unsafe-path');
        if (stat.size > maxBytes) throw new ArtifactFault('limit-exceeded');
        this.onRead?.(relative);
        const bytes = Buffer.alloc(maxBytes + 1);
        let length = 0;
        while (length <= maxBytes) {
          const result = await file.read(bytes, length, bytes.length - length, length);
          if (!result.bytesRead) break;
          length += result.bytesRead;
        }
        if (length > maxBytes) throw new ArtifactFault('limit-exceeded');
        const current = await lstat(await this.paths.verify(relative));
        if (stat.ino !== current.ino || stat.dev !== current.dev || stat.size !== current.size || stat.mtimeMs !== current.mtimeMs) throw new ArtifactFault('unsafe-path');
        let value: unknown;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))); }
        catch { throw new ArtifactFault('corrupt'); }
        if (!boundedJson(value, maxBytes) || !validate(value)) throw new ArtifactFault('corrupt');
        return { status: 'ok', value };
      } finally { await file.close(); }
    } catch (error) { return failure(error); }
  }
}
