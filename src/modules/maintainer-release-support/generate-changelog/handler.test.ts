import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { parseChangelogArgs } from '../../../admin/changelog.js';
import {
  buildChangelogProposal,
  classifyCommit,
  renderChangelogPreview,
  renderChangelogSection,
  suggestSemverBump,
} from './changelog-format.js';
import { readGitHistory } from './git-history.js';
import { planChangelogUpdate } from './changelog-writer.js';
import { parseSemverVersion } from './semver.js';
import type { ChangelogCategory, GenerateChangelogWritePorts, RawCommit } from './command.js';

describe('parseChangelogArgs', () => {
  it('parses supported maintainer script flags into a changelog command', () => {
    const result = parseChangelogArgs([
      '--',
      '--from',
      'v0.1.0',
      '--to',
      'HEAD',
      '--version',
      'v0.2.0',
      '--date',
      '2026-04-26',
      '--yes',
    ]);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.deepEqual(result.command, {
      fromRef: 'v0.1.0',
      toRef: 'HEAD',
      version: 'v0.2.0',
      date: '2026-04-26',
      assumeYes: true,
    });
  });

  it('rejects unknown maintainer script flags with a clear error', () => {
    const result = parseChangelogArgs(['--publish']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /Unknown option `--publish`/);
  });

  it('rejects missing maintainer script flag values with a clear error', () => {
    const result = parseChangelogArgs(['--version']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /Option `--version` requires a value/);
  });
});

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
    assert.equal(proposal.semverGuidance.suggestedBump, 'minor');
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

describe('suggestSemverBump', () => {
  it('suggests major when any entry is a breaking change', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'fix: keep workflow stable' }),
        commit({ hash: 'b2', subject: 'feat!: change managed file state format' }),
      ],
      sourceRange: sourceRange(),
    });

    assert.equal(suggestSemverBump(proposal.entriesByCategory), 'major');
    assert.equal(proposal.semverGuidance.suggestedBump, 'major');
  });

  it('suggests minor when feature commits are present without breaking changes', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'fix: handle empty release range' }),
        commit({ hash: 'b2', subject: 'feat: add admin changelog proposal' }),
      ],
      sourceRange: sourceRange(),
    });

    assert.equal(suggestSemverBump(proposal.entriesByCategory), 'minor');
    assert.equal(proposal.semverGuidance.suggestedBump, 'minor');
  });

  it('suggests patch for fix-only or lower-impact changes', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'fix: handle empty release range' }),
        commit({ hash: 'b2', subject: 'docs: update release notes guidance' }),
      ],
      sourceRange: sourceRange(),
    });

    assert.equal(suggestSemverBump(proposal.entriesByCategory), 'patch');
    assert.equal(proposal.semverGuidance.suggestedBump, 'patch');
  });

  it('does not let non-conventional entries hide feature guidance', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'Update release workflow docs' }),
        commit({ hash: 'b2', subject: 'feat: add admin changelog proposal' }),
      ],
      sourceRange: sourceRange(),
    });

    assert.equal(proposal.semverGuidance.suggestedBump, 'minor');
  });
});

describe('renderChangelogSection', () => {
  it('renders an Unreleased Keep a Changelog-style section', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'feat: add admin changelog proposal' }),
        commit({ hash: 'b2', subject: 'fix: handle empty release range' }),
      ],
      sourceRange: sourceRange(),
      targetSection: { type: 'unreleased' },
    });

    const markdown = renderChangelogSection(proposal);

    assert.match(markdown, /^## Unreleased/);
    assert.match(markdown, /### Added\n- add admin changelog proposal/);
    assert.match(markdown, /### Fixed\n- handle empty release range/);
  });

  it('renders a versioned section with normalized SemVer and ISO date', () => {
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'feat: add admin changelog proposal' })],
      sourceRange: sourceRange(),
      targetSection: { type: 'version', version: '1.2.3', date: '2026-04-26' },
    });

    const markdown = renderChangelogSection(proposal);

    assert.match(markdown, /^## 1\.2\.3 - 2026-04-26/);
  });

  it('omits empty categories from generated Markdown', () => {
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'fix: handle empty release range' })],
      sourceRange: sourceRange(),
    });

    const markdown = renderChangelogSection(proposal);

    assert.doesNotMatch(markdown, /### Added/);
    assert.match(markdown, /### Fixed\n- handle empty release range/);
  });
});

describe('renderChangelogPreview', () => {
  it('renders source metadata, target details, entries, SemVer guidance, and warnings', () => {
    const proposal = buildChangelogProposal({
      commits: [
        commit({ hash: 'a1', subject: 'feat: add admin changelog proposal' }),
        commit({ hash: 'b2', subject: 'Update release workflow docs' }),
      ],
      sourceRange: sourceRange(),
      targetSection: { type: 'version', version: '1.2.3', date: '2026-04-26' },
      warnings: [
        {
          code: 'missing-tag',
          message: 'No previous tag found. Using all reachable commits.',
        },
      ],
    });

    const preview = renderChangelogPreview(proposal, 'CHANGELOG.md');

    assert.match(preview, /Git range: v0\.1\.0\.\.HEAD/);
    assert.match(preview, /Commits inspected: 2/);
    assert.match(preview, /Target path: CHANGELOG\.md/);
    assert.match(preview, /Target section: 1\.2\.3 - 2026-04-26/);
    assert.match(preview, /Suggested SemVer bump: minor/);
    assert.match(preview, /### Added\n- add admin changelog proposal/);
    assert.match(preview, /### Changed\n- Update release workflow docs/);
    assert.match(preview, /Warnings:/);
    assert.match(preview, /\[missing-tag\] No previous tag found/);
    assert.match(preview, /\[review-needed\] Commit message is not a Conventional Commit/);
  });
});

describe('planChangelogUpdate', () => {
  it('creates a standard changelog when content is missing', () => {
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'feat: add admin changelog proposal' })],
      sourceRange: sourceRange(),
    });

    const result = planChangelogUpdate(undefined, proposal);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.match(result.content, /^# Changelog/);
    assert.match(result.content, /Keep a Changelog/);
    assert.match(result.content, /## Unreleased/);
    assert.match(result.content, /### Added\n- add admin changelog proposal/);
    assert.equal(result.replacingExistingSection, false);
  });

  it('updates an existing Unreleased section without losing older releases', () => {
    const existingContent = `# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- Old pending note.

## 0.1.0 - 2026-04-01

### Added
- Initial release.
`;
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'fix: handle empty release range' })],
      sourceRange: sourceRange(),
      targetSection: { type: 'unreleased' },
    });

    const result = planChangelogUpdate(existingContent, proposal);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.match(result.content, /## Unreleased\n\n### Fixed\n- handle empty release range/);
    assert.doesNotMatch(result.content, /Old pending note/);
    assert.match(result.content, /## 0\.1\.0 - 2026-04-01\n\n### Added\n- Initial release\./);
    assert.equal(result.replacingExistingSection, true);
  });

  it('adds a dated versioned section near the top with a normalized version heading', () => {
    const existingContent = `# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- Pending note.

## 0.1.0 - 2026-04-01

### Added
- Initial release.
`;
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'feat: add admin changelog proposal' })],
      sourceRange: sourceRange(),
      targetSection: { type: 'version', version: '1.2.3', date: '2026-04-26' },
    });

    const result = planChangelogUpdate(existingContent, proposal);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.match(result.content, /## 1\.2\.3 - 2026-04-26\n\n### Added\n- add admin changelog proposal/);
    assert.match(result.content, /## Unreleased\n\n### Changed\n- Pending note\./);
    assert.match(result.content, /## 0\.1\.0 - 2026-04-01\n\n### Added\n- Initial release\./);
    assert.ok(result.content.indexOf('## 1.2.3 - 2026-04-26') < result.content.indexOf('## Unreleased'));
  });

  it('preserves content outside the target section', () => {
    const existingContent = `# Changelog

Custom introduction.

## Unreleased

### Changed
- Old pending note.

## 0.1.0 - 2026-04-01

### Added
- Initial release.
`;
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'fix: handle empty release range' })],
      sourceRange: sourceRange(),
      targetSection: { type: 'unreleased' },
    });

    const result = planChangelogUpdate(existingContent, proposal);

    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') {
      return;
    }

    assert.match(result.content, /Custom introduction\./);
    assert.match(result.content, /## 0\.1\.0 - 2026-04-01/);
  });

  it('blocks unsafe changelog content with a clear warning', () => {
    const proposal = buildChangelogProposal({
      commits: [commit({ hash: 'a1', subject: 'fix: handle empty release range' })],
      sourceRange: sourceRange(),
    });

    const result = planChangelogUpdate('Release notes without a changelog heading.', proposal);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /does not start with a # Changelog heading/);
    assert.equal(result.warnings.some((warning) => warning.code === 'unsafe-changelog'), true);
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

function sourceRange(): ReturnType<typeof buildChangelogProposal>['sourceRange'] {
  return {
    fromRef: 'v0.1.0',
    toRef: 'HEAD',
    usedLatestTag: true,
    missingTag: false,
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

  it('warns without blocking when breaking changes suggest a major bump but the chosen version is non-major', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat!: change managed file state format');

    const result = handleGenerateChangelogProposal({ fromRef: 'v1.2.3', version: '1.3.0', date: '2026-04-26' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.equal(result.proposal.semverGuidance.suggestedBump, 'major');
    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'semver-bump-mismatch'), true);
  });

  it('warns without blocking when feature changes suggest a minor bump but the chosen version is patch', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');

    const result = handleGenerateChangelogProposal({ fromRef: 'v1.2.3', version: '1.2.4', date: '2026-04-26' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.equal(result.proposal.semverGuidance.suggestedBump, 'minor');
    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'semver-bump-mismatch'), true);
  });

  it('does not warn when the chosen bump matches commit-derived guidance', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');

    const result = handleGenerateChangelogProposal({ fromRef: 'v1.2.3', version: '1.3.0', date: '2026-04-26' }, rootPath);

    assert.equal(result.status, 'proposed');
    if (result.status !== 'proposed') {
      return;
    }

    assert.equal(result.proposal.semverGuidance.suggestedBump, 'minor');
    assert.equal(result.proposal.warnings.some((warning) => warning.code === 'semver-bump-mismatch'), false);
  });

  it('does not warn when the previous ref is missing or not SemVer', async () => {
    const { handleGenerateChangelogProposal } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'release-baseline');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');

    const nonSemverRefResult = handleGenerateChangelogProposal(
      { fromRef: 'release-baseline', version: '1.2.4', date: '2026-04-26' },
      rootPath
    );
    const missingRefResult = handleGenerateChangelogProposal({ version: '1.2.4', date: '2026-04-26' }, rootPath);

    for (const result of [nonSemverRefResult, missingRefResult]) {
      assert.equal(result.status, 'proposed');
      if (result.status !== 'proposed') {
        continue;
      }

      assert.equal(result.proposal.warnings.some((warning) => warning.code === 'semver-bump-mismatch'), false);
      assert.deepEqual(result.proposal.targetSection, { type: 'version', version: '1.2.4', date: '2026-04-26' });
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

describe('handleGenerateChangelogWrite', () => {
  it('leaves CHANGELOG.md absent when confirmation is declined', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first changelog proposal');
    const ports = createWritePorts({ confirmed: false });

    const result = await handleGenerateChangelogWrite({}, ports, rootPath);

    assert.equal(result.status, 'declined');
    assert.equal(ports.writes.length, 0);
    assert.equal(ports.previews.length, 1);
    assert.match(ports.previews[0] ?? '', /Changelog preview/);
  });

  it('shows preview and writes when assumeYes is true', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first changelog proposal');
    const ports = createWritePorts({ confirmed: false });

    const result = await handleGenerateChangelogWrite({ assumeYes: true }, ports, rootPath);

    assert.equal(result.status, 'written');
    assert.equal(ports.confirmCalls, 0);
    assert.equal(ports.previews.length, 1);
    assert.ok(ports.writes[0]?.path.endsWith('CHANGELOG.md'));
    assert.match(ports.writes[0]?.content ?? '', /# Changelog/);
    assert.match(ports.writes[0]?.content ?? '', /## Unreleased/);
  });

  it('creates a new CHANGELOG.md from git history when the file is missing', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: add admin changelog proposal');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle empty release range');
    const ports = createWritePorts({ confirmed: true });

    const result = await handleGenerateChangelogWrite({}, ports, rootPath);

    assert.equal(result.status, 'written');
    assert.match(ports.writes[0]?.content ?? '', /^# Changelog/);
    assert.match(ports.writes[0]?.content ?? '', /## Unreleased/);
    assert.match(ports.writes[0]?.content ?? '', /### Added\n- add admin changelog proposal/);
    assert.match(ports.writes[0]?.content ?? '', /### Fixed\n- handle empty release range/);
  });

  it('updates Unreleased through the write workflow without losing older releases', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v0.1.0');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle empty release range');
    const ports = createWritePorts({
      confirmed: true,
      existingContent: `# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- Old pending note.

## 0.1.0 - 2026-04-01

### Added
- Initial release.
`,
    });

    const result = await handleGenerateChangelogWrite({ fromRef: 'v0.1.0' }, ports, rootPath);

    assert.equal(result.status, 'written');
    assert.match(ports.writes[0]?.content ?? '', /## Unreleased\n\n### Fixed\n- handle empty release range/);
    assert.doesNotMatch(ports.writes[0]?.content ?? '', /Old pending note/);
    assert.match(ports.writes[0]?.content ?? '', /## 0\.1\.0 - 2026-04-01\n\n### Added\n- Initial release\./);
  });

  it('adds a dated versioned section with normalized SemVer through the write workflow', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add admin changelog proposal');
    const ports = createWritePorts({
      confirmed: true,
      existingContent: `# Changelog

Custom introduction.

## Unreleased

### Changed
- Pending note.

## 1.2.3 - 2026-04-01

### Added
- Previous release.
`,
    });

    const result = await handleGenerateChangelogWrite({ fromRef: 'v1.2.3', version: 'v1.3.0', date: '2026-04-26' }, ports, rootPath);

    assert.equal(result.status, 'written');
    const writtenContent = ports.writes[0]?.content ?? '';
    assert.match(writtenContent, /Custom introduction\./);
    assert.match(writtenContent, /## 1\.3\.0 - 2026-04-26\n\n### Added\n- add admin changelog proposal/);
    assert.doesNotMatch(writtenContent, /## v1\.3\.0/);
    assert.match(writtenContent, /## Unreleased\n\n### Changed\n- Pending note\./);
    assert.match(writtenContent, /## 1\.2\.3 - 2026-04-01\n\n### Added\n- Previous release\./);
  });

  it('writes the planned changelog content after confirmation', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release range');
    const ports = createWritePorts({ confirmed: true });

    const result = await handleGenerateChangelogWrite({ fromRef: 'v1.2.3', version: '1.2.4', date: '2026-04-26' }, ports, rootPath);

    assert.equal(result.status, 'written');
    assert.equal(ports.confirmCalls, 1);
    assert.match(ports.previews[0] ?? '', /Target section: 1\.2\.4 - 2026-04-26/);
    assert.match(ports.writes[0]?.content ?? '', /## 1\.2\.4 - 2026-04-26/);
    assert.match(ports.writes[0]?.content ?? '', /### Fixed\n- handle release range/);
  });

  it('does not write for invalid git input, invalid version input, or invalid date input', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');

    for (const command of [
      { fromRef: 'not-a-real-ref' },
      { version: 'release-1' },
      { version: '1.2.3', date: '04-26-2026' },
    ]) {
      const ports = createWritePorts({ confirmed: true });
      const result = await handleGenerateChangelogWrite(command, ports, rootPath);

      assert.equal(result.status, 'blocked');
      assert.equal(ports.writes.length, 0);
    }
  });

  it('does not write when changelog parsing is unsafe', async () => {
    const { handleGenerateChangelogWrite } = await import('./handler.js');
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first changelog proposal');
    const ports = createWritePorts({
      confirmed: true,
      existingContent: 'Release notes without a changelog heading.',
    });

    const result = await handleGenerateChangelogWrite({ assumeYes: true }, ports, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.preview ?? '', /Changelog preview/);
    assert.equal(result.warnings.some((warning) => warning.code === 'unsafe-changelog'), true);
    assert.equal(ports.writes.length, 0);
  });
});

function createWritePorts(input: { confirmed: boolean; existingContent?: string }): GenerateChangelogWritePorts & {
  writes: Array<{ path: string; content: string }>;
  previews: string[];
  confirmCalls: number;
} {
  const writes: Array<{ path: string; content: string }> = [];
  const previews: string[] = [];

  return {
    writes,
    previews,
    confirmCalls: 0,
    readFile() {
      return input.existingContent;
    },
    writeFile(path, content) {
      writes.push({ path, content });
    },
    confirmWrite() {
      this.confirmCalls += 1;
      return input.confirmed;
    },
    showPreview(preview) {
      previews.push(preview);
    },
  };
}
