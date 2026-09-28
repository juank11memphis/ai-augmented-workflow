import { APPLY_APPROVED_REPAIR_MARKER } from './command.js';
import type { ApplyApprovedEvalRepairCommand } from './command.js';
import { logicalId } from '../run-history/validation.js';

export type ApplyApprovedEvalRepairParseResult =
  | { readonly status: 'ok'; readonly command: ApplyApprovedEvalRepairCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseApplyApprovedEvalRepairRequest(projectRoot: string, payload: unknown): ApplyApprovedEvalRepairParseResult {
  if (!isRecord(payload)) return invalid('Request body must be a JSON object.');
  const proposalId = readString(payload.proposalId);
  if (!proposalId) return invalid('Proposal id is required.');
  const approvalMarker = readString(payload.approvalMarker);
  if (!approvalMarker) return invalid('Explicit approval marker is required.');
  if (!logicalId(payload.suiteId) || !logicalId(payload.runId) || !logicalId(payload.testCaseId) || !logicalId(payload.assertionId)
    || !Number.isInteger(payload.attempt) || (payload.attempt as number) < 1 || (payload.attempt as number) > 20
    || 'proposedChange' in payload || 'affectedProjectFiles' in payload || 'targetPrecondition' in payload) return invalid('Select one saved failure without supplying file changes.');
  return { status: 'ok', command: { projectRoot, proposalId, approvalMarker, suiteId: payload.suiteId, runId: payload.runId,
    testCaseId: payload.testCaseId, attempt: payload.attempt as number, assertionId: payload.assertionId } };
}

function invalid(message: string): ApplyApprovedEvalRepairParseResult { return { status: 'invalid', message }; }
function readString(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export { APPLY_APPROVED_REPAIR_MARKER };
