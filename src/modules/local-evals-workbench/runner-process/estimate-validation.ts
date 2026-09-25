import type { RuntimeOutcome } from '../runtime-description.js';
import type { ConsumptionEstimate } from '../runtime-estimate.js';
export type { ConsumptionEstimate } from '../runtime-estimate.js';
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function count(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
export function validateEstimate(data: unknown, secrets: readonly string[]): RuntimeOutcome<ConsumptionEstimate> {
  if (!record(data) || !count(data.targetCalls) || !count(data.judgeCalls) || !count(data.totalCalls)
    || data.totalCalls !== data.targetCalls + data.judgeCalls || !record(data.cost))
    return { status: 'blocked', reason: 'estimate-invalid' };
  const cost = data.cost;
  if (cost.status === 'available') {
    if (typeof cost.amount !== 'number' || !Number.isFinite(cost.amount) || cost.amount < 0
      || typeof cost.currency !== 'string' || !/^[A-Z]{3}$/.test(cost.currency))
      return { status: 'blocked', reason: 'estimate-invalid' };
    if (secrets.some((secret) => JSON.stringify(data).includes(secret))) return { status: 'blocked', reason: 'estimate-invalid' };
    return { status: 'ready', value: { targetCalls: data.targetCalls, judgeCalls: data.judgeCalls, totalCalls: data.totalCalls, cost: { status: 'available', amount: cost.amount, currency: cost.currency } } };
  }
  if (cost.status !== 'unavailable' || typeof cost.reason !== 'string' || !/^[\x20-\x7e]{1,160}$/.test(cost.reason)
    ) return { status: 'blocked', reason: 'estimate-invalid' };
  const rawReason = cost.reason;
  if (secrets.some((secret) => rawReason.includes(secret))) return { status: 'blocked', reason: 'estimate-invalid' };
  const reason = /pricing/i.test(rawReason) ? 'Provider pricing unavailable.' : 'Cost estimation unavailable.';
  return { status: 'ready', value: { targetCalls: data.targetCalls, judgeCalls: data.judgeCalls, totalCalls: data.totalCalls, cost: { status: 'unavailable', reason } } };
}
