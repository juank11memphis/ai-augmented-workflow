import type { DraftEvalRepairProposalCommand, DraftEvalRepairProposalRunScope, DraftProposalPriorAnalysis, RepairDirection } from './command.js';
import { logicalId } from '../run-history/validation.js';
import { supportedModelId } from '../repair-context/model-id.js';

export type ParseDraftEvalRepairProposalRequestResult =
  | { readonly status: 'valid'; readonly command: DraftEvalRepairProposalCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseDraftEvalRepairProposalRequest(projectRoot: string, payload: unknown): ParseDraftEvalRepairProposalRequestResult {
  if (!isRecord(payload)) return invalid('Request payload must be an object.');
  if (!logicalId(payload.suiteId)) return invalid('suiteId is required.');
  if (!logicalId(payload.runId)) return invalid('runId is required.');
  if (!Number.isInteger(payload.attempt) || (payload.attempt as number) < 1 || (payload.attempt as number) > 20) return invalid('attempt must be 1 through 20.');
  if (!logicalId(payload.testCaseId)) return invalid('testCaseId is required.');
  if (!supportedModelId(payload.evalRunModelId)) return invalid('evalRunModelId is required.');
  if (!logicalId(payload.assertionId)) return invalid('assertionId is required.');
  if (!logicalId(payload.analysisId) || 'priorAnalysis' in payload) return invalid('A current server-issued analysis is required.');
  if ('assertionIds' in payload || Array.isArray(payload.assertionId)) return invalid('Draft a proposal for exactly one active failed assertion.');

  const runScope = parseScope(payload.runScope, payload.testCaseId);
  if (!runScope) return invalid('runScope must be all or the active test_case.');
  const repairDirection = parseRepairDirection(payload.repairDirection);
  if (!repairDirection) return invalid('Repair direction must be concrete and scoped to this failed assertion.');
  return { status: 'valid', command: { projectRoot, suiteId: payload.suiteId, runId: payload.runId, attempt: payload.attempt as number, testCaseId: payload.testCaseId, evalRunModelId: payload.evalRunModelId, runScope, assertionId: payload.assertionId, analysisId: payload.analysisId, repairDirection } };
}

function parseScope(value: unknown, activeTestCaseId: string): DraftEvalRepairProposalRunScope | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'all') return { type: 'all' };
  if (value.type === 'test_case' && value.testCaseId === activeTestCaseId) return { type: 'test_case', testCaseId: activeTestCaseId };
  return null;
}

function parseRepairDirection(value: unknown): RepairDirection | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'prompt_issue' || value.type === 'eval_assertion_issue' || value.type === 'fixture_input_issue' || value.type === 'regression_case') return { type: value.type };
  if (value.type === 'custom' && isConcreteInstruction(value.instruction) && value.instruction.length <= 1000) return { type: 'custom', instruction: value.instruction.trim() };
  return null;
}

export function isConcreteInstruction(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  if (text.length < 12) return false;
  return !['fix all', 'fix everything', 'make it pass', 'fix failures', 'do whatever', 'repair all'].some((phrase) => text.includes(phrase));
}


function invalid(message: string): ParseDraftEvalRepairProposalRequestResult { return { status: 'invalid', message }; }
function isString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
