import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEstimate } from './estimate-validation.js';
const valid = { targetCalls: 2, judgeCalls: 1, totalCalls: 3, cost: { status: 'available', amount: 0.02, currency: 'USD' } };
test('accepts safe estimates and normalizes unavailable reasons', () => {
  assert.equal(validateEstimate(valid, []).status, 'ready');
  const unavailable = validateEstimate({ ...valid, cost: { status: 'unavailable', reason: 'Provider pricing unavailable.' } }, []);
  assert.deepEqual(unavailable, { status: 'ready', value: { targetCalls: 2, judgeCalls: 1, totalCalls: 3, cost: { status: 'unavailable', reason: 'Provider pricing unavailable.' } } });
});
test('blocks contradictory, unsafe, overflow and secret-bearing estimates', () => {
  for (const value of [
    { ...valid, totalCalls: 2 }, { ...valid, targetCalls: -1 }, { ...valid, judgeCalls: 1.5 },
    { ...valid, targetCalls: Number.MAX_SAFE_INTEGER, totalCalls: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, cost: { status: 'available', amount: Infinity, currency: 'USD' } },
    { ...valid, cost: { status: 'available', amount: -1, currency: 'USD' } },
    { ...valid, cost: { status: 'available', amount: 1, currency: 'secret' } },
    { ...valid, cost: { status: 'unavailable', reason: '' } },
    { ...valid, cost: { status: 'unavailable', reason: 'secret-123' } },
  ]) assert.equal(validateEstimate(value, ['secret-123']).status, 'blocked');
});
