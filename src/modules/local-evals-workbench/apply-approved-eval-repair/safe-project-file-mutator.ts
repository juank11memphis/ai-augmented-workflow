import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProposedRepairChange } from '../repair-context/contracts.js';
import type { ProjectFileState } from '../repair-context/project-file-state.js';
import { readProjectFileState } from '../repair-context/project-file-state.js';
import { applySingleHunkDiff } from '../repair-context/single-hunk-diff.js';
import type { ApprovedProjectFileMutatorPort, ProjectFileMutationSafetyPort } from './ports.js';

export class NodeSafeProjectFileMutator implements ProjectFileMutationSafetyPort, ApprovedProjectFileMutatorPort {
  constructor(private readonly files: typeof fs = fs) {}
  async validateTargets(projectRoot: string, targetPaths: readonly string[]) {
    return validateMutationTargets(projectRoot, targetPaths);
  }

  async applyApprovedChange(request: {
    readonly projectRoot: string; readonly targetPaths: readonly string[];
    readonly approvedChange: ProposedRepairChange; readonly targetPrecondition: ProjectFileState;
  }) {
    const failed = (reason: string) => ({ status: 'failed' as const, reason, changedFiles: [] as const });
    if (request.targetPaths.length !== 1 || request.targetPaths[0] !== request.targetPrecondition.path
      || request.approvedChange.kind === 'instructions') return failed('unsupported-change');
    const targetPath = request.targetPaths[0]!;
    const safety = await validateMutationTargets(request.projectRoot, [targetPath]);
    if (safety.status === 'blocked') return failed('unsafe-target');
    const before = await readProjectFileState(request.projectRoot, targetPath);
    if (before.status !== 'ok' || before.value.status !== 'present' || !sameState(before.value, request.targetPrecondition)) return failed('stale-target');
    const absolutePath = path.resolve(request.projectRoot, targetPath);
    let content: string;
    try {
      if (request.approvedChange.kind === 'replacement') content = request.approvedChange.representation;
      else {
        if (before.value.status !== 'present') return failed('diff-target-absent');
        content = applySingleHunkDiff(before.value.content, targetPath, request.approvedChange.representation);
      }
      if (Buffer.byteLength(content, 'utf8') > 32 * 1024) return failed('change-too-large');
      if (content === before.value.content) return failed('no-content-change');
      const temporaryPath = `${absolutePath}.sibu-${randomUUID()}.tmp`;
      const parent = path.dirname(absolutePath);
      const originalParent = await this.files.realpath(parent);
      const original = await this.files.lstat(absolutePath);
      const originalMode = original.mode & 0o7777;
      let published = false;
      let temporaryLeft = false;
      let failure: string | null = null;
      try {
        await this.files.writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx', mode: originalMode });
        await this.files.chmod(temporaryPath, originalMode);
        const again = await readProjectFileState(request.projectRoot, targetPath);
        const current = await this.files.lstat(absolutePath);
        const currentParent = await this.files.realpath(parent);
        if (again.status !== 'ok' || !sameState(again.value, before.value)
          || current.ino !== original.ino || current.dev !== original.dev || currentParent !== originalParent) failure = 'stale-target';
        else { await this.files.rename(temporaryPath, absolutePath); published = true; }
      } catch { failure = 'change-application-failed'; }
      try { if (!published) await this.files.unlink(temporaryPath); }
      catch (error) {
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) {
          failure = 'temporary-cleanup-failed';
          temporaryLeft = true;
        }
      }
      if (failure) {
        const after = await readProjectFileState(request.projectRoot, targetPath);
        const changedFiles = [
          ...(after.status !== 'ok' || !sameState(after.value, before.value) ? [{ path: targetPath }] : []),
          ...(temporaryLeft ? [{ path: path.relative(request.projectRoot, temporaryPath) }] : []),
        ];
        return { status: 'failed' as const, reason: failure, changedFiles };
      }
      return { status: 'applied' as const, changedFiles: [{ path: targetPath }] };
    } catch {
      const after = await readProjectFileState(request.projectRoot, targetPath);
      const changedFiles = after.status !== 'ok' || !sameState(after.value, before.value) ? [{ path: targetPath }] : [];
      return { status: 'failed' as const, reason: 'change-application-failed', changedFiles };
    }
  }
}

export async function validateMutationTargets(projectRoot: string, targetPaths: readonly string[]): Promise<
  { readonly status: 'ok'; readonly safeTargets: readonly string[] }
  | { readonly status: 'blocked'; readonly reason: string; readonly unsafePaths: readonly string[] }
> {
  if (targetPaths.length !== 1) return { status: 'blocked', reason: 'A repair must target exactly one file.', unsafePaths: targetPaths };
  const state = await readProjectFileState(projectRoot, targetPaths[0]!);
  if (state.status === 'blocked') return { status: 'blocked', reason: 'Repair target is unsafe or unreadable.', unsafePaths: targetPaths };
  return { status: 'ok', safeTargets: targetPaths };
}

function sameState(left: ProjectFileState, right: ProjectFileState): boolean {
  return left.path === right.path && left.status === right.status
    && (left.status === 'absent' || right.status === 'present' && left.digest === right.digest);
}
