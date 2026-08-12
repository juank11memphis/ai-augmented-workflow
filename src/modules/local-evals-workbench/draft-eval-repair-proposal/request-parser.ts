import type { DraftEvalRepairProposalCommand, DraftEvalRepairProposalRunScope, DraftProposalPriorAnalysis, RepairDirection } from './command.js';

export type ParseDraftEvalRepairProposalRequestResult =
  | { readonly status: 'valid'; readonly command: DraftEvalRepairProposalCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseDraftEvalRepairProposalRequest(projectRoot: string, payload: unknown): ParseDraftEvalRepairProposalRequestResult {
  if (!isRecord(payload)) return invalid('Request payload must be an object.');
  if (!isString(payload.suiteId)) return invalid('suiteId is required.');
  if (!isString(payload.testCaseId)) return invalid('testCaseId is required.');
  if (!isString(payload.evalRunModelId)) return invalid('evalRunModelId is required.');
  if (!isString(payload.assertionId)) return invalid('assertionId is required.');
  if ('assertionIds' in payload || Array.isArray(payload.assertionId)) return invalid('Draft a proposal for exactly one active failed assertion.');

  const runScope = parseScope(payload.runScope, payload.testCaseId);
  if (!runScope) return invalid('runScope must be all or the active test_case.');
  const repairDirection = parseRepairDirection(payload.repairDirection);
  if (!repairDirection) return invalid('Repair direction must be concrete and scoped to this failed assertion.');
  const priorAnalysis = parsePriorAnalysis(payload.priorAnalysis);

  return { status: 'valid', command: { projectRoot, suiteId: payload.suiteId, testCaseId: payload.testCaseId, evalRunModelId: payload.evalRunModelId, runScope, assertionId: payload.assertionId, repairDirection, ...(priorAnalysis ? { priorAnalysis } : {}) } };
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
  if (value.type === 'custom' && isConcreteInstruction(value.instruction)) return { type: 'custom', instruction: value.instruction.trim() };
  return null;
}

function parsePriorAnalysis(value: unknown): DraftProposalPriorAnalysis | undefined {
  if (!isRecord(value) || !isString(value.summary)) return undefined;
  const likelyCause = typeof value.likelyCause === 'string' && isLikelyCause(value.likelyCause) ? value.likelyCause : undefined;
  return { summary: value.summary.trim(), ...(likelyCause ? { likelyCause } : {}) };
}

export function isConcreteInstruction(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  if (text.length < 12) return false;
  return !['fix all', 'fix everything', 'make it pass', 'fix failures', 'do whatever', 'repair all'].some((phrase) => text.includes(phrase));
}

function isLikelyCause(value: string): value is NonNullable<DraftProposalPriorAnalysis['likelyCause']> {
  return value === 'prompt_issue' || value === 'eval_assertion_issue' || value === 'fixture_input_issue' || value === 'model_nondeterminism' || value === 'unclear_needs_human_judgment';
}

function invalid(message: string): ParseDraftEvalRepairProposalRequestResult { return { status: 'invalid', message }; }
function isString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
