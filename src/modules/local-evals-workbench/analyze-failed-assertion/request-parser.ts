import type { AnalyzeFailedAssertionCommand, AnalyzeFailedAssertionRunScope } from './command.js';
import { logicalId } from '../run-history/validation.js';
import { supportedModelId } from '../repair-context/model-id.js';

export type ParseAnalyzeFailedAssertionRequestResult =
  | { readonly status: 'valid'; readonly command: AnalyzeFailedAssertionCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseAnalyzeFailedAssertionRequest(projectRoot: string, payload: unknown): ParseAnalyzeFailedAssertionRequestResult {
  if (!isRecord(payload)) return invalid('Request payload must be an object.');
  if (!logicalId(payload.suiteId)) return invalid('suiteId is required.');
  if (!logicalId(payload.runId)) return invalid('runId is required.');
  if (!Number.isInteger(payload.attempt) || (payload.attempt as number) < 1 || (payload.attempt as number) > 20) return invalid('attempt must be 1 through 20.');
  if (!logicalId(payload.testCaseId)) return invalid('testCaseId is required.');
  if (!supportedModelId(payload.evalRunModelId)) return invalid('evalRunModelId is required.');
  if (!logicalId(payload.assertionId)) return invalid('assertionId is required.');
  if ('assertionIds' in payload || Array.isArray(payload.assertionId)) return invalid('Analyze exactly one active failed assertion.');

  const runScope = parseScope(payload.runScope, payload.testCaseId);
  if (!runScope) return invalid('runScope must be all or the active test_case.');

  return {
    status: 'valid',
    command: {
      projectRoot,
      suiteId: payload.suiteId,
      runId: payload.runId,
      attempt: payload.attempt as number,
      testCaseId: payload.testCaseId,
      evalRunModelId: payload.evalRunModelId,
      runScope,
      assertionId: payload.assertionId,
    },
  };
}

function parseScope(value: unknown, activeTestCaseId: string): AnalyzeFailedAssertionRunScope | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'all') return { type: 'all' };
  if (value.type === 'test_case' && value.testCaseId === activeTestCaseId) return { type: 'test_case', testCaseId: activeTestCaseId };
  return null;
}

function invalid(message: string): ParseAnalyzeFailedAssertionRequestResult {
  return { status: 'invalid', message };
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
