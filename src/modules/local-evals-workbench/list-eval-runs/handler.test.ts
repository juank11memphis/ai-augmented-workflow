import assert from 'node:assert/strict';
import { it } from 'node:test';
import { listEvalRuns } from './handler.js';
it('bounds requests before invoking the reader and masks infrastructure failures', async () => {
  let calls = 0;
  const dependencies = { reader: { async list() { calls++; throw new Error('SECRET'); }, async get() { throw new Error(); } }, logger: { emit() {} } };
  for (const command of [{ suiteId: '../x' }, { suiteId: 'suite', limit: 51 }, { suiteId: 'suite', limit: 0 }]) assert.equal((await listEvalRuns(command, dependencies)).status, 'blocked');
  assert.equal(calls, 0); assert.deepEqual(await listEvalRuns({ suiteId: 'suite' }, dependencies), { status: 'blocked', reason: 'unavailable' });
});
