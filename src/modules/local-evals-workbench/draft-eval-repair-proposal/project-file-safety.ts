import fs from 'node:fs/promises';
import path from 'node:path';
import type { SafeProjectFileReaderPort } from './ports.js';
import { readProjectFileState } from '../repair-context/project-file-state.js';

const SECRET_PATTERNS = [/^\.env(?:\.|$)/, /(?:^|\/|\\)\.env(?:\.|$)/, /secret/i, /credential/i, /(?:api|private)[-_]?key/i, /(?:^|[/._-])key(?:$|[/._-])/i, /(?:^|\/|\\)id_(?:rsa|dsa|ecdsa|ed25519)$/i, /\.pem$/i, /\.key$/i, /token/i];

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
  async readTargetState(projectRoot: string, targetPath: string) {
    const state = await readProjectFileState(projectRoot, targetPath);
    return state.status === 'ok' ? state : { status: 'blocked' as const, reason: state.reason };
  }
  async readProjectFilePreviews(projectRoot: string, requestedPaths: readonly string[]) {
    const safe = validateProjectFileTargets(projectRoot, requestedPaths);
    if (safe.status === 'blocked') return { status: 'blocked' as const, reason: safe.reason, unsafePaths: safe.unsafePaths };
    const files = [];
    for (const targetPath of safe.paths) {
      const state = await readProjectFileState(projectRoot, targetPath);
      if (state.status === 'blocked' || state.value.status !== 'present') return { status: 'blocked' as const, reason: 'Named project file is unsafe or unreadable.', unsafePaths: [targetPath] };
      // Repair replacements need the complete bounded source, not a truncated preview.
      files.push({ path: targetPath, preview: state.value.content, digest: state.value.digest });
    }
    return { status: 'ok' as const, files };
  }
}

function isSafeProjectPath(root: string, target: string): boolean {
  if (!target || path.isAbsolute(target) || target.includes('\\') || target.split('/').some(part => !part || part === '.' || part === '..')) return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(target))) return false;
  return isInsideRoot(root, path.resolve(root, target));
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
