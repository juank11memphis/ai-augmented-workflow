import { execFileSync } from 'node:child_process';

import type { ChangelogSourceRange, ChangelogWarning, GenerateChangelogCommand, RawCommit } from './command.js';

export type GitHistoryResult =
  | {
      status: 'ok';
      commits: RawCommit[];
      sourceRange: ChangelogSourceRange;
      warnings: ChangelogWarning[];
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ChangelogWarning[];
    };

export function readGitHistory(command: Pick<GenerateChangelogCommand, 'fromRef' | 'toRef'>, cwd = process.cwd()): GitHistoryResult {
  if (!isInsideGitRepository(cwd)) {
    return blocked('not-git-repository', 'Run the changelog workflow inside a git repository.');
  }

  const toRef = command.toRef ?? 'HEAD';
  if (!isValidCommitRef(toRef, cwd)) {
    return blocked('invalid-git-ref', `Could not resolve git ref \`${toRef}\`.`);
  }

  if (command.fromRef && !isValidCommitRef(command.fromRef, cwd)) {
    return blocked('invalid-git-ref', `Could not resolve git ref \`${command.fromRef}\`.`);
  }

  const latestTag = command.fromRef ? undefined : getLatestReachableTag(toRef, cwd);
  const fromRef = command.fromRef ?? latestTag;
  const missingTag = !command.fromRef && !latestTag;
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  const commits = readCommits(range, cwd);
  const warnings: ChangelogWarning[] = missingTag
    ? [
        {
          code: 'missing-tag',
          message: 'No previous tag found. Using all reachable commits.',
        },
      ]
    : [];

  return {
    status: 'ok',
    commits,
    sourceRange: {
      fromRef,
      toRef,
      usedLatestTag: !command.fromRef && Boolean(latestTag),
      missingTag,
    },
    warnings,
  };
}

function isInsideGitRepository(cwd: string): boolean {
  try {
    return runGit(['rev-parse', '--is-inside-work-tree'], cwd).trim() === 'true';
  } catch {
    return false;
  }
}

function isValidCommitRef(ref: string, cwd: string): boolean {
  try {
    runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

function getLatestReachableTag(toRef: string, cwd: string): string | undefined {
  try {
    const tag = runGit(['describe', '--tags', '--abbrev=0', toRef], cwd).trim();
    return tag || undefined;
  } catch {
    return undefined;
  }
}

function readCommits(range: string, cwd: string): RawCommit[] {
  const output = runGit(['log', '--format=%H%x1f%s%x1f%b%x1e', range], cwd);

  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map(parseCommitRecord);
}

function parseCommitRecord(record: string): RawCommit {
  const [hash = '', subject = '', body = ''] = record.split('\x1f');

  return {
    hash,
    subject,
    body,
  };
}

function blocked(code: ChangelogWarning['code'], message: string): GitHistoryResult {
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
