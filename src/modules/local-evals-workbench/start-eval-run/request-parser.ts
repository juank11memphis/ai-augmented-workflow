import type { StartEvalRunCommand } from './command.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(value).every(key => allowed.includes(key));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export function parseStartRequest(value: unknown): StartEvalRunCommand | undefined {
  if (!object(value) || !keys(value, ['suiteId', 'scope', 'model', 'judgeModel', 'repeats', 'review'])
    || typeof value.suiteId !== 'string' || !ID.test(value.suiteId)
    || typeof value.model !== 'string' || !ID.test(value.model)
    || value.judgeModel !== null && value.judgeModel !== undefined
    || value.repeats !== 1 || !object(value.scope) || !object(value.review)) return undefined;
  const scope = value.scope;
  if (!(scope.type === 'all' && keys(scope, ['type'])
    || scope.type === 'test_case' && keys(scope, ['type', 'testCaseId']) && typeof scope.testCaseId === 'string' && ID.test(scope.testCaseId))) return undefined;
  const review = value.review;
  if (!keys(review, ['selectedCaseIds', 'targetCalls', 'judgeCalls', 'totalCalls', 'cost'])
    || !Array.isArray(review.selectedCaseIds) || review.selectedCaseIds.length < 1 || review.selectedCaseIds.length > 100
    || !review.selectedCaseIds.every(id => typeof id === 'string' && ID.test(id))
    || !count(review.targetCalls) || !count(review.judgeCalls) || !count(review.totalCalls)
    || review.totalCalls !== review.targetCalls + review.judgeCalls || !object(review.cost)) return undefined;
  const cost = review.cost;
  if (!(cost.status === 'available' && keys(cost, ['status', 'amount', 'currency']) && typeof cost.amount === 'number'
    && Number.isFinite(cost.amount) && cost.amount >= 0 && typeof cost.currency === 'string' && /^[A-Z]{3}$/.test(cost.currency)
    || cost.status === 'unavailable' && keys(cost, ['status', 'reason']) && typeof cost.reason === 'string' && cost.reason.length <= 160)) return undefined;
  return {
    suiteId: value.suiteId, model: value.model, judgeModel: null, repeats: 1,
    scope: scope.type === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: scope.testCaseId as string },
    review: { selectedCaseIds: review.selectedCaseIds as string[], targetCalls: review.targetCalls,
      judgeCalls: review.judgeCalls, totalCalls: review.totalCalls, cost: cost as StartEvalRunCommand['review']['cost'] },
  };
}
