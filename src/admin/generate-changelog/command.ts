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
  | 'invalid-version';

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
  commitCount: number;
  entriesByCategory: Record<ChangelogCategory, ChangelogEntry[]>;
  warnings: ChangelogWarning[];
};

export type GenerateChangelogProposalResult =
  | { status: 'proposed'; proposal: ChangelogProposal }
  | { status: 'blocked'; message: string; warnings: ChangelogWarning[] };
