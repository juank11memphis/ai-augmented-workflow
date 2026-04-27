import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { buildChangelogProposal, classifyCommit } from './changelog-format.js';
import { readGitHistory } from './git-history.js';
import { parseSemverVersion } from './semver.js';
import type { ChangelogCategory, RawCommit } from './command.js';

describe('classifyCommit', () => {
  it('maps feat commits to Added entries', () => {
    const { entry, warnings } = classifyCommit(commit({ subject: 'feat: add changelog proposal generation' }));

    assert.equal(entry.category, 'Added');
    assert.equal(entry.text, 'add changelog proposal generation');
    assert.equal(entry.source, 'conventional-commit');
    assert.equal(entry.reviewNeeded, false);
    assert.deepEqual(warnings, []);
  });

  it('maps fix commits to Fixed entries', () => {
    const { entry } = classifyCommit(commit({ subject: 'fix: handle empty git history' }));

    assert.equal(entry.category, 'Fixed');
    assert.equal(entry.text, 'handle empty git history');
  });

  it('maps lower-impact conventional commits to Changed entries', () => {
    const types = ['perf', 'refactor', 'style', 'docs', 'test', 'build', 'ci', 'chore'];

    for (const type of types) {
      const { entry } = classifyCommit(commit({ subject: `${type}: update maintainer workflow` }));

      assert.equal(entry.category, 'Changed');
      assert.equal(entry.text, 'update maintainer workflow');
    }
  });

  it('maps obvious security wording to Security entries', () => {
    const { entry } = classifyCommit(commit({ subject: 'fix: patch security vulnerability in update check' }));

    assert.equal(entry.category, 'Security');
  });

  it('maps obvious deprecated wording to Deprecated entries', () => {
    const { entry } = classifyCommit(commit({ subject: 'feat: deprecate legacy workflow template' }));

    assert.equal(entry.category, 'Deprecated');
  });

  it('maps obvious removed wording to Removed entries', () => {
    const { entry } = classifyCommit(commit({ subject: 'feat: remove legacy workflow template' }));

    assert.equal(entry.category, 'Removed');
  });

  it('records breaking changes from bang syntax as review-needed concerns', () => {
    const { entry, warnings } = classifyCommit(commit({ subject: 'feat!: change managed file state format' }));

    assert.equal(entry.breakingChange, true);
    assert.equal(entry.reviewNeeded, true);
    assert.equal(warnings.some((warning) => warning.code === 'breaking-change'), true);
    assert.equal(warnings.some((warning) => warning.code === 'review-needed'), true);
  });

  it('records breaking changes from commit body markers as review-needed concerns', () => {
    const { entry, warnings } = classifyCommit(
      commit({
        subject: 'feat: change managed file state format',
        body: 'BREAKING CHANGE: state files must be regenerated.',
      })
    );

    assert.equal(entry.breakingChange, true);
    assert.equal(entry.reviewNeeded, true);
    assert.equal(warnings.some((warning) => warning.code === 'breaking-change'), true);
  });

  it('includes non-conventional commit messages and marks them review-needed', () => {
    const { entry, warnings } = classifyCommit(commit({ subject: 'Update release workflow docs' }));

    assert.equal(entry.category, 'Changed');
    assert.equal(entry.text, 'Update release workflow docs');
    assert.equal(entry.source, 'commit-message');
    assert.equal(entry.reviewNeeded, true);
    assert.equal(warnings.some((warning) => warning.code === 'review-needed'), true);
  });
});

describe('buildChangelogProposal', () => {
  it('groups entries by Keep a Changelog category and includes proposal metadata', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'feat: add admin changelog script' }),
        commit({ hash: 'b2', subject: 'fix: handle empty release range' }),
        commit({ hash: 'c3', subject: 'feat: remove old release helper' }),
      ],
      sourceRange: {
        fromRef: 'v0.1.0',
        toRef: 'HEAD',
        usedLatestTag: true,
        missingTag: false,
      },
    });

    assert.equal(proposal.commitCount, 3);
    assert.deepEqual(texts(proposal, 'Added'), ['add admin changelog script']);
    assert.deepEqual(texts(proposal, 'Fixed'), ['handle empty release range']);
    assert.deepEqual(texts(proposal, 'Removed'), ['remove old release helper']);
    assert.equal(proposal.sourceRange.fromRef, 'v0.1.0');
    assert.equal(proposal.sourceRange.toRef, 'HEAD');
  });

  it('preserves input warnings such as missing tag warnings', () => {
    const proposal = buildChangelogProposal({
      commits: [commit({ subject: 'feat: add first release notes' })],
      sourceRange: {
        toRef: 'HEAD',
        usedLatestTag: false,
        missingTag: true,
      },
      warnings: [
        {
          code: 'missing-tag',
          message: 'No previous tag found. Using all reachable commits.',
        },
      ],
    });

    assert.equal(proposal.warnings.some((warning) => warning.code === 'missing-tag'), true);
  });
});

describe('parseSemverVersion', () => {
  it('accepts MAJOR.MINOR.PATCH versions', () => {
    const result = parseSemverVersion('1.2.3');

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.version.version, '1.2.3');
    assert.equal(result.version.major, 1);
    assert.equal(result.version.minor, 2);
    assert.equal(result.version.patch, 3);
  });

  it('accepts an optional leading v and normalizes it away', () => {
    const result = parseSemverVersion('v1.2.3');

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.version.version, '1.2.3');
  });

  it('rejects invalid release versions with a clear message', () => {
    for (const version of ['1', '1.2', 'release-1', '', '1.two.3']) {
      const result = parseSemverVersion(version);

      assert.equal(result.status, 'invalid');
      if (result.status !== 'invalid') {
        continue;
      }

      assert.match(result.message, /SemVer format MAJOR\.MINOR\.PATCH/);
    }
  });
});

function texts(proposal: ReturnType<typeof buildChangelogProposal>, category: ChangelogCategory): string[] {
  return proposal.entriesByCategory[category].map((entry) => entry.text);
}

function commit(input: { hash?: string; subject: string; body?: string }): RawCommit {
  return {
    hash: input.hash ?? 'abc1234',
    subject: input.subject,
    body: input.body ?? '',
  };
}

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('readGitHistory', () => {
  it('reads commits from an explicit fromRef to toRef range', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');
    commitFile(rootPath, 'three.txt', 'three', 'fix: handle empty release range');

    const result = readGitHistory({ fromRef: 'v0.1.0', toRef: 'HEAD' }, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.sourceRange.fromRef, 'v0.1.0');
    assert.equal(result.sourceRange.toRef, 'HEAD');
    assert.equal(result.sourceRange.usedLatestTag, false);
    assert.deepEqual(
      result.commits.map((commit) => commit.subject),
      ['fix: handle empty release range', 'feat: add admin changelog proposal']
    );
  });

  it('uses the latest reachable tag when fromRef is omitted', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');

    const result = readGitHistory({ toRef: 'HEAD' }, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.sourceRange.fromRef, 'v0.1.0');
    assert.equal(result.sourceRange.usedLatestTag, true);
    assert.equal(result.sourceRange.missingTag, false);
    assert.deepEqual(
      result.commits.map((commit) => commit.subject),
      ['feat: add admin changelog proposal']
    );
  });

  it('uses all reachable commits and warns when no tag exists', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first changelog proposal');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle empty release range');

    const result = readGitHistory({}, rootPath);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.equal(result.sourceRange.fromRef, undefined);
    assert.equal(result.sourceRange.usedLatestTag, false);
    assert.equal(result.sourceRange.missingTag, true);
    assert.equal(result.warnings.some((warning) => warning.code === 'missing-tag'), true);
    assert.deepEqual(
      result.commits.map((commit) => commit.subject),
      ['fix: handle empty release range', 'feat: first changelog proposal']
    );
  });

  it('blocks invalid refs with a clear error', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');

    const result = readGitHistory({ fromRef: 'not-a-real-ref' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /Could not resolve git ref `not-a-real-ref`\./);
    assert.equal(result.warnings.some((warning) => warning.code === 'invalid-git-ref'), true);
  });

  it('blocks non-git directories with a clear error', () => {
    const rootPath = createTemporaryRoot();

    const result = readGitHistory({}, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /inside a git repository/);
    assert.equal(result.warnings.some((warning) => warning.code === 'not-git-repository'), true);
  });
});

function createGitRepository(): string {
  const rootPath = createTemporaryRoot();
  runGit(rootPath, ['init']);
  runGit(rootPath, ['config', 'user.name', 'Sibu Test']);
  runGit(rootPath, ['config', 'user.email', 'sibu@example.com']);
  return rootPath;
}

function createTemporaryRoot(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-changelog-test-'));
  temporaryRoots.push(rootPath);
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

describe('handleGenerateChangelogProposal', () => {
  it('returns a categorized proposal from local git history', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');
    commitFile(rootPath, 'three.txt', 'three', 'fix: handle empty release range');

    const result = handleGenerateChangelogProposal({ fromRef: 'v0.1.0', toRef: 'HEAD' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.equal(result.proposal.commitCount, 2);
    assert.deepEqual(texts(result.proposal, 'Added'), ['add admin changelog proposal']);
    assert.deepEqual(texts(result.proposal, 'Fixed'), ['handle empty release range']);
    assert.deepEqual(result.proposal.targetSection, { type: 'unreleased' });
  });

  it('uses valid SemVer input as the target version section', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release range');

    const result = handleGenerateChangelogProposal({ fromRef: 'v0.1.0', version: '1.2.3', date: '2026-04-26' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.deepEqual(result.proposal.targetSection, { type: 'version', version: '1.2.3', date: '2026-04-26' });
  });

  it('normalizes leading v SemVer input in the target version section', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release range');

    const result = handleGenerateChangelogProposal({ fromRef: 'v0.1.0', version: 'v1.2.3', date: '2026-04-26' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.deepEqual(result.proposal.targetSection, { type: 'version', version: '1.2.3', date: '2026-04-26' });
  });

  it('blocks invalid SemVer input before reading git history or writing files', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createTemporaryRoot();
    const beforeFiles = new Set(fs.readdirSync(rootPath));

    const result = handleGenerateChangelogProposal({ version: 'release-1' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /Release version `release-1` must use SemVer format/);
    assert.equal(result.warnings.some((warning) => warning.code === 'invalid-version'), true);
    assert.deepEqual(new Set(fs.readdirSync(rootPath)), beforeFiles);
  });

  it('blocks short SemVer-like inputs before proposal generation', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');

    for (const version of ['1', '1.2']) {
      const result = handleGenerateChangelogProposal({ version }, createTemporaryRoot());

      assert.equal(result.status, 'blocked');
      if (result.status !== 'blocked') {
        continue;
      }

      assert.equal(result.warnings.some((warning) => warning.code === 'invalid-version'), true);
    }
  });

  it('adds maintainer-review warnings for breaking changes', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'feat!: change workflow state format');

    const result = handleGenerateChangelogProposal({ fromRef: 'v0.1.0' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'breaking-change'), true);
    assert.equal(result.proposal.entriesByCategory.Added[0]?.reviewNeeded, true);
  });

  it('keeps non-conventional commits in the proposal as review-needed entries', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'Update release workflow docs');

    const result = handleGenerateChangelogProposal({ fromRef: 'v0.1.0' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.deepEqual(texts(result.proposal, 'Changed'), ['Update release workflow docs']);
    assert.equal(result.proposal.entriesByCategory.Changed[0]?.reviewNeeded, true);
    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'review-needed'), true);
  });

  it('returns a usable proposal with a missing-tag warning when no tags exist', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first changelog proposal');

    const result = handleGenerateChangelogProposal({}, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.deepEqual(texts(result.proposal, 'Added'), ['first changelog proposal']);
    assert.equal(result.proposal.sourceRange.missingTag, true);
    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'missing-tag'), true);
  });

  it('returns a clear blocked result for invalid refs', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    const beforeFiles = new Set(fs.readdirSync(rootPath));

    const result = handleGenerateChangelogProposal({ fromRef: 'not-a-real-ref' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /Could not resolve git ref `not-a-real-ref`\./);
    assert.deepEqual(new Set(fs.readdirSync(rootPath)), beforeFiles);
  });
});
