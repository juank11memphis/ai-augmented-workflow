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
  | 'not-git-repository';

export type ReleaseWarning = {
  code: ReleaseWarningCode;
  message: string;
};

export type ReleaseRange = {
  fromRef: string;
  toRef: string;
};

export type ReleasePlan = {
  range: ReleaseRange;
  targetVersion: string;
  tagName: string;
  suggestedBump: SemverBump;
  commitCount: number;
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
