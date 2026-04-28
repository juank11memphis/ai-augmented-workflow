import type { SemverBump } from '../generate-changelog/semver.js';

export type ReleaseWorkflowCommand = {
  fromRef?: string;
  toRef?: string;
  version?: string;
  date?: string;
  assumeYes?: boolean;
  dryRun?: boolean;
};

export type ReleaseWarningCode =
  | 'dirty-working-tree'
  | 'missing-semver-tag'
  | 'existing-target-tag'
  | 'invalid-version'
  | 'invalid-git-ref'
  | 'not-git-repository'
  | 'malformed-package-json';

export type ReleaseWarning = {
  code: ReleaseWarningCode;
  message: string;
};

export type ReleaseRange = {
  fromRef: string;
  toRef: string;
};

export type ReleaseChangelogUpdatePlan = {
  path: 'CHANGELOG.md';
  targetVersion: string;
  targetDate: string;
  replacingExistingSection: boolean;
  nextContent: string;
};

export type ReleasePackageJsonUpdatePlan = {
  path: 'package.json';
  currentVersion: string;
  targetVersion: string;
  nextContent: string;
};

export type ReleaseMetadataPlan = {
  changelog: ReleaseChangelogUpdatePlan;
  packageJson: ReleasePackageJsonUpdatePlan;
};

export type ReleasePlan = {
  range: ReleaseRange;
  targetVersion: string;
  tagName: string;
  suggestedBump: SemverBump;
  commitCount: number;
  metadata?: ReleaseMetadataPlan;
  warnings: ReleaseWarning[];
};

export type ReleasePlanningResult =
  | {
      status: 'planned';
      plan: ReleasePlan;
    }
  | {
      status: 'blocked';
      message: string;
      warnings: ReleaseWarning[];
    };
