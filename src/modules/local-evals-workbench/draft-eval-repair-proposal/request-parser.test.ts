import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDraftEvalRepairProposalRequest } from './request-parser.js';

const base = { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1' };

describe('parseDraftEvalRepairProposalRequest', () => {
  for (const type of ['prompt_issue', 'eval_assertion_issue', 'fixture_input_issue', 'regression_case'] as const) {
    it(`accepts ${type} for one active assertion`, () => {
      const result = parseDraftEvalRepairProposalRequest('/repo', { ...base, repairDirection: { type } });
      assert.equal(result.status, 'valid');
      if (result.status === 'valid') assert.equal(result.command.repairDirection.type, type);
    });
  }

  it('accepts concrete custom direction and active test case scope', () => {
    const result = parseDraftEvalRepairProposalRequest('/repo', { ...base, runScope: { type: 'test_case', testCaseId: 'case-1' }, repairDirection: { type: 'custom', instruction: 'Update prompts/foo.md to require a hard stop.' }, priorAnalysis: { summary: 'Likely prompt issue.', likelyCause: 'prompt_issue' } });
    assert.equal(result.status, 'valid');
  });

  it('rejects missing fields, wrong primitives, unsupported scope, unclear direction, broad direction, and multi assertion payloads', () => {
    const invalids = [
      {},
      { ...base, suiteId: 1, repairDirection: { type: 'prompt_issue' } },
      { ...base, runScope: { type: 'test_case', testCaseId: 'other' }, repairDirection: { type: 'prompt_issue' } },
      { ...base, repairDirection: { type: 'custom', instruction: 'fix' } },
      { ...base, repairDirection: { type: 'custom', instruction: 'fix all failures please' } },
      { ...base, assertionIds: ['a1', 'a2'], repairDirection: { type: 'prompt_issue' } },
    ];
    for (const payload of invalids) assert.equal(parseDraftEvalRepairProposalRequest('/repo', payload).status, 'invalid');
  });
});
