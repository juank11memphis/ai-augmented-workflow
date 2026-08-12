export const APPLY_APPROVED_REPAIR_MARKER = 'approve-concrete-repair-proposal' as const;

export type ApplyApprovedEvalRepairCommand = {
  readonly projectRoot: string;
  readonly proposalId: string;
  readonly approvalMarker: string;
};
