import fs from 'node:fs/promises';
import path from 'node:path';

import type { ProposedRepairChange } from '../draft-eval-repair-proposal/result.js';
import type { ApprovedProjectFileMutatorPort, ProjectFileMutationSafetyPort } from './ports.js';

const SECRET_PATTERNS = [/^\.env(?:\.|$)/, /(?:^|\/|\\)\.env(?:\.|$)/, /secret/i, /credential/i, /private[-_]?key/i, /(?:^|\/|\\)id_rsa$/i, /\.pem$/i, /\.key$/i, /token/i];

export class NodeSafeProjectFileMutator implements ProjectFileMutationSafetyPort, ApprovedProjectFileMutatorPort {
  async validateTargets(projectRoot: string, targetPaths: readonly string[]) {
    return validateMutationTargets(projectRoot, targetPaths);
  }

  async applyApprovedChange(request: { readonly projectRoot: string; readonly targetPaths: readonly string[]; readonly approvedChange: ProposedRepairChange }) {
    if (request.approvedChange.kind === 'instructions') return { status: 'failed' as const, reason: 'instruction-only-change' };
    const safety = await validateMutationTargets(request.projectRoot, request.targetPaths);
    if (safety.status === 'blocked') return { status: 'failed' as const, reason: 'unsafe-target' };

    try {
      const changedFiles = [];
      for (const targetPath of safety.safeTargets) {
        const absolutePath = path.resolve(request.projectRoot, targetPath);
        if (request.approvedChange.kind === 'replacement') {
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          await fs.writeFile(absolutePath, request.approvedChange.representation, 'utf8');
        } else {
          const current = await fs.readFile(absolutePath, 'utf8');
          await fs.writeFile(absolutePath, applySimpleUnifiedDiff(current, request.approvedChange), 'utf8');
        }
        changedFiles.push({ path: targetPath });
      }
      return { status: 'applied' as const, changedFiles };
    } catch {
      return { status: 'failed' as const, reason: 'change-application-failed' };
    }
  }
}

export async function validateMutationTargets(projectRoot: string, targetPaths: readonly string[]): Promise<{ readonly status: 'ok'; readonly safeTargets: readonly string[] } | { readonly status: 'blocked'; readonly reason: string; readonly unsafePaths: readonly string[] }> {
  const root = path.resolve(projectRoot);
  const realRoot = await realpathOrSelf(root);
  const normalized = [...new Set(targetPaths.map((target) => target.trim()).filter(Boolean))];
  if (normalized.length === 0) return { status: 'blocked', reason: 'Proposal must name at least one project file.', unsafePaths: [] };

  const unsafePaths: string[] = [];
  for (const targetPath of normalized) {
    if (await isUnsafeTarget(root, realRoot, targetPath)) unsafePaths.push(targetPath);
  }
  if (unsafePaths.length > 0) return { status: 'blocked', reason: 'Proposal targets must stay inside the project root and avoid secret-like files.', unsafePaths };
  return { status: 'ok', safeTargets: normalized };
}

async function isUnsafeTarget(root: string, realRoot: string, targetPath: string): Promise<boolean> {
  if (!targetPath || path.isAbsolute(targetPath) || SECRET_PATTERNS.some((pattern) => pattern.test(targetPath))) return true;
  const absolutePath = path.resolve(root, targetPath);
  if (!isInsideRoot(root, absolutePath)) return true;
  const nearestExistingPath = await findNearestExistingPath(absolutePath);
  const realNearest = await realpathOrSelf(nearestExistingPath);
  return !isInsideRoot(realRoot, realNearest);
}

async function findNearestExistingPath(filePath: string): Promise<string> {
  let current = filePath;
  while (current !== path.dirname(current)) {
    try {
      await fs.lstat(current);
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  return current;
}

function applySimpleUnifiedDiff(current: string, change: ProposedRepairChange): string {
  const lines = change.representation.split(/\r?\n/);
  const removed = lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).map((line) => line.slice(1)).join('\n');
  const added = lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).map((line) => line.slice(1)).join('\n');
  if (!removed || !current.includes(removed)) throw new Error('Approved unified diff did not match target content.');
  return current.replace(removed, added);
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function realpathOrSelf(filePath: string): Promise<string> {
  try { return await fs.realpath(filePath); } catch { return filePath; }
}
