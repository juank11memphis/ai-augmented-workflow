import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDescribeRequest } from './request-parser.js';
test('describe parser accepts only one safe suite ID', () => {
  assert.deepEqual(parseDescribeRequest({ suiteId: 'support-agent' }), { suiteId: 'support-agent' });
  for (const value of [null, [], { suiteId: '../secret' }, { suiteId: '' }, { suiteId: 'suite', command: ['node'] }, { suiteId: 1 }])
    assert.equal(parseDescribeRequest(value), undefined);
});
