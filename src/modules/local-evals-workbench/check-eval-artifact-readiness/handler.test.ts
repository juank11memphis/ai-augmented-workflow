import assert from 'node:assert/strict';
import { it } from 'node:test';
import { checkEvalArtifactReadiness } from './handler.js';
it('uses injected safety and returns safe refusals', async () => {
  let calls = 0;
  const dependencies = { safety: { async check() { calls++; return { status: 'blocked' as const, reason: 'not-ignored' as const }; } }, logger: { emit() {} } };
  assert.equal((await checkEvalArtifactReadiness({ projectRoot: '' }, dependencies)).status, 'blocked'); assert.equal(calls, 0);
  assert.deepEqual(await checkEvalArtifactReadiness({ projectRoot: '/project' }, dependencies), { status: 'blocked', reason: 'not-ignored', guidance: 'Add a root exclusion for evals/artifacts/ to Git ignore rules, then retry.' });
});
