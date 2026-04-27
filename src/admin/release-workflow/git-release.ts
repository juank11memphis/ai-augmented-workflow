import { execFileSync } from 'node:child_process';

import { parseSemverVersion } from '../generate-changelog/semver.js';
import type { ReleaseRange, ReleaseWarning } from './command.js';

export type ResolveReleaseRangeResult =
  | {
      status: 'ok';
      range: ReleaseRange;
      usedLatestSemverTag: boolean;
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ReleaseWarning[];
    };

export type CheckReleaseTagResult =
  | {
      status: 'ok';
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ReleaseWarning[];
    };

export function resolveReleaseRange(command: { fromRef?: string; toRef?: string }, cwd = process.cwd()): ResolveReleaseRangeResult {
  if (!isInsideGitRepository(cwd)) {
    return blocked('not-git-repository', 'Run the release workflow inside a git repository.');
  }

  if (!isWorkingTreeClean(cwd)) {
    return blocked('dirty-working-tree', 'Working tree must be clean before planning a release.');
  }

  const toRef = command.toRef ?? 'HEAD';
  if (!isValidCommitRef(toRef, cwd)) {
    return blocked('invalid-git-ref', `Could not resolve git ref \`${toRef}\`.`);
  }

  if (command.fromRef) {
    if (!isValidCommitRef(command.fromRef, cwd)) {
      return blocked('invalid-git-ref', `Could not resolve git ref \`${command.fromRef}\`.`);
    }

    return {
      status: 'ok',
      range: {
        fromRef: command.fromRef,
        toRef,
      },
      usedLatestSemverTag: false,
    };
  }

  const latestSemverTag = getLatestReachableSemverTag(toRef, cwd);
  if (!latestSemverTag) {
    return blocked('missing-semver-tag', 'No previous SemVer-like release tag found. Provide --from and --version to release from an explicit baseline.');
  }

  return {
    status: 'ok',
    range: {
      fromRef: latestSemverTag,
      toRef,
    },
    usedLatestSemverTag: true,
  };
}

export function checkReleaseTagAvailable(tagName: string, cwd = process.cwd()): CheckReleaseTagResult {
  if (tagExists(tagName, cwd)) {
    return blocked('existing-target-tag', `Release tag \`${tagName}\` already exists.`);
  }

  return { status: 'ok' };
}

function isInsideGitRepository(cwd: string): boolean {
  try {
    return runGit(['rev-parse', '--is-inside-work-tree'], cwd).trim() === 'true';
  } catch {
    return false;
  }
}

function isWorkingTreeClean(cwd: string): boolean {
  return runGit(['status', '--porcelain'], cwd).trim().length === 0;
}

function isValidCommitRef(ref: string, cwd: string): boolean {
  try {
    runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

function getLatestReachableSemverTag(toRef: string, cwd: string): string | undefined {
  const tags = readReachableTags(toRef, cwd);
  return tags.find((tag) => parseSemverVersion(tag).status === 'ok');
}

function readReachableTags(toRef: string, cwd: string): string[] {
  try {
    return runGit(['tag', '--merged', toRef, '--sort=-version:refname'], cwd)
      .split('\n')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  } catch {
    return [];
  }
}

function tagExists(tagName: string, cwd: string): boolean {
  try {
    runGit(['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], cwd);
    return true;
  } catch {
    return false;
  }
}

function blocked(code: ReleaseWarning['code'], message: string): ResolveReleaseRangeResult {
  return {
    status: 'blocked',
    message,
    warnings: [{ code, message }],
  };
}

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
