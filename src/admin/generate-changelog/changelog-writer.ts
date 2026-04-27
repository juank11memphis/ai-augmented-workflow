import { renderChangelogSection } from './changelog-format.js';
import type { ChangelogProposal, ChangelogWarning } from './command.js';

export const STANDARD_CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
`;

export type PlanChangelogUpdateResult =
  | {
      status: 'ok';
      content: string;
      replacingExistingSection: boolean;
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ChangelogWarning[];
    };

export function planChangelogUpdate(existingContent: string | undefined, proposal: ChangelogProposal): PlanChangelogUpdateResult {
  const nextSection = renderChangelogSection(proposal).trimEnd();

  if (!existingContent || existingContent.trim().length === 0) {
    return {
      status: 'ok',
      content: `${STANDARD_CHANGELOG_HEADER}\n${nextSection}\n`,
      replacingExistingSection: false,
    };
  }

  const parsedChangelog = parseChangelogSections(existingContent);
  if (parsedChangelog.status === 'blocked') {
    return parsedChangelog;
  }

  const targetSectionIndex = findTargetSectionIndex(parsedChangelog.sections, proposal);
  if (targetSectionIndex >= 0) {
    const sections = [...parsedChangelog.sections];
    sections[targetSectionIndex] = nextSection;

    return {
      status: 'ok',
      content: joinChangelog(parsedChangelog.header, sections),
      replacingExistingSection: true,
    };
  }

  return {
    status: 'ok',
    content: joinChangelog(parsedChangelog.header, [nextSection, ...parsedChangelog.sections]),
    replacingExistingSection: false,
  };
}

type ParsedChangelog =
  | {
      status: 'ok';
      header: string;
      sections: string[];
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ChangelogWarning[];
    };

function parseChangelogSections(content: string): ParsedChangelog {
  if (!content.trimStart().startsWith('# Changelog')) {
    return unsafeParsedChangelog('Existing CHANGELOG.md does not start with a # Changelog heading.');
  }

  const sectionMatches = [...content.matchAll(/^## .+$/gm)];
  if (sectionMatches.length === 0) {
    return unsafeParsedChangelog('Existing CHANGELOG.md has no parseable release sections.');
  }

  const firstSectionIndex = sectionMatches[0]?.index;
  if (firstSectionIndex === undefined) {
    return unsafeParsedChangelog('Existing CHANGELOG.md has no parseable release sections.');
  }

  const header = content.slice(0, firstSectionIndex).trimEnd();
  const sections = sectionMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = sectionMatches[index + 1]?.index ?? content.length;

    return content.slice(start, end).trim();
  });

  return {
    status: 'ok',
    header,
    sections,
  };
}

function findTargetSectionIndex(sections: string[], proposal: ChangelogProposal): number {
  const expectedHeading =
    proposal.targetSection.type === 'unreleased' ? '## Unreleased' : `## ${proposal.targetSection.version} - ${proposal.targetSection.date}`;

  return sections.findIndex((section) => section.split('\n')[0] === expectedHeading);
}

function joinChangelog(header: string, sections: string[]): string {
  return `${header.trimEnd()}\n\n${sections.map((section) => section.trim()).join('\n\n')}\n`;
}

function unsafeChangelog(message: string): PlanChangelogUpdateResult {
  return {
    status: 'blocked',
    message,
    warnings: [
      {
        code: 'unsafe-changelog',
        message,
      },
    ],
  };
}

function unsafeParsedChangelog(message: string): ParsedChangelog {
  return {
    status: 'blocked',
    message,
    warnings: [
      {
        code: 'unsafe-changelog',
        message,
      },
    ],
  };
}
