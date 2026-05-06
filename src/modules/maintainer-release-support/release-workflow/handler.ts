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

type FailedReleaseExecutionResult = Extract<ReleaseExecutionResult, { status: 'failed' }>;

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
  const existingChangelogSection = extractReleaseChangelogSection(readFileIfExists(path.join(cwd, 'CHANGELOG.md')) ?? '', targetVersion.version);
  const metadataAlreadyPrepared =
    packageJsonUpdatePlan.plan.currentVersion === targetVersion.version && existingChangelogSection !== undefined && tagAvailability.existingTagAtHead;

  return {
    status: 'planned',
    plan: {
      range: releaseRange.range,
      targetVersion: targetVersion.version,
      tagName,
      suggestedBump,
      commitCount: gitHistory.commits.length,
      otp: command.otp,
      hasOtp: command.otp !== undefined,
      metadataAlreadyPrepared,
      existingTagAtHead: tagAvailability.existingTagAtHead,
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
  ports.print('Starting maintainer release planning...\n');
  const planningResult = planMaintainerRelease(command, cwd);
  if (planningResult.status === 'blocked') {
    ports.print(`Release planning blocked: ${planningResult.message}\n`);
    printWarnings(planningResult.warnings, ports);
    return planningResult;
  }

  ports.print(
    `Release plan ready for ${planningResult.plan.targetVersion} from ${planningResult.plan.range.fromRef} to ${planningResult.plan.range.toRef}.\n\n`
  );
  const preview = renderReleasePlanPreview(planningResult.plan);
  ports.print(preview);

  if (command.dryRun) {
    ports.print('Dry run requested; no files, commands, tags, publishes, pushes, or GitHub Releases will be created.\n');
    return {
      status: 'dry-run',
      plan: planningResult.plan,
      preview,
    };
  }

  if (!command.assumeYes) {
    ports.print('Waiting for maintainer confirmation before making changes...\n');
    const confirmed = await ports.confirmRelease(planningResult.plan);

    if (!confirmed) {
      ports.print('Release confirmation declined; no changes were written.\n');
      return {
        status: 'declined',
        plan: planningResult.plan,
        preview,
      };
    }
  } else {
    ports.print('--yes provided; continuing after preview without prompting.\n');
  }

  ports.print('Release confirmed; starting execution.\n');
  return {
    status: 'confirmed',
    plan: planningResult.plan,
    preview,
    execution: await executeConfirmedRelease(planningResult.plan, ports),
  };
}

export async function executeConfirmedRelease(plan: ReleasePlan, ports: ReleaseExecutionPorts): Promise<ReleaseExecutionResult> {
  const completedSteps: ReleaseCompletedStep[] = [];

  if (!plan.metadata) {
    return failExecution(completedSteps, 'write-changelog', 'Release plan does not include metadata updates.');
  }

  const npmAuth = await runStep(ports, completedSteps, 'check-npm-auth', 'Checking npm authentication: npm whoami...', 'npm', ['whoami'], 'npm authentication check passed.');
  if (npmAuth.status === 'failed') {
    return npmAuth;
  }

  const githubAuth = await runStep(
    ports,
    completedSteps,
    'check-github-auth',
    'Checking GitHub authentication: gh auth status...',
    'gh',
    ['auth', 'status'],
    'GitHub authentication check passed.'
  );
  if (githubAuth.status === 'failed') {
    return githubAuth;
  }

  const build = await runStep(ports, completedSteps, 'build-release', 'Building release artifacts: pnpm build...', 'pnpm', ['build'], 'Release build passed.');
  if (build.status === 'failed') {
    return build;
  }

  if (plan.metadataAlreadyPrepared) {
    completedSteps.push({ name: 'write-changelog', message: `${plan.metadata.changelog.path} already prepared for ${plan.targetVersion}; skipped write.` });
    completedSteps.push({ name: 'write-package-json', message: `${plan.metadata.packageJson.path} already prepared for ${plan.targetVersion}; skipped write.` });
    printExecutionProgress(ports, `Metadata already prepared for ${plan.targetVersion}; skipping changelog and package.json writes.`);
  } else {
    printExecutionProgress(ports, `Writing changelog update to ${plan.metadata.changelog.path}...`);
    ports.writeFile(plan.metadata.changelog.path, plan.metadata.changelog.nextContent);
    completedSteps.push({ name: 'write-changelog', message: `Wrote ${plan.metadata.changelog.path}.` });
    printExecutionProgress(ports, `Done: wrote ${plan.metadata.changelog.path}.`);

    printExecutionProgress(ports, `Writing package version ${plan.metadata.packageJson.targetVersion} to ${plan.metadata.packageJson.path}...`);
    ports.writeFile(plan.metadata.packageJson.path, plan.metadata.packageJson.nextContent);
    completedSteps.push({ name: 'write-package-json', message: `Wrote ${plan.metadata.packageJson.path}.` });
    printExecutionProgress(ports, `Done: wrote ${plan.metadata.packageJson.path}.`);
  }

  printExecutionProgress(ports, 'Running release validation: pnpm run validate:release-publish...');
  const validation = await ports.run('pnpm', ['run', 'validate:release-publish']);
  if (validation.exitCode !== 0) {
    const failure = failExecution(completedSteps, 'validate-release', 'Release validation failed.', validation);
    printExecutionFailure(ports, failure);
    return failure;
  }
  completedSteps.push({ name: 'validate-release', message: 'Release validation passed.' });
  printExecutionProgress(ports, 'Done: release validation passed.');

  const releaseCommitMessage = `chore(release): ${plan.targetVersion}`;
  if (plan.metadataAlreadyPrepared) {
    completedSteps.push({ name: 'create-release-commit', message: `Release commit already exists at HEAD for ${plan.targetVersion}; skipped commit.` });
    printExecutionProgress(ports, `Release commit already exists at HEAD for ${plan.targetVersion}; skipping commit.`);
  } else {
    printExecutionProgress(ports, 'Staging release metadata: git add CHANGELOG.md package.json...');
    const gitAdd = await ports.run('git', ['add', 'CHANGELOG.md', 'package.json']);
    if (gitAdd.exitCode !== 0) {
      const failure = failExecution(completedSteps, 'create-release-commit', 'Staging release metadata failed.', gitAdd);
      printExecutionFailure(ports, failure);
      return failure;
    }

    printExecutionProgress(ports, `Creating release commit: ${releaseCommitMessage}...`);
    const gitCommit = await ports.run('git', ['commit', '-m', releaseCommitMessage]);
    if (gitCommit.exitCode !== 0) {
      const failure = failExecution(completedSteps, 'create-release-commit', 'Creating the release commit failed.', gitCommit);
      printExecutionFailure(ports, failure);
      return failure;
    }
    completedSteps.push({ name: 'create-release-commit', message: `Created release commit: ${releaseCommitMessage}.` });
    printExecutionProgress(ports, `Done: created release commit ${releaseCommitMessage}.`);
  }

  if (plan.existingTagAtHead) {
    completedSteps.push({ name: 'create-release-tag', message: `Release tag ${plan.tagName} already points at HEAD; skipped tag creation.` });
    printExecutionProgress(ports, `Release tag ${plan.tagName} already points at HEAD; skipping tag creation.`);
  } else {
    printExecutionProgress(ports, `Creating release tag: ${plan.tagName}...`);
    const gitTag = await ports.run('git', ['tag', plan.tagName]);
    if (gitTag.exitCode !== 0) {
      const failure = failExecution(completedSteps, 'create-release-tag', `Creating release tag ${plan.tagName} failed.`, gitTag);
      printExecutionFailure(ports, failure);
      return failure;
    }
    completedSteps.push({ name: 'create-release-tag', message: `Created release tag: ${plan.tagName}.` });
    printExecutionProgress(ports, `Done: created release tag ${plan.tagName}.`);
  }

  const npmPublishArgs = buildNpmPublishArgs(plan);
  const npmPublishLog = plan.hasOtp ? 'npm publish --access public --otp ******' : 'npm publish --access public';
  printExecutionProgress(ports, `Publishing package to npm: ${npmPublishLog}...`);
  const npmPublish = await ports.run('npm', npmPublishArgs);
  if (npmPublish.exitCode !== 0) {
    const failure = failExecution(completedSteps, 'publish-npm', 'Publishing to npm failed.', npmPublish);
    printExecutionFailure(ports, failure);
    return failure;
  }
  completedSteps.push({ name: 'publish-npm', message: 'Published package to npm.' });
  printExecutionProgress(ports, 'Done: published package to npm.');

  printExecutionProgress(ports, 'Pushing release commit: git push origin HEAD...');
  const pushCommit = await ports.run('git', ['push', 'origin', 'HEAD']);
  if (pushCommit.exitCode !== 0) {
    const failure = failExecution(completedSteps, 'push-commit', 'Pushing the release commit failed.', pushCommit);
    printExecutionFailure(ports, failure);
    return failure;
  }
  completedSteps.push({ name: 'push-commit', message: 'Pushed release commit to origin.' });
  printExecutionProgress(ports, 'Done: pushed release commit to origin.');

  printExecutionProgress(ports, `Pushing release tag: git push origin ${plan.tagName}...`);
  const pushTag = await ports.run('git', ['push', 'origin', plan.tagName]);
  if (pushTag.exitCode !== 0) {
    const failure = failExecution(completedSteps, 'push-tag', `Pushing release tag ${plan.tagName} failed.`, pushTag);
    printExecutionFailure(ports, failure);
    return failure;
  }
  completedSteps.push({ name: 'push-tag', message: `Pushed release tag ${plan.tagName} to origin.` });
  printExecutionProgress(ports, `Done: pushed release tag ${plan.tagName} to origin.`);

  const releaseBody = extractReleaseBody(plan);
  printExecutionProgress(ports, `Creating GitHub Release: gh release create ${plan.tagName}...`);
  const githubRelease = await ports.run('gh', ['release', 'create', plan.tagName, '--title', plan.tagName, '--notes', releaseBody]);
  if (githubRelease.exitCode !== 0) {
    const failure = failExecution(completedSteps, 'create-github-release', 'Creating the GitHub Release failed.', githubRelease);
    printExecutionFailure(ports, failure);
    return failure;
  }
  completedSteps.push({ name: 'create-github-release', message: `Created GitHub Release ${plan.tagName}.` });
  printExecutionProgress(ports, `Done: created GitHub Release ${plan.tagName}.`);

  return {
    status: 'executed',
    completedSteps,
  };
}

function printWarnings(warnings: ReleaseWarning[], ports: Pick<ReleaseWorkflowPorts, 'print'>): void {
  if (warnings.length === 0) {
    return;
  }

  ports.print('Warnings:\n');
  for (const warning of warnings) {
    ports.print(`- [${warning.code}] ${warning.message}\n`);
  }
}

function printExecutionProgress(ports: ReleaseExecutionPorts, message: string): void {
  ports.print?.(`${message}\n`);
}

function printExecutionFailure(ports: ReleaseExecutionPorts, failure: FailedReleaseExecutionResult): void {
  ports.print?.(`Failed: ${failure.failedStep.message}\n`);
  ports.print?.(`Recovery: ${failure.failedStep.recoveryGuidance}\n`);
}

function buildNpmPublishArgs(plan: ReleasePlan): string[] {
  const args = ['publish', '--access', 'public'];

  if (plan.otp) {
    args.push('--otp', plan.otp);
  }

  return args;
}

async function runStep(
  ports: ReleaseExecutionPorts,
  completedSteps: ReleaseCompletedStep[],
  stepName: ReleaseExecutionStepName,
  startMessage: string,
  command: string,
  args: string[],
  completedMessage: string
): Promise<{ status: 'ok' } | FailedReleaseExecutionResult> {
  printExecutionProgress(ports, startMessage);
  const result = await ports.run(command, args);
  if (result.exitCode !== 0) {
    const failure = failExecution(completedSteps, stepName, `${completedMessage.replace(/\.$/, '')} failed.`, result);
    printExecutionFailure(ports, failure);
    return failure;
  }

  completedSteps.push({ name: stepName, message: completedMessage });
  printExecutionProgress(ports, `Done: ${completedMessage}`);
  return { status: 'ok' };
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
): FailedReleaseExecutionResult {
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
    case 'check-npm-auth':
      return 'Run `npm login` with an account that can publish this package, then rerun the release workflow.';
    case 'check-github-auth':
      return 'Run `gh auth login` or fix GitHub CLI authentication, then rerun the release workflow.';
    case 'build-release':
      return 'Fix the build failure, then rerun the release workflow.';
    case 'create-release-commit':
      return 'Review local release metadata changes, resolve git commit issues, then rerun or complete the release manually.';
    case 'create-release-tag':
      return 'Review the release commit and tag state, then create the tag manually or rerun after cleanup.';
    case 'publish-npm':
      return 'Review npm authentication/package state. If the package was not published, rerun after fixing npm publish. The workflow publishes with `npm publish --access public`.';
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
