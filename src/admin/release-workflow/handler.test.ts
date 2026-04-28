import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { parseSemverVersion } from '../generate-changelog/semver.js';
import type { ReleaseMetadataPlan, ReleasePlan } from './command.js';
import { checkReleaseTagAvailable, resolveReleaseRange } from './git-release.js';
import { planMaintainerRelease, previewAndConfirmMaintainerRelease } from './handler.js';
import {
  buildReleaseMetadataPlan,
  deriveSuggestedBumpFromChangelogProposal,
  formatReleaseTagName,
  incrementSemverVersion,
  renderReleasePlanPreview,
} from './release-plan.js';

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

describe('buildReleaseMetadataPlan', () => {
  it('models planned changelog and package metadata updates without writing files', () => {
    const metadata = buildReleaseMetadataPlan({
      changelog: {
        path: 'CHANGELOG.md',
        targetVersion: '1.2.4',
        targetDate: '2026-04-27',
        replacingExistingSection: false,
        nextContent: '# Changelog\n\n## 1.2.4 - 2026-04-27\n',
      },
      packageJson: {
        path: 'package.json',
        currentVersion: '1.2.3',
        targetVersion: '1.2.4',
        nextContent: '{\n  "version": "1.2.4"\n}\n',
      },
    } satisfies ReleaseMetadataPlan);

    const plan: ReleasePlan = {
      range: { fromRef: 'v1.2.3', toRef: 'HEAD' },
      targetVersion: '1.2.4',
      tagName: 'v1.2.4',
      suggestedBump: 'patch',
      commitCount: 1,
      metadata,
      warnings: [],
    };

    assert.equal(plan.metadata?.changelog.path, 'CHANGELOG.md');
    assert.equal(plan.metadata.changelog.replacingExistingSection, false);
    assert.equal(plan.metadata.packageJson.path, 'package.json');
    assert.equal(plan.metadata.packageJson.currentVersion, '1.2.3');
    assert.equal(plan.metadata.packageJson.targetVersion, plan.targetVersion);
  });

  it('models replacement of an existing changelog version section', () => {
    const metadata = buildReleaseMetadataPlan({
      changelog: {
        path: 'CHANGELOG.md',
        targetVersion: '1.2.4',
        targetDate: '2026-04-27',
        replacingExistingSection: true,
        nextContent: '# Changelog\n\n## 1.2.4 - 2026-04-27\n',
      },
      packageJson: {
        path: 'package.json',
        currentVersion: '1.2.3',
        targetVersion: '1.2.4',
        nextContent: '{\n  "version": "1.2.4"\n}\n',
      },
    });

    assert.equal(metadata.changelog.replacingExistingSection, true);
  });
});

describe('deriveSuggestedBumpFromChangelogProposal', () => {
  it('reads the commit-derived SemVer bump from a changelog proposal', () => {
    assert.equal(
      deriveSuggestedBumpFromChangelogProposal({
        sourceRange: { fromRef: 'v1.2.3', toRef: 'HEAD', usedLatestTag: true, missingTag: false },
        targetSection: { type: 'unreleased' },
        semverGuidance: { suggestedBump: 'minor' },
        commitCount: 1,
        entriesByCategory: {
          Added: [],
          Changed: [],
          Deprecated: [],
          Removed: [],
          Fixed: [],
          Security: [],
        },
        warnings: [],
      }),
      'minor'
    );
  });
});

describe('renderReleasePlanPreview', () => {
  it('renders the full planned release workflow for review', () => {
    const preview = renderReleasePlanPreview(buildPreviewPlan());

    assert.match(preview, /Release plan preview/);
    assert.match(preview, /Git range: v1\.2\.3\.\.HEAD/);
    assert.match(preview, /Proposed version: 1\.2\.4/);
    assert.match(preview, /Suggested SemVer bump: patch/);
    assert.match(preview, /Commits inspected: 2/);
    assert.match(preview, /Create CHANGELOG\.md section: 1\.2\.4 - 2026-04-27/);
    assert.match(preview, /Changelog preview:/);
    assert.match(preview, /## 1\.2\.4 - 2026-04-27/);
    assert.match(preview, /- Fix release metadata planning\./);
    assert.match(preview, /Update package\.json version: 1\.2\.3 -> 1\.2\.4/);
    assert.match(preview, /Run validation: pnpm run validate:release/);
    assert.match(preview, /Create release commit: chore\(release\): 1\.2\.4/);
    assert.match(preview, /Create git tag: v1\.2\.4/);
    assert.match(preview, /Publish package: npm publish/);
    assert.match(preview, /Push release commit: git push origin HEAD/);
    assert.match(preview, /Push release tag: git push origin v1\.2\.4/);
    assert.match(preview, /Create GitHub Release: gh release create v1\.2\.4/);
  });

  it('renders release warnings when present', () => {
    const preview = renderReleasePlanPreview({
      ...buildPreviewPlan(),
      warnings: [{ code: 'unsafe-changelog', message: 'Review changelog content.' }],
    });

    assert.match(preview, /Warnings:/);
    assert.match(preview, /\[unsafe-changelog\] Review changelog content\./);
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

describe('planMaintainerRelease', () => {
  it('plans a patch release from fix-only commits', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ date: '2026-04-27' }, rootPath);

    assert.equal(result.status, 'planned');
    if (result.status !== 'planned') {
      return;
    }

    assert.equal(result.plan.targetVersion, '1.2.4');
    assert.equal(result.plan.tagName, 'v1.2.4');
    assert.equal(result.plan.suggestedBump, 'patch');
    assert.equal(result.plan.commitCount, 1);
    assert.deepEqual(result.plan.range, { fromRef: 'v1.2.3', toRef: 'HEAD' });
    assert.equal(result.plan.metadata?.changelog.targetVersion, '1.2.4');
    assert.equal(result.plan.metadata.changelog.targetDate, '2026-04-27');
    assert.equal(result.plan.metadata.changelog.replacingExistingSection, false);
    assert.match(result.plan.metadata.changelog.nextContent, /## 1\.2\.4 - 2026-04-27/);
    assert.equal(result.plan.metadata.packageJson.currentVersion, '1.2.3');
    assert.equal(result.plan.metadata.packageJson.targetVersion, '1.2.4');
  });

  it('plans a minor release from feature commits', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat: add release planning');

    const result = planMaintainerRelease({}, rootPath);

    assert.equal(result.status, 'planned');
    if (result.status !== 'planned') {
      return;
    }

    assert.equal(result.plan.targetVersion, '1.3.0');
    assert.equal(result.plan.suggestedBump, 'minor');
  });

  it('plans a major release from breaking-change commits', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'feat!: change release workflow contract');

    const result = planMaintainerRelease({}, rootPath);

    assert.equal(result.status, 'planned');
    if (result.status !== 'planned') {
      return;
    }

    assert.equal(result.plan.targetVersion, '2.0.0');
    assert.equal(result.plan.suggestedBump, 'major');
    assert.equal(result.plan.warnings.length > 0, true);
  });

  it('accepts and normalizes an explicit valid version override', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ version: 'v1.4.0' }, rootPath);

    assert.equal(result.status, 'planned');
    if (result.status !== 'planned') {
      return;
    }

    assert.equal(result.plan.targetVersion, '1.4.0');
    assert.equal(result.plan.tagName, 'v1.4.0');
  });

  it('blocks invalid explicit version overrides', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ version: 'release-1' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.equal(result.warnings.some((warning) => warning.code === 'invalid-version'), true);
  });

  it('blocks when the computed target tag already exists', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');
    const releaseCommit = runGit(rootPath, ['rev-parse', 'HEAD']).trim();
    tag(rootPath, 'v1.2.4');
    runGit(rootPath, ['tag', '-d', 'v1.2.4']);
    tagRef(rootPath, 'v1.2.4', releaseCommit);

    const result = planMaintainerRelease({ fromRef: 'v1.2.3', version: '1.2.4' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.equal(result.warnings.some((warning) => warning.code === 'existing-target-tag'), true);
  });

  it('plans replacement of an existing changelog target version section', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3', `# Changelog

All notable changes to this project will be documented in this file.

## 1.2.4 - 2026-04-27

### Fixed
- Old entry.

## 1.2.3 - 2026-04-01

### Added
- Baseline.
`);
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ date: '2026-04-27' }, rootPath);

    assert.equal(result.status, 'planned');
    if (result.status !== 'planned') {
      return;
    }

    assert.equal(result.plan.metadata?.changelog.replacingExistingSection, true);
    assert.match(result.plan.metadata.changelog.nextContent, /## 1\.2\.4 - 2026-04-27/);
    assert.doesNotMatch(result.plan.metadata.changelog.nextContent, /Old entry/);
  });

  it('blocks unsafe changelog content before package metadata planning', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, 'not-a-string', 'Unsafe changelog', '123');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ date: '2026-04-27' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /CHANGELOG.md/);
    assert.equal(result.warnings.some((warning) => warning.code === 'unsafe-changelog'), true);
    assert.equal(result.warnings.some((warning) => warning.code === 'malformed-package-json'), false);
  });

  it('blocks malformed package metadata with a clear message', () => {
    const rootPath = createGitRepository();
    commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
    commitReleaseMetadata(rootPath, '1.2.3', undefined, '{\n  "version": 123\n}\n');
    tag(rootPath, 'v1.2.3');
    commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');

    const result = planMaintainerRelease({ date: '2026-04-27' }, rootPath);

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.match(result.message, /string version field/);
    assert.equal(result.warnings.some((warning) => warning.code === 'malformed-package-json'), true);
  });
});


describe('previewAndConfirmMaintainerRelease', () => {
  it('prints the preview and returns dry-run without prompting', async () => {
    const rootPath = createPlannedReleaseRepository();
    const ports = createFakeWorkflowPorts({ confirmResult: true });

    const result = await previewAndConfirmMaintainerRelease({ date: '2026-04-27', dryRun: true }, ports, rootPath);

    assert.equal(result.status, 'dry-run');
    assert.equal(ports.printed.length, 1);
    assert.match(ports.printed[0] ?? '', /Release plan preview/);
    assert.match(ports.printed[0] ?? '', /Proposed version: 1\.2\.4/);
    assert.equal(ports.confirmCalls, 0);
  });

  it('prints the preview and returns declined without side effects when confirmation is rejected', async () => {
    const rootPath = createPlannedReleaseRepository();
    const ports = createFakeWorkflowPorts({ confirmResult: false });

    const result = await previewAndConfirmMaintainerRelease({ date: '2026-04-27' }, ports, rootPath);

    assert.equal(result.status, 'declined');
    assert.equal(ports.printed.length, 1);
    assert.match(ports.printed[0] ?? '', /Release plan preview/);
    assert.equal(ports.confirmCalls, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8').includes('"version": "1.2.3"'), true);
  });

  it('prints the preview before returning confirmed when yes is assumed', async () => {
    const rootPath = createPlannedReleaseRepository();
    const ports = createFakeWorkflowPorts({ confirmResult: false });

    const result = await previewAndConfirmMaintainerRelease({ date: '2026-04-27', assumeYes: true }, ports, rootPath);

    assert.equal(result.status, 'confirmed');
    assert.equal(ports.printed.length, 1);
    assert.match(ports.printed[0] ?? '', /Release plan preview/);
    assert.equal(ports.confirmCalls, 0);
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

function createPlannedReleaseRepository(): string {
  const rootPath = createGitRepository();
  commitFile(rootPath, 'one.txt', 'one', 'feat: first release baseline');
  commitReleaseMetadata(rootPath, '1.2.3');
  tag(rootPath, 'v1.2.3');
  commitFile(rootPath, 'two.txt', 'two', 'fix: handle release planning');
  return rootPath;
}

type FakeWorkflowPorts = {
  printed: string[];
  confirmCalls: number;
  print(message: string): void;
  confirmRelease(): boolean;
};

function createFakeWorkflowPorts(input: { confirmResult: boolean }): FakeWorkflowPorts {
  return {
    printed: [],
    confirmCalls: 0,
    print(message: string) {
      this.printed.push(message);
    },
    confirmRelease() {
      this.confirmCalls += 1;
      return input.confirmResult;
    },
  };
}

function commitFile(rootPath: string, fileName: string, contents: string, subject: string): void {
  fs.writeFileSync(path.join(rootPath, fileName), contents, 'utf8');
  runGit(rootPath, ['add', fileName]);
  runGit(rootPath, ['commit', '-m', subject]);
}

function commitReleaseMetadata(rootPath: string, version: string, changelogContent = buildChangelogContent(version), packageJsonContent?: string): void {
  fs.writeFileSync(path.join(rootPath, 'CHANGELOG.md'), changelogContent, 'utf8');
  fs.writeFileSync(path.join(rootPath, 'package.json'), packageJsonContent ?? `{\n  "name": "sibu",\n  "version": "${version}"\n}\n`, 'utf8');
  runGit(rootPath, ['add', 'CHANGELOG.md', 'package.json']);
  runGit(rootPath, ['commit', '-m', `chore: prepare ${version} metadata`]);
}

function buildChangelogContent(version: string): string {
  return `# Changelog

All notable changes to this project will be documented in this file.

## ${version} - 2026-04-01

### Added
- Baseline.
`;
}

function buildPreviewPlan(): ReleasePlan {
  return {
    range: { fromRef: 'v1.2.3', toRef: 'HEAD' },
    targetVersion: '1.2.4',
    tagName: 'v1.2.4',
    suggestedBump: 'patch',
    commitCount: 2,
    metadata: {
      changelog: {
        path: 'CHANGELOG.md',
        targetVersion: '1.2.4',
        targetDate: '2026-04-27',
        replacingExistingSection: false,
        nextContent: `# Changelog

All notable changes to this project will be documented in this file.

## 1.2.4 - 2026-04-27

### Fixed
- Fix release metadata planning.

## 1.2.3 - 2026-04-01

### Added
- Baseline.
`,
      },
      packageJson: {
        path: 'package.json',
        currentVersion: '1.2.3',
        targetVersion: '1.2.4',
        nextContent: '{\n  "version": "1.2.4"\n}\n',
      },
    },
    warnings: [],
  };
}

function tag(rootPath: string, tagName: string): void {
  runGit(rootPath, ['tag', tagName]);
}

function tagRef(rootPath: string, tagName: string, ref: string): void {
  runGit(rootPath, ['tag', tagName, ref]);
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
