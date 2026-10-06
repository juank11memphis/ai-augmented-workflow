import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStartRequest } from './request-parser.js';

const valid = { suiteId: 'suite', scope: { type: 'all' }, model: 'fake/model', judgeModel: null };

test('start parser accepts one selected model and blocks browser-controlled execution fields', () => {
  assert.ok(parseStartRequest(valid));
  for (const field of ['command', 'environment', 'projectRoot', 'artifactPath']) {
    assert.equal(parseStartRequest({ ...valid, [field]: 'unsafe' }), undefined);
  }
  assert.equal(parseStartRequest({ ...valid, judgeModel: 'judge' })?.judgeModel, 'judge');
  assert.equal(parseStartRequest({ ...valid, repeats: 21 }), undefined);
  assert.equal(parseStartRequest({ ...valid, judgeModel: '../escape' }), undefined);
  assert.equal(parseStartRequest({ ...valid, review: { selectedCaseIds: ['case'] } }), undefined);
  assert.equal(parseStartRequest({ ...valid, scope: { type: 'test_case', testCaseId: '../escape' } }), undefined);
});
