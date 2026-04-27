import { buildChangelogProposal } from './changelog-format.js';
import type { ChangelogTargetSection, GenerateChangelogCommand, GenerateChangelogProposalResult } from './command.js';
import { readGitHistory } from './git-history.js';
import { parseSemverVersion } from './semver.js';

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

  return {
    status: 'proposed',
    proposal: buildChangelogProposal({
      commits: gitHistory.commits,
      sourceRange: gitHistory.sourceRange,
      targetSection: targetSection.value,
      warnings: gitHistory.warnings,
    }),
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
