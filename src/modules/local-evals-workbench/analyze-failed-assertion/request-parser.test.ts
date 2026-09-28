import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseAnalyzeFailedAssertionRequest } from './request-parser.js';

describe('parseAnalyzeFailedAssertionRequest', () => {
  it('parses one active failed assertion request', () => {
    const parsed = parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', runId: 'run-1', attempt: 1, testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', runScope: { type: 'test_case', testCaseId: 'case-1' }, assertionId: 'a1' });
    assert.equal(parsed.status, 'valid');
    if (parsed.status === 'valid') assert.equal(parsed.command.assertionId, 'a1');
  });
  it('accepts persisted provider model identities', () => {
    const payload = { suiteId: 'suite', runId: 'run-1', attempt: 1, testCaseId: 'case-1',
      evalRunModelId: 'provider:' + 'model/'.repeat(22), runScope: { type: 'all' }, assertionId: 'a1' };
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', payload).status, 'valid');
  });

  it('rejects missing and wrong primitive fields', () => {
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', {}).status, 'invalid');
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 42, runScope: { type: 'all' }, assertionId: 'a1' }).status, 'invalid');
  });

  it('rejects unsupported or mismatched scope', () => {
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'model', runScope: { type: 'suite' }, assertionId: 'a1' }).status, 'invalid');
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'model', runScope: { type: 'test_case', testCaseId: 'case-2' }, assertionId: 'a1' }).status, 'invalid');
  });

  it('rejects attempted multi-assertion payloads', () => {
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'model', runScope: { type: 'all' }, assertionIds: ['a1', 'a2'], assertionId: 'a1' }).status, 'invalid');
    assert.equal(parseAnalyzeFailedAssertionRequest('/repo', { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: ['a1'] }).status, 'invalid');
  });
  it('keeps the server project root and rejects invalid durable identity', () => {
    const valid = { suiteId: 'suite', runId: 'run', attempt: 2, testCaseId: 'case',
      evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: 'failed' };
    const parsed = parseAnalyzeFailedAssertionRequest('/server-root', { ...valid, projectRoot: '/attacker-root' });
    assert.equal(parsed.status, 'valid');
    if (parsed.status === 'valid') assert.equal(parsed.command.projectRoot, '/server-root');
    for (const change of [{ attempt: 0 }, { attempt: 21 }, { attempt: 1.5 }, { runId: '../run' },
      { assertionId: ['failed'] }, { evalRunModelId: 'bad model' }]) {
      assert.equal(parseAnalyzeFailedAssertionRequest('/server-root', { ...valid, ...change }).status, 'invalid');
    }
  });
});
