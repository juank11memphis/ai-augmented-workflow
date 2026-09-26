import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGetRunRequest } from './request-parser.js';

test('status parser accepts summary or bounded logical selection only', () => {
  assert.deepEqual(parseGetRunRequest(new URL('http://localhost/status?suiteId=suite&runId=run')),
    { suiteId: 'suite', runId: 'run' });
  assert.deepEqual(parseGetRunRequest(new URL('http://localhost/status?suiteId=suite&runId=run&caseId=case&attempt=1&assertionId=check')),
    { suiteId: 'suite', runId: 'run', selection: { caseId: 'case', attempt: 1, assertionId: 'check' } });
  assert.equal(parseGetRunRequest(new URL('http://localhost/status?suiteId=suite&runId=run&path=/tmp/a')), undefined);
  assert.equal(parseGetRunRequest(new URL('http://localhost/status?suiteId=suite&runId=run&caseId=case&attempt=20')), undefined);
});
