import { buildChangelogProposal } from './changelog-format.js';
import type { ChangelogTargetSection, GenerateChangelogCommand, GenerateChangelogProposalResult } from './command.js';
import { readGitHistory } from './git-history.js';

export function handleGenerateChangelogProposal(command: GenerateChangelogCommand, cwd = process.cwd()): GenerateChangelogProposalResult {
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
      targetSection: getTargetSection(command),
      warnings: gitHistory.warnings,
    }),
  };
}

function getTargetSection(command: GenerateChangelogCommand): ChangelogTargetSection {
  if (!command.version) {
    return { type: 'unreleased' };
  }

  return {
    type: 'version',
    version: command.version,
    date: command.date ?? new Date().toISOString().slice(0, 10),
  };
}
