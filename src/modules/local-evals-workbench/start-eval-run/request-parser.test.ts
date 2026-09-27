import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStartRequest } from './request-parser.js';

const valid = { suiteId: 'suite', scope: { type: 'all' }, model: 'fake/model', judgeModel: null, repeats: 1,
  review: { selectedCaseIds: ['case'], targetCalls: 1, judgeCalls: 0, totalCalls: 1,
    cost: { status: 'unavailable', reason: 'Provider pricing unavailable.' } } };

test('start parser accepts one reviewed model and blocks browser-controlled execution fields', () => {
  assert.ok(parseStartRequest(valid));
  for (const field of ['command', 'environment', 'projectRoot', 'artifactPath']) {
    assert.equal(parseStartRequest({ ...valid, [field]: 'unsafe' }), undefined);
  }
  assert.equal(parseStartRequest({ ...valid, repeats: 2, judgeModel: 'judge' })?.repeats, 2);
  assert.equal(parseStartRequest({ ...valid, repeats: 21 }), undefined);
  assert.equal(parseStartRequest({ ...valid, judgeModel: '../escape' }), undefined);
  assert.equal(parseStartRequest({ ...valid, review: { ...valid.review, totalCalls: 2 } }), undefined);
  assert.equal(parseStartRequest({ ...valid, scope: { type: 'test_case', testCaseId: '../escape' } }), undefined);
});
