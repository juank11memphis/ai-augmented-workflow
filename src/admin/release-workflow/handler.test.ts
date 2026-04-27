import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { parseSemverVersion } from '../generate-changelog/semver.js';
import { checkReleaseTagAvailable, resolveReleaseRange } from './git-release.js';
import { formatReleaseTagName, incrementSemverVersion } from './release-plan.js';

describe('incrementSemverVersion', () => {
  it('increments patch versions', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'patch').version, '1.2.4');
  });

  it('increments minor versions and resets patch', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'minor').version, '1.3.0');
  });

  it('increments major versions and resets minor and patch', () => {
    const version = parseVersion('1.2.3');

    assert.equal(incrementSemverVersion(version, 'major').version, '2.0.0');
  });
});

describe('formatReleaseTagName', () => {
  it('formats release tags with a leading v', () => {
    assert.equal(formatReleaseTagName('0.2.0'), 'v0.2.0');
  });
});

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('resolveReleaseRange', () => {
  it('blocks dirty working trees before release planning', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    fs.writeFileSync(path.join(rootPath, 'dirty.txt'), 'dirty', 'utf8');

    const result = resolveReleaseRange({}, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /Working tree must be clean/);
    assert.equal(result.warnings.some((warning) => warning.code === 'dirty-working-tree'), true);
  });

  it('uses the latest reachable SemVer-like tag when fromRef is omitted', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'feat: second release baseline');
    tag(rootPath, 'v0.2.0');
    commitFile(rootPath, 'three.txt', 'three', 'fix: handle release planning');

    const result = resolveReleaseRange({}, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.range.fromRef, 'v0.2.0');
    assert.equal(result.range.toRef, 'HEAD');
    assert.equal(result.usedLatestSemverTag, true);
  });

  it('ignores non-SemVer tags for automatic baseline selection', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'docs: update release notes');
    tag(rootPath, 'release-notes');
    commitFile(rootPath, 'three.txt', 'three', 'fix: handle release planning');

    const result = resolveReleaseRange({}, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.range.fromRef, 'v0.1.0');
  });

  it('blocks when no SemVer-like baseline tag is available', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'release-notes');

    const result = resolveReleaseRange({}, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /No previous SemVer-like release tag found/);
    assert.equal(result.warnings.some((warning) => warning.code === 'missing-semver-tag'), true);
  });

  it('uses explicit fromRef and toRef when provided', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'baseline');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = resolveReleaseRange({ fromRef: 'baseline', toRef: 'HEAD' }, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.deepEqual(result.range, { fromRef: 'baseline', toRef: 'HEAD' });
    assert.equal(result.usedLatestSemverTag, false);
  });
});

describe('checkReleaseTagAvailable', () => {
  it('blocks when the target tag already exists', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.2.0');

    const result = checkReleaseTagAvailable('v0.2.0', rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /already exists/);
    assert.equal(result.warnings.some((warning) => warning.code === 'existing-target-tag'), true);
  });
});

function parseVersion(value: string) {
  const result = parseSemverVersion(value);

  if (result.status !== 'ok') {
    throw new Error(result.message);
  }

  return result.version;
}

function createGitRepository(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-release-test-'));
  temporaryRoots.push(rootPath);
  runGit(rootPath, ['init']);
  runGit(rootPath, ['config', 'user.name', 'Sibu Test']);
  runGit(rootPath, ['config', 'user.email', 'sibu@example.com']);
  return rootPath;
}

function commitFile(rootPath: string, fileName: string, contents: string, subject: string): void {
  fs.writeFileSync(path.join(rootPath, fileName), contents, 'utf8');
  runGit(rootPath, ['add', fileName]);
  runGit(rootPath, ['commit', '-m', subject]);
}

function tag(rootPath: string, tagName: string): void {
  runGit(rootPath, ['tag', tagName]);
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
