import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 32 * 1024;
const SECRET = /(?:^|\/)(?:\.env(?:\.|$)|[^/]*(?:secret|credential|token|private[-_]?key)[^/]*|[^/]*\.(?:pem|key))|(?:^|\/)id_rsa$/i;

export type ProjectFileState =
  | { readonly status: 'present'; readonly path: string; readonly digest: string; readonly content: string; readonly preview: string }
  | { readonly status: 'absent'; readonly path: string };
export type ProjectFileStateResult =
  | { readonly status: 'ok'; readonly value: ProjectFileState }
  | { readonly status: 'blocked'; readonly reason: 'unsafe-path' | 'unreadable' | 'too-large' | 'unsupported-file' };

export async function readProjectFileState(projectRoot: string, relativePath: string): Promise<ProjectFileStateResult> {
  const root = path.resolve(projectRoot);
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\\') || relativePath.split('/').some(part => part === '..' || part === '.' || !part)
    || relativePath === 'evals/artifacts' || relativePath.startsWith('evals/artifacts/') || SECRET.test(relativePath)) {
    return { status: 'blocked', reason: 'unsafe-path' };
  }
  const target = path.resolve(root, relativePath);
  if (!inside(root, target)) return { status: 'blocked', reason: 'unsafe-path' };
  try {
    const realRoot = await fs.realpath(root);
    const nearest = await nearestExisting(target);
    const realNearest = await fs.realpath(nearest);
    if (!inside(realRoot, realNearest)) return { status: 'blocked', reason: 'unsafe-path' };
    const realRelative = path.relative(realRoot, realNearest).split(path.sep).join('/');
    if (realRelative === 'evals/artifacts' || realRelative.startsWith('evals/artifacts/') || SECRET.test(realRelative)) return { status: 'blocked', reason: 'unsafe-path' };
    let stat;
    try { stat = await fs.lstat(target); }
    catch (error) {
      if (isMissing(error) && nearest !== target) return { status: 'ok', value: { status: 'absent', path: relativePath } };
      return { status: 'blocked', reason: 'unreadable' };
    }
    if (!stat.isFile() || stat.nlink !== 1) return { status: 'blocked', reason: 'unsupported-file' };
    if (stat.size > MAX_BYTES) return { status: 'blocked', reason: 'too-large' };
    const file = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const opened = await file.stat();
      if (!opened.isFile() || opened.nlink !== 1 || opened.size > MAX_BYTES || opened.ino !== stat.ino || opened.dev !== stat.dev) return { status: 'blocked', reason: 'unsafe-path' };
      const bytes = await file.readFile();
      if (bytes.length > MAX_BYTES) return { status: 'blocked', reason: 'too-large' };
      const after = await fs.lstat(target);
      if (after.ino !== stat.ino || after.dev !== stat.dev || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) return { status: 'blocked', reason: 'unsafe-path' };
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { status: 'ok', value: { status: 'present', path: relativePath,
        digest: createHash('sha256').update(bytes).digest('hex'), content, preview: content.slice(0, 4096) } };
    } finally { await file.close(); }
  } catch {
    return { status: 'blocked', reason: 'unreadable' };
  }
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
async function nearestExisting(target: string): Promise<string> {
  let current = target;
  while (true) {
    try { await fs.lstat(current); return current; }
    catch (error) { if (!isMissing(error) || current === path.dirname(current)) throw error; current = path.dirname(current); }
  }
}
function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
