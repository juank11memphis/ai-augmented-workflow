import type { ChangelogCategory, ChangelogEntry, ChangelogProposal, ChangelogWarning, RawCommit } from './command.js';
import type { SemverBump } from './semver.js';

export const CHANGELOG_CATEGORIES: ChangelogCategory[] = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

type ConventionalCommitParts = {
  type: string;
  description: string;
  breakingChange: boolean;
};

export function createEmptyEntriesByCategory(): Record<ChangelogCategory, ChangelogEntry[]> {
  return {
    Added: [],
    Changed: [],
    Deprecated: [],
    Removed: [],
    Fixed: [],
    Security: [],
  };
}

export function buildChangelogProposal(input: {
  commits: RawCommit[];
  sourceRange: ChangelogProposal['sourceRange'];
  targetSection?: ChangelogProposal['targetSection'];
  warnings?: ChangelogWarning[];
}): ChangelogProposal {
  const entriesByCategory = createEmptyEntriesByCategory();
  const warnings = [...(input.warnings ?? [])];

  for (const commit of input.commits) {
    const result = classifyCommit(commit);
    entriesByCategory[result.entry.category].push(result.entry);
    warnings.push(...result.warnings);
  }

  return {
    sourceRange: input.sourceRange,
    targetSection: input.targetSection ?? { type: 'unreleased' },
    semverGuidance: {
      suggestedBump: suggestSemverBump(entriesByCategory),
    },
    commitCount: input.commits.length,
    entriesByCategory,
    warnings,
  };
}

export function retargetChangelogProposal(proposal: ChangelogProposal, targetSection: ChangelogProposal['targetSection']): ChangelogProposal {
  return {
    ...proposal,
    targetSection,
  };
}

export function suggestSemverBump(entriesByCategory: Record<ChangelogCategory, ChangelogEntry[]>): SemverBump {
  const entries = Object.values(entriesByCategory).flat();

  if (entries.some((entry) => entry.breakingChange)) {
    return 'major';
  }

  if (entriesByCategory.Added.some((entry) => entry.source === 'conventional-commit')) {
    return 'minor';
  }

  return 'patch';
}

export function renderChangelogSection(proposal: ChangelogProposal): string {
  const lines = [renderTargetSectionHeading(proposal.targetSection), ...renderEntriesByCategory(proposal.entriesByCategory)];

  return `${lines.join('\n')}\n`;
}

export function renderChangelogPreview(proposal: ChangelogProposal, targetPath: string): string {
  const lines = [
    'Changelog preview',
    '',
    `Git range: ${formatSourceRange(proposal.sourceRange)}`,
    `Commits inspected: ${proposal.commitCount}`,
    `Target path: ${targetPath}`,
    `Target section: ${formatTargetSection(proposal.targetSection)}`,
    `Suggested SemVer bump: ${proposal.semverGuidance.suggestedBump}`,
    '',
    'Entries:',
    ...renderPreviewEntries(proposal.entriesByCategory),
  ];

  if (proposal.warnings.length > 0) {
    lines.push('', 'Warnings:', ...proposal.warnings.map(formatWarning));
  }

  return `${lines.join('\n')}\n`;
}

function renderTargetSectionHeading(targetSection: ChangelogProposal['targetSection']): string {
  if (targetSection.type === 'unreleased') {
    return '## Unreleased';
  }

  return `## ${targetSection.version} - ${targetSection.date}`;
}

function renderEntriesByCategory(entriesByCategory: Record<ChangelogCategory, ChangelogEntry[]>): string[] {
  return CHANGELOG_CATEGORIES.flatMap((category) => {
    const entries = entriesByCategory[category];

    if (entries.length === 0) {
      return [];
    }

    return ['', `### ${category}`, ...entries.map((entry) => `- ${entry.text}`)];
  });
}

function renderPreviewEntries(entriesByCategory: Record<ChangelogCategory, ChangelogEntry[]>): string[] {
  const lines = renderEntriesByCategory(entriesByCategory);

  if (lines.length === 0) {
    return ['- No generated entries.'];
  }

  return lines;
}

function formatSourceRange(sourceRange: ChangelogProposal['sourceRange']): string {
  if (sourceRange.fromRef) {
    return `${sourceRange.fromRef}..${sourceRange.toRef}`;
  }

  return sourceRange.toRef;
}

function formatTargetSection(targetSection: ChangelogProposal['targetSection']): string {
  if (targetSection.type === 'unreleased') {
    return 'Unreleased';
  }

  return `${targetSection.version} - ${targetSection.date}`;
}

function formatWarning(warning: ChangelogWarning): string {
  const commitSuffix = warning.commitHash ? ` (${warning.commitHash})` : '';

  return `- [${warning.code}] ${warning.message}${commitSuffix}`;
}

export function classifyCommit(commit: RawCommit): { entry: ChangelogEntry; warnings: ChangelogWarning[] } {
  const conventionalCommit = parseConventionalCommit(commit.subject);

  if (!conventionalCommit) {
    const entry = buildEntry({
      category: classifyFromText(commit.subject),
      text: commit.subject.trim(),
      commit,
      source: 'commit-message',
      breakingChange: hasBreakingChangeMarker(commit),
      reviewNeeded: true,
    });

    return {
      entry,
      warnings: buildReviewWarnings(entry, 'Commit message is not a Conventional Commit. Review the generated changelog entry.'),
    };
  }

  const breakingChange = conventionalCommit.breakingChange || hasBreakingChangeMarker(commit);
  const entry = buildEntry({
    category: classifyConventionalCommit(conventionalCommit.type, conventionalCommit.description),
    text: conventionalCommit.description,
    commit,
    source: 'conventional-commit',
    breakingChange,
    reviewNeeded: breakingChange,
  });

  return {
    entry,
    warnings: breakingChange ? buildReviewWarnings(entry, 'Breaking change detected. Review the generated changelog entry.') : [],
  };
}

function parseConventionalCommit(subject: string): ConventionalCommitParts | undefined {
  const match = /^(?<type>[a-z]+)(?:\([^)]+\))?(?<breaking>!)?:\s+(?<description>.+)$/.exec(subject.trim());

  if (!match?.groups) {
    return undefined;
  }

  return {
    type: match.groups.type,
    description: match.groups.description.trim(),
    breakingChange: match.groups.breaking === '!',
  };
}

function classifyConventionalCommit(type: string, description: string): ChangelogCategory {
  const textCategory = classifyFromText(`${type} ${description}`);

  if (textCategory !== 'Changed') {
    return textCategory;
  }

  switch (type) {
    case 'feat':
      return 'Added';
    case 'fix':
      return 'Fixed';
    case 'perf':
    case 'refactor':
    case 'style':
    case 'docs':
    case 'test':
    case 'build':
    case 'ci':
    case 'chore':
      return 'Changed';
    default:
      return 'Changed';
  }
}

function classifyFromText(text: string): ChangelogCategory {
  const normalizedText = text.toLowerCase();

  if (/\b(security|secure|vulnerability|cve|exploit)\b/.test(normalizedText)) {
    return 'Security';
  }

  if (/\b(deprecat(?:e|ed|es|ing|ion))\b/.test(normalizedText)) {
    return 'Deprecated';
  }

  if (/\b(remove|removed|removes|removing|delete|deleted|deletes|deleting)\b/.test(normalizedText)) {
    return 'Removed';
  }

  return 'Changed';
}

function hasBreakingChangeMarker(commit: RawCommit): boolean {
  return /^BREAKING[ -]CHANGE:/im.test(commit.body);
}

function buildEntry(input: {
  category: ChangelogCategory;
  text: string;
  commit: RawCommit;
  source: ChangelogEntry['source'];
  breakingChange: boolean;
  reviewNeeded: boolean;
}): ChangelogEntry {
  return {
    category: input.category,
    text: input.text,
    commitHash: input.commit.hash,
    reviewNeeded: input.reviewNeeded,
    breakingChange: input.breakingChange,
    source: input.source,
  };
}

function buildReviewWarnings(entry: ChangelogEntry, message: string): ChangelogWarning[] {
  const warnings: ChangelogWarning[] = [
    {
      code: 'review-needed',
      message,
      commitHash: entry.commitHash,
    },
  ];

  if (entry.breakingChange) {
    warnings.push({
      code: 'breaking-change',
      message: 'Breaking change detected. Confirm release notes and SemVer impact before publishing.',
      commitHash: entry.commitHash,
    });
  }

  return warnings;
}
