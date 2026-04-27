import type { SemverBump } from './semver.js';

export type GenerateChangelogCommand = {
  fromRef?: string;
  toRef?: string;
  version?: string;
  date?: string;
  assumeYes?: boolean;
};

export type ChangelogCategory = 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';

export type RawCommit = {
  hash: string;
  subject: string;
  body: string;
};

export type ChangelogEntry = {
  category: ChangelogCategory;
  text: string;
  commitHash: string;
  reviewNeeded: boolean;
  breakingChange: boolean;
  source: 'conventional-commit' | 'commit-message';
};

export type ChangelogWarningCode =
  | 'breaking-change'
  | 'review-needed'
  | 'missing-tag'
  | 'invalid-git-ref'
  | 'not-git-repository'
  | 'invalid-version'
  | 'invalid-date'
  | 'semver-bump-mismatch'
  | 'unsafe-changelog';

export type ChangelogWarning = {
  code: ChangelogWarningCode;
  message: string;
  commitHash?: string;
};

export type ChangelogSourceRange = {
  fromRef?: string;
  toRef: string;
  usedLatestTag: boolean;
  missingTag: boolean;
};

export type ChangelogTargetSection =
  | { type: 'unreleased' }
  | { type: 'version'; version: string; date: string };

export type ChangelogProposal = {
  sourceRange: ChangelogSourceRange;
  targetSection: ChangelogTargetSection;
  semverGuidance: {
    suggestedBump: SemverBump;
  };
  commitCount: number;
  entriesByCategory: Record<ChangelogCategory, ChangelogEntry[]>;
  warnings: ChangelogWarning[];
};

export type GenerateChangelogProposalResult =
  | { status: 'proposed'; proposal: ChangelogProposal }
  | { status: 'blocked'; message: string; warnings: ChangelogWarning[] };

export type GenerateChangelogWritePorts = {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  confirmWrite(): boolean | Promise<boolean>;
  showPreview(preview: string): void;
};

export type GenerateChangelogWriteResult =
  | {
      status: 'written';
      changelogPath: string;
      preview: string;
      content: string;
      proposal: ChangelogProposal;
    }
  | {
      status: 'declined';
      changelogPath: string;
      preview: string;
      proposal: ChangelogProposal;
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ChangelogWarning[];
      preview?: string;
    };
