import fs from 'node:fs';
import path from 'node:path';

import { buildChangelogProposal, retargetChangelogProposal } from '../generate-changelog/changelog-format.js';
import { planChangelogUpdate } from '../generate-changelog/changelog-writer.js';
import { readGitHistory } from '../generate-changelog/git-history.js';
import { parseSemverVersion } from '../generate-changelog/semver.js';
import type {
  ReleaseCommandResult,
  ReleaseCompletedStep,
  ReleaseExecutionPorts,
  ReleaseExecutionResult,
  ReleaseExecutionStepName,
  ReleasePlan,
  ReleasePlanningResult,
  ReleaseWarning,
  ReleaseWorkflowCommand,
  ReleaseWorkflowPorts,
  ReleaseWorkflowResult,
} from './command.js';
import { checkReleaseTagAvailable, resolveReleaseRange } from './git-release.js';
import { planPackageJsonVersionUpdate } from './package-json.js';
import {
  buildReleaseMetadataPlan,
  deriveSuggestedBumpFromChangelogProposal,
  formatReleaseTagName,
  incrementSemverVersion,
  renderReleasePlanPreview,
  extractReleaseChangelogSection,
} from './release-plan.js';

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

export async function previewAndConfirmMaintainerRelease(
  command: ReleaseWorkflowCommand,
  ports: ReleaseWorkflowPorts,
  cwd = process.cwd()
): Promise<ReleaseWorkflowResult> {
  const planningResult = planMaintainerRelease(command, cwd);
  if (planningResult.status === 'blocked') {
    return planningResult;
  }

  const preview = renderReleasePlanPreview(planningResult.plan);
  ports.print(preview);

  if (command.dryRun) {
    return {
      status: 'dry-run',
      plan: planningResult.plan,
      preview,
    };
  }

  if (!command.assumeYes) {
    const confirmed = await ports.confirmRelease(planningResult.plan);

    if (!confirmed) {
      return {
        status: 'declined',
        plan: planningResult.plan,
        preview,
      };
    }
  }

  return {
    status: 'confirmed',
    plan: planningResult.plan,
    preview,
  };
}

export async function executeConfirmedRelease(plan: ReleasePlan, ports: ReleaseExecutionPorts): Promise<ReleaseExecutionResult> {
  const completedSteps: ReleaseCompletedStep[] = [];

  if (!plan.metadata) {
    return failExecution(completedSteps, 'write-changelog', 'Release plan does not include metadata updates.');
  }

  ports.writeFile(plan.metadata.changelog.path, plan.metadata.changelog.nextContent);
  completedSteps.push({ name: 'write-changelog', message: `Wrote ${plan.metadata.changelog.path}.` });

  ports.writeFile(plan.metadata.packageJson.path, plan.metadata.packageJson.nextContent);
  completedSteps.push({ name: 'write-package-json', message: `Wrote ${plan.metadata.packageJson.path}.` });

  const validation = await ports.run('pnpm', ['run', 'validate:release']);
  if (validation.exitCode !== 0) {
    return failExecution(completedSteps, 'validate-release', 'Release validation failed.', validation);
  }
  completedSteps.push({ name: 'validate-release', message: 'Release validation passed.' });

  const gitAdd = await ports.run('git', ['add', 'CHANGELOG.md', 'package.json']);
  if (gitAdd.exitCode !== 0) {
    return failExecution(completedSteps, 'create-release-commit', 'Staging release metadata failed.', gitAdd);
  }

  const releaseCommitMessage = `chore(release): ${plan.targetVersion}`;
  const gitCommit = await ports.run('git', ['commit', '-m', releaseCommitMessage]);
  if (gitCommit.exitCode !== 0) {
    return failExecution(completedSteps, 'create-release-commit', 'Creating the release commit failed.', gitCommit);
  }
  completedSteps.push({ name: 'create-release-commit', message: `Created release commit: ${releaseCommitMessage}.` });

  const gitTag = await ports.run('git', ['tag', plan.tagName]);
  if (gitTag.exitCode !== 0) {
    return failExecution(completedSteps, 'create-release-tag', `Creating release tag ${plan.tagName} failed.`, gitTag);
  }
  completedSteps.push({ name: 'create-release-tag', message: `Created release tag: ${plan.tagName}.` });

  const npmPublish = await ports.run('npm', ['publish']);
  if (npmPublish.exitCode !== 0) {
    return failExecution(completedSteps, 'publish-npm', 'Publishing to npm failed.', npmPublish);
  }
  completedSteps.push({ name: 'publish-npm', message: 'Published package to npm.' });

  const pushCommit = await ports.run('git', ['push', 'origin', 'HEAD']);
  if (pushCommit.exitCode !== 0) {
    return failExecution(completedSteps, 'push-commit', 'Pushing the release commit failed.', pushCommit);
  }
  completedSteps.push({ name: 'push-commit', message: 'Pushed release commit to origin.' });

  const pushTag = await ports.run('git', ['push', 'origin', plan.tagName]);
  if (pushTag.exitCode !== 0) {
    return failExecution(completedSteps, 'push-tag', `Pushing release tag ${plan.tagName} failed.`, pushTag);
  }
  completedSteps.push({ name: 'push-tag', message: `Pushed release tag ${plan.tagName} to origin.` });

  const releaseBody = extractReleaseBody(plan);
  const githubRelease = await ports.run('gh', ['release', 'create', plan.tagName, '--title', plan.tagName, '--notes', releaseBody]);
  if (githubRelease.exitCode !== 0) {
    return failExecution(completedSteps, 'create-github-release', 'Creating the GitHub Release failed.', githubRelease);
  }
  completedSteps.push({ name: 'create-github-release', message: `Created GitHub Release ${plan.tagName}.` });

  return {
    status: 'executed',
    completedSteps,
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

function failExecution(
  completedSteps: ReleaseCompletedStep[],
  name: ReleaseExecutionStepName,
  message: string,
  commandResult?: ReleaseCommandResult
): ReleaseExecutionResult {
  const stderr = commandResult?.stderr?.trim();
  const commandContext = stderr ? ` ${stderr}` : '';

  return {
    status: 'failed',
    completedSteps,
    failedStep: {
      name,
      message: `${message}${commandContext}`,
      recoveryGuidance: buildRecoveryGuidance(name),
    },
  };
}

function buildRecoveryGuidance(name: ReleaseExecutionStepName): string {
  switch (name) {
    case 'validate-release':
      return 'Fix validation failures, restore or review local release metadata changes, then rerun the release workflow.';
    case 'create-release-commit':
      return 'Review local release metadata changes, resolve git commit issues, then rerun or complete the release manually.';
    case 'create-release-tag':
      return 'Review the release commit and tag state, then create the tag manually or rerun after cleanup.';
    case 'publish-npm':
      return 'Review npm authentication/package state. If the package was not published, rerun after fixing npm publish.';
    case 'write-changelog':
    case 'write-package-json':
      return 'Review local file permissions and release metadata, then rerun the release workflow.';
    case 'push-commit':
      return 'npm publish may have completed. Push the release commit manually after resolving git remote issues.';
    case 'push-tag':
      return 'npm publish and the release commit push may have completed. Push the release tag manually after resolving git remote issues.';
    case 'create-github-release':
      return 'npm publish and git push may have completed. Create the GitHub Release manually with the finalized CHANGELOG.md section.';
  }
}

function extractReleaseBody(plan: ReleasePlan): string {
  if (!plan.metadata) {
    return `Release ${plan.targetVersion}`;
  }

  return extractReleaseChangelogSection(plan.metadata.changelog.nextContent, plan.targetVersion) ?? `Release ${plan.targetVersion}`;
}
