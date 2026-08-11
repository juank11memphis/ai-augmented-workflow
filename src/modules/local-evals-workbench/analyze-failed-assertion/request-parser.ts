import type { AnalyzeFailedAssertionCommand, AnalyzeFailedAssertionRunScope } from './command.js';

export type ParseAnalyzeFailedAssertionRequestResult =
  | { readonly status: 'valid'; readonly command: AnalyzeFailedAssertionCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseAnalyzeFailedAssertionRequest(projectRoot: string, payload: unknown): ParseAnalyzeFailedAssertionRequestResult {
  if (!isRecord(payload)) return invalid('Request payload must be an object.');
  if (!isString(payload.suiteId)) return invalid('suiteId is required.');
  if (!isString(payload.testCaseId)) return invalid('testCaseId is required.');
  if (!isString(payload.evalRunModelId)) return invalid('evalRunModelId is required.');
  if (!isString(payload.assertionId)) return invalid('assertionId is required.');
  if ('assertionIds' in payload || Array.isArray(payload.assertionId)) return invalid('Analyze exactly one active failed assertion.');

  const runScope = parseScope(payload.runScope, payload.testCaseId);
  if (!runScope) return invalid('runScope must be all or the active test_case.');

  return {
    status: 'valid',
    command: {
      projectRoot,
      suiteId: payload.suiteId,
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
