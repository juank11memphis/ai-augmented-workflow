import type { ChangelogProposal } from '../generate-changelog/command.js';
import type { ParsedSemverVersion, SemverBump } from '../generate-changelog/semver.js';
import type { ReleaseMetadataPlan, ReleasePlan, ReleaseWarning } from './command.js';

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

export function renderReleasePlanPreview(plan: ReleasePlan): string {
  const lines = [
    'Release plan preview',
    '',
    `Git range: ${plan.range.fromRef}..${plan.range.toRef}`,
    `Proposed version: ${plan.targetVersion}`,
    `Suggested SemVer bump: ${plan.suggestedBump}`,
    `Commits inspected: ${plan.commitCount}`,
    '',
    'Planned local metadata updates:',
    ...renderMetadataPreview(plan),
    '',
    'Planned release actions after confirmation:',
    `- Run validation: pnpm run validate:release`,
    `- Create release commit: chore(release): ${plan.targetVersion}`,
    `- Create git tag: ${plan.tagName}`,
    '- Publish package: npm publish',
    `- Push release commit: git push origin HEAD`,
    `- Push release tag: git push origin ${plan.tagName}`,
    `- Create GitHub Release: gh release create ${plan.tagName}`,
  ];

  if (plan.warnings.length > 0) {
    lines.push('', 'Warnings:', ...plan.warnings.map(formatReleaseWarning));
  }

  return `${lines.join('\n')}\n`;
}

export function extractReleaseChangelogSection(changelogContent: string, targetVersion: string): string | undefined {
  const sectionStart = changelogContent.indexOf(`## ${targetVersion} - `);
  if (sectionStart < 0) {
    return undefined;
  }

  const nextSectionStart = changelogContent.indexOf('\n## ', sectionStart + 1);
  const sectionEnd = nextSectionStart >= 0 ? nextSectionStart : changelogContent.length;

  return changelogContent.slice(sectionStart, sectionEnd).trim();
}

function buildParsedVersion(major: number, minor: number, patch: number): ParsedSemverVersion {
  return {
    version: `${major}.${minor}.${patch}`,
    major,
    minor,
    patch,
  };
}

function renderMetadataPreview(plan: ReleasePlan): string[] {
  if (!plan.metadata) {
    return ['- No local metadata updates planned.'];
  }

  const changelogAction = plan.metadata.changelog.replacingExistingSection ? 'Replace' : 'Create';

  return [
    `- ${changelogAction} CHANGELOG.md section: ${plan.metadata.changelog.targetVersion} - ${plan.metadata.changelog.targetDate}`,
    ...renderChangelogSectionPreview(plan.metadata.changelog.nextContent, plan.metadata.changelog.targetVersion),
    `- Update package.json version: ${plan.metadata.packageJson.currentVersion} -> ${plan.metadata.packageJson.targetVersion}`,
  ];
}

function renderChangelogSectionPreview(changelogContent: string, targetVersion: string): string[] {
  const section = extractChangelogVersionSection(changelogContent, targetVersion);
  const previewLines = section.split('\n').slice(0, 20);

  return ['  Changelog preview:', ...previewLines.map((line) => `  ${line}`)];
}

function extractChangelogVersionSection(changelogContent: string, targetVersion: string): string {
  return extractReleaseChangelogSection(changelogContent, targetVersion) ?? '(target changelog section not found in planned content)';
}

function formatReleaseWarning(warning: ReleaseWarning): string {
  return `- [${warning.code}] ${warning.message}`;
}
