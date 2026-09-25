import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { Outcome } from './contracts.js';
import { logicalId } from './validation.js';
export class ArtifactFault extends Error {
  constructor(readonly reason: 'unsafe-path' | 'unverifiable-root' | 'unavailable' | 'not-found' | 'corrupt' | 'limit-exceeded' | 'owner-unknown') { super(reason); }
}
export function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException)?.code === 'ENOENT'; }
export class ArtifactPaths {
  readonly root: string;
  readonly artifactRoot: string;
  constructor(projectRoot: string) {
    if (!projectRoot.trim()) throw new ArtifactFault('unverifiable-root');
    this.root = path.resolve(projectRoot);
    this.artifactRoot = path.join(this.root, 'evals', 'artifacts');
  }
  async verify(relative = ''): Promise<string> {
    if (await realpath(this.root) !== this.root || !(await lstat(this.root)).isDirectory()) throw new ArtifactFault('unverifiable-root');
    const parts = relative ? relative.split('/') : [];
    if (parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(part) || part === '.' || part === '..')) throw new ArtifactFault('unsafe-path');
    let current = this.root;
    for (const [index, part] of ['evals', 'artifacts', ...parts].entries()) {
      current = path.join(current, part);
      try {
        const stat = await lstat(current);
        if (stat.isSymbolicLink() || !(stat.isDirectory() || stat.isFile()) || stat.isFile() && (stat.nlink !== 1 || index < 2 || index !== parts.length + 1)) throw new ArtifactFault('unsafe-path');
        if (await realpath(current) !== current) throw new ArtifactFault('unsafe-path');
      } catch (error) { if (!missing(error)) throw error; }
    }
    return current;
  }
  run(suiteId: string, runId: string): string { this.ids(suiteId, runId); return `${component(suiteId)}/${component(runId)}/run.json`; }
  attempt(suiteId: string, runId: string, caseId: string, number: number): string {
    this.ids(suiteId, runId, caseId);
    if (!Number.isSafeInteger(number) || number < 1 || number > 20) throw new ArtifactFault('unsafe-path');
    return `${component(suiteId)}/${component(runId)}/cases/${component(caseId)}/${number}.json`;
  }
  index(suiteId: string): string { this.ids(suiteId); return `${component(suiteId)}/index.json`; }
  private ids(...ids: string[]) { if (!ids.every(logicalId)) throw new ArtifactFault('unsafe-path'); }
}
export function failure(error: unknown): Outcome<never> {
  return { status: 'blocked', reason: error instanceof ArtifactFault ? error.reason : missing(error) ? 'not-found' : 'unavailable' };
}

// Injective case-insensitive-safe mapping; common lowercase slugs stay readable.
// Escape the prefix itself so encoded IDs cannot collide with literal IDs.
export function component(id: string): string {
  if (!logicalId(id)) throw new ArtifactFault('unsafe-path');
  return /^[a-z0-9][a-z0-9_-]*$/.test(id) && !id.startsWith('id-') && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(id)
    ? id : `id-${Buffer.from(id).toString('hex')}`;
}
export function componentIdentity(value: string): string | undefined {
  const decoded = value.startsWith('id-') ? Buffer.from(value.slice(3), 'hex').toString('utf8') : value;
  return logicalId(decoded) && component(decoded) === value ? decoded : undefined;
}
