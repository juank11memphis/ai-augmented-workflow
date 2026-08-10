import type { RunLocalEvalSuiteCommand } from './command.js';

export type ParseEvalRunRequestResult =
  | { readonly status: 'ok'; readonly command: RunLocalEvalSuiteCommand }
  | { readonly status: 'invalid'; readonly message: string };

export function parseEvalRunRequest(projectRoot: string, body: unknown): ParseEvalRunRequestResult {
  if (!isRecord(body)) return invalid('Request body must be a JSON object.');

  const suiteId = nonBlank(body.suiteId);
  if (!suiteId) return invalid('suiteId is required.');

  const evalRunModel = nonBlank(body.evalRunModel);
  if (!evalRunModel) return invalid('evalRunModel is required.');

  const scope = parseScope(body.scope);
  if (scope.status === 'invalid') return scope;

  return {
    status: 'ok',
    command: { type: 'run-local-eval-suite', projectRoot, suiteId, evalRunModel, scope: scope.scope },
  };
}

type ParseScopeResult = { readonly status: 'ok'; readonly scope: RunLocalEvalSuiteCommand['scope'] } | { readonly status: 'invalid'; readonly message: string };

function parseScope(value: unknown): ParseScopeResult {
  if (!isRecord(value)) return invalidScope('scope must be an object.');
  if (value.type === 'all') return { status: 'ok', scope: { type: 'all' } };
  if (value.type !== 'test_case') return invalidScope('scope.type must be "all" or "test_case".');

  const testCaseId = nonBlank(value.testCaseId);
  if (!testCaseId) return invalidScope('scope.testCaseId is required for test_case scope.');

  return { status: 'ok', scope: { type: 'test_case', testCaseId } };
}

function invalid(message: string): ParseEvalRunRequestResult {
  return { status: 'invalid', message };
}

function invalidScope(message: string): ParseScopeResult {
  return { status: 'invalid', message };
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
