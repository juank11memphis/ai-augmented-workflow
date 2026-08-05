import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const CHECKER_PATH = path.resolve('templates/scripts/check-touched-source-file-lines.mjs');

describe('check-touched-source-file-lines', () => {
  it('passes with a concise report when no source files are touched', () => {
    const repo = createGitRepo();

    try {
      const result = runChecker(repo.path);

      assert.equal(result.status, 0);
      assert.match(result.stdout, /Source file size gate passed: 0 touched source file\(s\) checked, limit 500 lines\./);
      assert.equal(result.stderr, '');
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('passes when a staged source file has exactly 500 physical lines', () => {
    const repo = createGitRepo();

    try {
      writeFile(repo.path, 'src/exactly-500.ts', lines(500));
      git(repo.path, ['add', 'src/exactly-500.ts']);

      const result = runChecker(repo.path);

      assert.equal(result.status, 0);
      assert.match(result.stdout, /1 touched source file\(s\) checked/);
      assert.equal(result.stderr, '');
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('fails and reports path and line count when an unstaged source file has 501 lines', () => {
    const repo = createGitRepo();

    try {
      writeFile(repo.path, 'src/too-large.ts', 'export const value = 1;\n');
      commitAll(repo.path, 'add small source file');
      writeFile(repo.path, 'src/too-large.ts', lines(501));

      const result = runChecker(repo.path);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Source file size gate failed: 1 touched source file\(s\) exceed 500 lines\./);
      assert.match(result.stderr, /- src\/too-large\.ts: 501 lines/);
      assert.equal(result.stdout, '');
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('ignores untouched oversized source files', () => {
    const repo = createGitRepo();

    try {
      writeFile(repo.path, 'src/legacy-large.ts', lines(501));
      commitAll(repo.path, 'add oversized legacy source file');

      const result = runChecker(repo.path);

      assert.equal(result.status, 0);
      assert.match(result.stdout, /0 touched source file\(s\) checked/);
      assert.equal(result.stderr, '');
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('fails and reports oversized untracked source files', () => {
    const repo = createGitRepo();

    try {
      writeFile(repo.path, 'src/untracked-large.tsx', lines(501));

      const result = runChecker(repo.path);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /- src\/untracked-large\.tsx: 501 lines/);
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('ignores deleted files and non-source files', () => {
    const repo = createGitRepo();

    try {
      writeFile(repo.path, 'src/deleted-large.ts', lines(501));
      commitAll(repo.path, 'add source file to delete');
      unlinkSync(path.join(repo.path, 'src/deleted-large.ts'));
      writeFile(repo.path, 'notes/oversized.txt', lines(1000));

      const result = runChecker(repo.path);

      assert.equal(result.status, 0);
      assert.match(result.stdout, /0 touched source file\(s\) checked/);
      assert.equal(result.stderr, '');
    } finally {
      removeTempDirectory(repo.path);
    }
  });

  it('fails clearly outside a git repository', () => {
    const directory = createTempDirectory();

    try {
      const result = runChecker(directory.path);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Source file size gate failed: Unable to find a git repository\./);
    } finally {
      removeTempDirectory(directory.path);
    }
  });
});

function createGitRepo(): TempDirectory {
  const repo = createTempDirectory();
  git(repo.path, ['init']);
  git(repo.path, ['config', 'user.email', 'sibu-test@example.com']);
  git(repo.path, ['config', 'user.name', 'Sibu Test']);
  writeFile(repo.path, 'README.md', '# Test repo\n');
  commitAll(repo.path, 'initial commit');
  return repo;
}

function createTempDirectory(): TempDirectory {
  return { path: mkdtempSync(path.join(tmpdir(), 'sibu-file-size-gate-')) };
}

type TempDirectory = {
  path: string;
};

function removeTempDirectory(tempPath: string): void {
  rmSync(tempPath, { recursive: true, force: true });
}

function runChecker(cwd: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CHECKER_PATH], { cwd, encoding: 'utf8' });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function commitAll(cwd: string, message: string): void {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function writeFile(rootPath: string, relativePath: string, contents: string): void {
  const absolutePath = path.join(rootPath, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function lines(count: number): string {
  return Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n') + '\n';
}
