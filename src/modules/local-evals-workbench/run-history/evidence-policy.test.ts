import assert from 'node:assert/strict';
import { it } from 'node:test';
import { evidencePolicy, sanitize } from './evidence-policy.js';
import { attempt } from './validation.js';
import { evidence } from './test-fixtures.js';
import { LIMITS } from './limits.js';
it('fails closed without policy and redacts before inspecting nested content', () => {
  const raw = { ...evidence(), output: 'SECRET', turns: [{ id: 't', role: 'user', content: 'SECRET' }] };
  assert.equal(sanitize(raw, LIMITS.attemptBytes, attempt).status, 'blocked');
  const policy = evidencePolicy(['output', 'content'], v => !JSON.stringify(v).includes('SECRET'));
  const result = sanitize(raw, LIMITS.attemptBytes, attempt, policy); assert.equal(result.status, 'ok');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.equal(sanitize(raw, LIMITS.attemptBytes, attempt, evidencePolicy([], () => false)).status, 'blocked');
});
