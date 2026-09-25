import type { PreviewEvalRunCommand } from './command.js';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function parsePreviewRequest(value: unknown): PreviewEvalRunCommand | undefined {
  if (!record(value) || Object.keys(value).some((key) => !['suiteId', 'scope', 'model', 'judgeModel', 'repeats'].includes(key))) return undefined;
  if (typeof value.suiteId !== 'string' || !ID.test(value.suiteId) || typeof value.model !== 'string' || !ID.test(value.model)) return undefined;
  if (!record(value.scope)) return undefined;
  const scope = value.scope;
  if (scope.type === 'all' && Object.keys(scope).length !== 1) return undefined;
  if (scope.type === 'test_case' && (Object.keys(scope).some((key) => !['type', 'testCaseId'].includes(key)) || typeof scope.testCaseId !== 'string' || !ID.test(scope.testCaseId))) return undefined;
  if (scope.type !== 'all' && scope.type !== 'test_case') return undefined;
  if (value.judgeModel !== undefined && value.judgeModel !== null && (typeof value.judgeModel !== 'string' || !ID.test(value.judgeModel))) return undefined;
  if (value.repeats !== undefined && (typeof value.repeats !== 'number' || !Number.isFinite(value.repeats))) return undefined;
  return {
    suiteId: value.suiteId, model: value.model,
    scope: scope.type === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: scope.testCaseId as string },
    ...(value.judgeModel !== undefined ? { judgeModel: value.judgeModel as string | null } : {}),
    ...(value.repeats !== undefined ? { repeats: value.repeats as number } : {}),
  };
}
