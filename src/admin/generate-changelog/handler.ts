import { buildChangelogProposal } from './changelog-format.js';
import type { ChangelogProposal, ChangelogTargetSection, ChangelogWarning, GenerateChangelogCommand, GenerateChangelogProposalResult } from './command.js';
import { readGitHistory } from './git-history.js';
import { determineSemverBump, parseSemverVersion } from './semver.js';

export function handleGenerateChangelogProposal(command: GenerateChangelogCommand, cwd = process.cwd()): GenerateChangelogProposalResult {
  const targetSection = getTargetSection(command);

  if (targetSection.status === 'blocked') {
    return targetSection.result;
  }

  const gitHistory = readGitHistory(command, cwd);

  if (gitHistory.status === 'blocked') {
    return {
      status: 'blocked',
      message: gitHistory.message,
      warnings: gitHistory.warnings,
    };
  }

  const proposal = buildChangelogProposal({
      commits: gitHistory.commits,
      sourceRange: gitHistory.sourceRange,
      targetSection: targetSection.value,
      warnings: gitHistory.warnings,
    });

  return {
    status: 'proposed',
    proposal: addSemverMismatchWarning(proposal),
  };
}

type TargetSectionResult =
  | {
      status: 'ok';
      value: ChangelogTargetSection;
    }
  | {
      status: 'blocked';
      result: GenerateChangelogProposalResult;
    };

function getTargetSection(command: GenerateChangelogCommand): TargetSectionResult {
  if (!command.version) {
    return {
      status: 'ok',
      value: { type: 'unreleased' },
    };
  }

  const version = parseSemverVersion(command.version);

  if (version.status === 'invalid') {
    return {
      status: 'blocked',
      result: {
        status: 'blocked',
        message: version.message,
        warnings: [
          {
            code: 'invalid-version',
            message: version.message,
          },
        ],
      },
    };
  }

  return {
    status: 'ok',
    value: {
      type: 'version',
      version: version.version.version,
      date: command.date ?? new Date().toISOString().slice(0, 10),
    },
  };
}

function addSemverMismatchWarning(proposal: ChangelogProposal): ChangelogProposal {
  if (proposal.targetSection.type !== 'version' || !proposal.sourceRange.fromRef) {
    return proposal;
  }

  const previousVersion = parseSemverVersion(proposal.sourceRange.fromRef);
  if (previousVersion.status !== 'ok') {
    return proposal;
  }

  const targetVersion = parseSemverVersion(proposal.targetSection.version);
  if (targetVersion.status !== 'ok') {
    return proposal;
  }

  const actualBump = determineSemverBump(previousVersion.version, targetVersion.version);
  if (actualBump.status !== 'ok' || actualBump.bump === proposal.semverGuidance.suggestedBump) {
    return proposal;
  }

  const warning: ChangelogWarning = {
    code: 'semver-bump-mismatch',
    message: `Provided version ${proposal.targetSection.version} is a ${actualBump.bump} bump from ${previousVersion.version.version}, but commit history suggests a ${proposal.semverGuidance.suggestedBump} bump.`,
  };

  return {
    ...proposal,
    warnings: [...proposal.warnings, warning],
  };
}
