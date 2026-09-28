import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { APPLY_APPROVED_REPAIR_MARKER, parseApplyApprovedEvalRepairRequest } from './request-parser.js';

describe('parseApplyApprovedEvalRepairRequest', () => {
  it('narrows valid apply approval payloads', () => {
    const selection = { suiteId: 'suite', runId: 'run-1', testCaseId: 'case-1', attempt: 1, assertionId: 'a1' };
    const result = parseApplyApprovedEvalRepairRequest('/repo', { proposalId: ' repair_1 ', approvalMarker: APPLY_APPROVED_REPAIR_MARKER, ...selection });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.deepEqual(result.command, { projectRoot: '/repo', proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER, ...selection });
  });

  it('rejects missing proposal id or approval marker', () => {
    assert.equal(parseApplyApprovedEvalRepairRequest('/repo', {}).status, 'invalid');
    assert.equal(parseApplyApprovedEvalRepairRequest('/repo', { proposalId: 'repair_1' }).status, 'invalid');
    assert.equal(parseApplyApprovedEvalRepairRequest('/repo', null).status, 'invalid');
  });
});
