import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseEvalRunRequest } from './request-parser.js';

describe('parseEvalRunRequest', () => {
  it('parses all-scope payloads', () => {
    const result = parseEvalRunRequest('/repo', { suiteId: 'suite', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.deepEqual(result.command.scope, { type: 'all' });
  });

  it('parses test-case-scope payloads', () => {
    const result = parseEvalRunRequest('/repo', { suiteId: 'suite', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'case-1' } });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.deepEqual(result.command.scope, { type: 'test_case', testCaseId: 'case-1' });
  });

  it('rejects malformed payloads', () => {
    assert.equal(parseEvalRunRequest('/repo', null).status, 'invalid');
    assert.equal(parseEvalRunRequest('/repo', { evalRunModel: 'model', scope: { type: 'all' } }).status, 'invalid');
    assert.equal(parseEvalRunRequest('/repo', { suiteId: 'suite', scope: { type: 'all' } }).status, 'invalid');
    assert.equal(parseEvalRunRequest('/repo', { suiteId: 'suite', evalRunModel: 'model', scope: { type: 'bad' } }).status, 'invalid');
    assert.equal(parseEvalRunRequest('/repo', { suiteId: 'suite', evalRunModel: 'model', scope: { type: 'test_case' } }).status, 'invalid');
  });
});
