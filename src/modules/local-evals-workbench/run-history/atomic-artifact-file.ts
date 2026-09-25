import { constants } from 'node:fs';
import { mkdir, open, lstat, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ArtifactSafetyPort } from './contracts.js';
import { ArtifactFault, ArtifactPaths } from './artifact-paths.js';
export type WriteStage = 'create' | 'write' | 'flush' | 'rename' | 'directory-sync';
export class AtomicArtifactFile {
  constructor(readonly paths: ArtifactPaths, private readonly safety: ArtifactSafetyPort,
    private readonly fault?: (stage: WriteStage, relative: string) => void) {}
  async ready(relative: string): Promise<string> {
    const checked = await this.safety.check([relative]);
    if (checked.status !== 'ok') throw new SafetyFault(checked.reason);
    return this.paths.verify(relative);
  }
  async directory(relative: string): Promise<void> {
    await this.ready(relative);
    let current = this.paths.root;
    for (const part of ['evals', 'artifacts', ...relative.split('/').filter(Boolean)]) {
      current = path.join(current, part);
      await this.paths.verify(relative);
      try { await mkdir(current, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      if (!(await lstat(current)).isDirectory() || (await lstat(current)).isSymbolicLink()) throw new ArtifactFault('unsafe-path');
    }
  }
  async write(relative: string, value: unknown): Promise<void> {
    // Caller supplies validated and sanitized data; no raw input ever reaches a temp file.
    const bytes = Buffer.from(JSON.stringify(value));
    await this.directory(relative.split('/').slice(0, -1).join('/'));
    const temp = `${relative}.tmp-${randomBytes(8).toString('hex')}`;
    const temporaryPath = await this.ready(temp);
    this.fault?.('create', relative);
    const file = await open(temporaryPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
      this.fault?.('write', relative); await file.writeFile(bytes);
      this.fault?.('flush', relative); await file.sync();
      const current = await lstat(await this.paths.verify(temp)); const opened = await file.stat();
      if (current.ino !== opened.ino || current.dev !== opened.dev) throw new ArtifactFault('unsafe-path');
    } finally { await file.close(); }
    const target = await this.ready(relative);
    await this.ready(temp);
    this.fault?.('rename', relative); await rename(temporaryPath, target);
    this.fault?.('directory-sync', relative);
    // Some platforms do not support directory fsync. File fsync + rename remains mandatory.
    let directory;
    try { directory = await open(path.dirname(target), constants.O_RDONLY | constants.O_NOFOLLOW); await directory.sync(); }
    catch (error) { if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(String((error as NodeJS.ErrnoException).code))) throw error; }
    finally { await directory?.close(); }
  }

}
export class SafetyFault extends Error {
  constructor(readonly reason: import('./contracts.js').Reason) { super(reason); }
}
