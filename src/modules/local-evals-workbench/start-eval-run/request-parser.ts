import type { StartEvalRunCommand } from './command.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(value).every(key => allowed.includes(key));
export function parseStartRequest(value: unknown): StartEvalRunCommand | undefined {
  if (!object(value) || !keys(value, ['suiteId', 'scope', 'model', 'judgeModel'])
    || typeof value.suiteId !== 'string' || !ID.test(value.suiteId)
    || typeof value.model !== 'string' || !ID.test(value.model)
    || value.judgeModel !== null && value.judgeModel !== undefined && (typeof value.judgeModel !== 'string' || !ID.test(value.judgeModel))
    || !object(value.scope)) return undefined;
  const scope = value.scope;
  if (!(scope.type === 'all' && keys(scope, ['type'])
    || scope.type === 'test_case' && keys(scope, ['type', 'testCaseId']) && typeof scope.testCaseId === 'string' && ID.test(scope.testCaseId))) return undefined;
  return {
    suiteId: value.suiteId, model: value.model, judgeModel: (value.judgeModel as string | null | undefined) ?? null,
    scope: scope.type === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: scope.testCaseId as string },
  };
}
