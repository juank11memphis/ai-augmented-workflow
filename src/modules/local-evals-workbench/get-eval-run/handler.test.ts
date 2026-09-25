import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getEvalRun } from './handler.js';
it('validates selection and preserves unavailable/corrupt outcomes', async () => {
  let calls = 0;
  const dependencies = { reader: { async list() { return { status: 'ok' as const, value: [] }; }, async get() { calls++; return { status: 'blocked' as const, reason: 'corrupt' as const }; } }, logger: { emit() {} } };
  assert.equal((await getEvalRun({ suiteId: 'suite', runId: 'run', selection: { caseId: 'case', attempt: 0 } }, dependencies)).status, 'blocked'); assert.equal(calls, 0);
  assert.deepEqual(await getEvalRun({ suiteId: 'suite', runId: 'run' }, dependencies), { status: 'blocked', reason: 'corrupt' });
});
