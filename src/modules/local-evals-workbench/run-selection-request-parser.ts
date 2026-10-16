import type { RunSetupCommand } from './run-configuration.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;
const TOKEN = /^[a-f0-9]{64}$/;
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

export function parseRunSelectionRequest(value: unknown, allowToken: boolean): RunSetupCommand | undefined {
  if (!object(value) || !keys(value, ['suiteId', 'scope', 'model', 'judgeModel', 'runOnly', ...(allowToken ? ['previewToken'] : [])])
    || typeof value.suiteId !== 'string' || !ID.test(value.suiteId) || !object(value.scope)) return undefined;
  const scope = value.scope;
  if (!(scope.type === 'all' && keys(scope, ['type'])
    || scope.type === 'test_case' && keys(scope, ['type', 'testCaseId']) && typeof scope.testCaseId === 'string' && ID.test(scope.testCaseId))) return undefined;
  if (value.model !== undefined && (typeof value.model !== 'string' || !MODEL.test(value.model))) return undefined;
  if (value.judgeModel !== undefined && value.judgeModel !== null
    && (typeof value.judgeModel !== 'string' || !MODEL.test(value.judgeModel))) return undefined;
  if (value.previewToken !== undefined && (!allowToken || typeof value.previewToken !== 'string' || !TOKEN.test(value.previewToken))) return undefined;
  if (value.runOnly !== undefined && (!object(value.runOnly) || !keys(value.runOnly, ['testedModel', 'judgeModel'])
    || Object.keys(value.runOnly).length === 0 || scope.type !== 'test_case'
    || Object.values(value.runOnly).some(model => typeof model !== 'string' || !MODEL.test(model)))) return undefined;
  return {
    suiteId: value.suiteId,
    scope: scope.type === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: scope.testCaseId as string },
    ...(value.model !== undefined ? { model: value.model as string } : {}),
    ...(value.judgeModel !== undefined ? { judgeModel: value.judgeModel as string | null } : {}),
    ...(value.runOnly !== undefined ? { runOnly: value.runOnly as RunSetupCommand['runOnly'] } : {}),
    ...(value.previewToken !== undefined ? { previewToken: value.previewToken as string } : {}),
  };
}
