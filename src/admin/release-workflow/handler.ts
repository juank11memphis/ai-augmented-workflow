import fs from 'node:fs';
import path from 'node:path';

import { buildChangelogProposal, retargetChangelogProposal } from '../generate-changelog/changelog-format.js';
import { planChangelogUpdate } from '../generate-changelog/changelog-writer.js';
import { readGitHistory } from '../generate-changelog/git-history.js';
import { parseSemverVersion } from '../generate-changelog/semver.js';
import type { ReleasePlanningResult, ReleaseWarning, ReleaseWorkflowCommand } from './command.js';
import { checkReleaseTagAvailable, resolveReleaseRange } from './git-release.js';
import { planPackageJsonVersionUpdate } from './package-json.js';
import { buildReleaseMetadataPlan, deriveSuggestedBumpFromChangelogProposal, formatReleaseTagName, incrementSemverVersion } from './release-plan.js';

export function planMaintainerRelease(command: ReleaseWorkflowCommand, cwd = process.cwd()): ReleasePlanningResult {
  const releaseRange = resolveReleaseRange(command, cwd);
  if (releaseRange.status === 'blocked') {
    return releaseRange;
  }

  const gitHistory = readGitHistory(
    {
      fromRef: releaseRange.range.fromRef,
      toRef: releaseRange.range.toRef,
    },
    cwd
  );

  if (gitHistory.status === 'blocked') {
    return {
      status: 'blocked',
      message: gitHistory.message,
      warnings: gitHistory.warnings.map((warning) => ({ code: warning.code as ReleaseWarning['code'], message: warning.message })),
    };
  }

  const commitDerivedChangelogProposal = buildChangelogProposal({
    commits: gitHistory.commits,
    sourceRange: gitHistory.sourceRange,
    warnings: gitHistory.warnings,
  });
  const suggestedBump = deriveSuggestedBumpFromChangelogProposal(commitDerivedChangelogProposal);
  const targetVersion = resolveTargetVersion({ fromRef: releaseRange.range.fromRef, requestedVersion: command.version, suggestedBump });

  if (targetVersion.status === 'blocked') {
    return targetVersion;
  }

  const targetDate = command.date ?? new Date().toISOString().slice(0, 10);
  const changelogProposal = retargetChangelogProposal(commitDerivedChangelogProposal, {
    type: 'version',
    version: targetVersion.version,
    date: targetDate,
  });

  const tagName = formatReleaseTagName(targetVersion.version);
  const tagAvailability = checkReleaseTagAvailable(tagName, cwd);
  if (tagAvailability.status === 'blocked') {
    return tagAvailability;
  }

  const changelogUpdatePlan = planChangelogUpdate(readFileIfExists(path.join(cwd, 'CHANGELOG.md')), changelogProposal);
  if (changelogUpdatePlan.status === 'blocked') {
    return {
      status: 'blocked',
      message: changelogUpdatePlan.message,
      warnings: changelogUpdatePlan.warnings.map((warning) => ({ code: warning.code as ReleaseWarning['code'], message: warning.message })),
    };
  }

  const packageJsonUpdatePlan = planPackageJsonVersionUpdate(readFileIfExists(path.join(cwd, 'package.json')), targetVersion.version);
  if (packageJsonUpdatePlan.status === 'blocked') {
    return packageJsonUpdatePlan;
  }

  return {
    status: 'planned',
    plan: {
      range: releaseRange.range,
      targetVersion: targetVersion.version,
      tagName,
      suggestedBump,
      commitCount: gitHistory.commits.length,
      metadata: buildReleaseMetadataPlan({
        changelog: {
          path: 'CHANGELOG.md',
          targetVersion: targetVersion.version,
          targetDate,
          replacingExistingSection: changelogUpdatePlan.replacingExistingSection,
          nextContent: changelogUpdatePlan.content,
        },
        packageJson: packageJsonUpdatePlan.plan,
      }),
      warnings: changelogProposal.warnings.map((warning) => ({ code: warning.code as ReleaseWarning['code'], message: warning.message })),
    },
  };
}

type ResolveTargetVersionResult =
  | {
      status: 'ok';
      version: string;
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ReleaseWarning[];
    };

function resolveTargetVersion(input: { fromRef: string; requestedVersion?: string; suggestedBump: 'major' | 'minor' | 'patch' }): ResolveTargetVersionResult {
  if (input.requestedVersion) {
    const requestedVersion = parseSemverVersion(input.requestedVersion);

    if (requestedVersion.status === 'invalid') {
      return blockedTargetVersion('invalid-version', requestedVersion.message);
    }

    return { status: 'ok', version: requestedVersion.version.version };
  }

  const previousVersion = parseSemverVersion(input.fromRef);
  if (previousVersion.status === 'invalid') {
    return blockedTargetVersion('invalid-version', `Release baseline \`${input.fromRef}\` must be SemVer-like when --version is omitted.`);
  }

  return {
    status: 'ok',
    version: incrementSemverVersion(previousVersion.version, input.suggestedBump).version,
  };
}

function blocked(code: ReleaseWarning['code'], message: string): ReleasePlanningResult {
  return {
    status: 'blocked',
    message,
    warnings: [{ code, message }],
  };
}

function blockedTargetVersion(code: ReleaseWarning['code'], message: string): ResolveTargetVersionResult {
  return {
    status: 'blocked',
    message,
    warnings: [{ code, message }],
  };
}

function readFileIfExists(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return fs.readFileSync(filePath, 'utf8');
}
