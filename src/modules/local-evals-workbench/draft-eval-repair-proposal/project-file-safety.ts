import fs from 'node:fs/promises';
import path from 'node:path';
import type { SafeProjectFileReaderPort } from './ports.js';

const MAX_FILE_PREVIEW_BYTES = 4 * 1024;
const SECRET_PATTERNS = [/^\.env(?:\.|$)/, /(?:^|\/|\\)\.env(?:\.|$)/, /secret/i, /credential/i, /private[-_]?key/i, /(?:^|\/|\\)id_rsa$/i, /\.pem$/i, /\.key$/i, /token/i];

export type FileTargetValidation = { readonly status: 'ok'; readonly paths: readonly string[] } | { readonly status: 'blocked'; readonly unsafePaths: readonly string[]; readonly reason: string };

export function validateProjectFileTargets(projectRoot: string, targets: readonly string[]): FileTargetValidation {
  const root = path.resolve(projectRoot);
  const normalized = [...new Set(targets.map((target) => target.trim()).filter(Boolean))];
  const unsafe = normalized.filter((target) => !isSafeProjectPath(root, target));
  if (normalized.length === 0) return { status: 'blocked', unsafePaths: [], reason: 'Proposal must name at least one project file.' };
  if (unsafe.length > 0) return { status: 'blocked', unsafePaths: unsafe, reason: 'Proposal targets must stay inside the project root and avoid secret-like files.' };
  return { status: 'ok', paths: normalized };
}

export class NodeSafeProjectFileReader implements SafeProjectFileReaderPort {
  async readProjectFilePreviews(projectRoot: string, requestedPaths: readonly string[]) {
    const safe = validateProjectFileTargets(projectRoot, requestedPaths);
    if (safe.status === 'blocked') return { status: 'blocked' as const, reason: safe.reason, unsafePaths: safe.unsafePaths };
    const root = path.resolve(projectRoot);
    const files = [];
    for (const targetPath of safe.paths) {
      const absolutePath = path.resolve(root, targetPath);
      const realRoot = await realpathOrSelf(root);
      const realTarget = await realpathOrSelf(absolutePath);
      if (!isInsideRoot(realRoot, realTarget)) return { status: 'blocked' as const, reason: 'Project file path escapes the project root.', unsafePaths: [targetPath] };
      const content = await fs.readFile(realTarget, 'utf8').catch(() => '');
      files.push({ path: targetPath, preview: content.slice(0, MAX_FILE_PREVIEW_BYTES) });
    }
    return { status: 'ok' as const, files };
  }
}

function isSafeProjectPath(root: string, target: string): boolean {
  if (!target || path.isAbsolute(target)) return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(target))) return false;
  return isInsideRoot(root, path.resolve(root, target));
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function realpathOrSelf(filePath: string): Promise<string> {
  try { return await fs.realpath(filePath); } catch { return filePath; }
}
