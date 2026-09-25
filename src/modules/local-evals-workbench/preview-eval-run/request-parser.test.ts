import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePreviewRequest } from './request-parser.js';
test('preview parser accepts all or one case and rejects browser-owned infrastructure', () => {
  assert.deepEqual(parsePreviewRequest({ suiteId: 'suite', scope: { type: 'all' }, model: 'fake/model' }), { suiteId: 'suite', scope: { type: 'all' }, model: 'fake/model' });
  assert.deepEqual(parsePreviewRequest({ suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/model', judgeModel: 'fake/judge', repeats: 2 }),
    { suiteId: 'suite', scope: { type: 'test_case', testCaseId: 'case' }, model: 'fake/model', judgeModel: 'fake/judge', repeats: 2 });
  for (const extra of [{ command: ['sh'] }, { projectRoot: '/tmp' }, { environment: { SECRET: 'x' } }, { scope: { type: 'all', testCaseId: 'case' } }, { repeats: '2' }]) {
    assert.equal(parsePreviewRequest({ suiteId: 'suite', scope: { type: 'all' }, model: 'fake/model', ...extra }), undefined);
  }
});
