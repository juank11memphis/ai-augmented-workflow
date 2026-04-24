import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildChangelogProposal, classifyCommit } from './changelog-format.js';
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
