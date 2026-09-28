export type ApprovedRepairChangedFile = {
  readonly path: string;
  readonly summary?: string;
};

export type ApprovedRepairRerunAction =
  | {
      readonly scope: 'test_case';
      readonly label: 'Rerun this test case';
      readonly suiteId: string;
      readonly testCaseId: string;
      readonly evalRunModelId: string;
      readonly assertionId?: string;
      readonly primary: true;
    }
  | {
      readonly scope: 'suite';
      readonly label: 'Rerun full suite';
      readonly suiteId: string;
      readonly evalRunModelId: string;
      readonly primary: boolean;
    };

export type ApprovedRepairRerunRecommendation = {
  readonly message: string;
  readonly primaryAction: ApprovedRepairRerunAction;
  readonly alternateActions: readonly ApprovedRepairRerunAction[];
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
      readonly changedFileCount: number;
      readonly message: string;
      readonly validationStatus: 'not-rerun';
      readonly rerunRecommendation: ApprovedRepairRerunRecommendation;
    }
  | {
      readonly status: 'blocked';
      readonly reason: Exclude<ApprovedRepairBlockedReason, 'mutation-failure'>;
      readonly proposalId?: string;
      readonly changedFiles: readonly [];
      readonly changedFileCount: 0;
      readonly message: string;
      readonly guidance?: readonly string[];
      readonly unsafePaths?: readonly string[];
    }
  | {
      readonly status: 'error';
      readonly reason: 'mutation-failure';
      readonly proposalId: string;
      readonly changedFiles: readonly ApprovedRepairChangedFile[];
      readonly changedFileCount: number;
      readonly message: string;
    };
