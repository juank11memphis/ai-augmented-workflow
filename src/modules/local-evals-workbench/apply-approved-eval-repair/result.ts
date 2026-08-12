export type ApprovedRepairChangedFile = {
  readonly path: string;
};

export type ApprovedRepairBlockedReason =
  | 'invalid-request'
  | 'missing-approval'
  | 'stale-proposal'
  | 'wrong-project-root'
  | 'unsafe-target'
  | 'unsafe-workflow-readiness'
  | 'mutation-failure';

export type ApplyApprovedEvalRepairResult =
  | {
      readonly status: 'applied';
      readonly proposalId: string;
      readonly changedFiles: readonly ApprovedRepairChangedFile[];
      readonly message: string;
      readonly rerunRecommendation: string;
    }
  | {
      readonly status: 'blocked';
      readonly reason: Exclude<ApprovedRepairBlockedReason, 'mutation-failure'>;
      readonly proposalId?: string;
      readonly message: string;
      readonly guidance?: readonly string[];
      readonly unsafePaths?: readonly string[];
    }
  | {
      readonly status: 'error';
      readonly reason: 'mutation-failure';
      readonly proposalId: string;
      readonly message: string;
    };
