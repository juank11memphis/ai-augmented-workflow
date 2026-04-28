import type { ChangelogProposal } from '../generate-changelog/command.js';
import type { ParsedSemverVersion, SemverBump } from '../generate-changelog/semver.js';
import type { ReleaseMetadataPlan } from './command.js';

export function incrementSemverVersion(version: ParsedSemverVersion, bump: SemverBump): ParsedSemverVersion {
  switch (bump) {
    case 'major':
      return buildParsedVersion(version.major + 1, 0, 0);
    case 'minor':
      return buildParsedVersion(version.major, version.minor + 1, 0);
    case 'patch':
      return buildParsedVersion(version.major, version.minor, version.patch + 1);
  }
}

export function formatReleaseTagName(version: string): string {
  return `v${version}`;
}

export function buildReleaseMetadataPlan(metadata: ReleaseMetadataPlan): ReleaseMetadataPlan {
  return metadata;
}

export function deriveSuggestedBumpFromChangelogProposal(proposal: ChangelogProposal): SemverBump {
  return proposal.semverGuidance.suggestedBump;
}

function buildParsedVersion(major: number, minor: number, patch: number): ParsedSemverVersion {
  return {
    version: `${major}.${minor}.${patch}`,
    major,
    minor,
    patch,
  };
}
