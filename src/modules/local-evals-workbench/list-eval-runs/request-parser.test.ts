import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseListRunRequest } from './request-parser.js';

it('accepts bounded suite history queries and rejects malformed or oversized requests', () => {
  assert.deepEqual(parseListRunRequest(new URL('http://localhost/api/eval-runs/history?suiteId=suite&limit=5')), { suiteId: 'suite', limit: 5 });
  for (const query of ['suiteId=../bad', 'suiteId=suite&limit=0', 'suiteId=suite&limit=51', 'suiteId=suite&limit=1&limit=2', 'suiteId=suite&extra=x']) {
    assert.equal(parseListRunRequest(new URL('http://localhost/api/eval-runs/history?' + query)), undefined);
  }
});
