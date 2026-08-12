import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OpenAiRepairProposalAdapter, parseRepairProposalDraft } from './openai-repair-proposal-adapter.js';
import type { OpenAiRepairProposalClient } from './openai-repair-proposal-adapter.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';

const validJson = JSON.stringify({ affectedProjectFiles: ['prompts/skill.md'], changeSummary: 'Add a hard stop rule.', rationale: 'The active output skipped the expected refusal.', expectedEvalImpact: 'The selected assertion should pass.', proposedChange: { kind: 'instructions', representation: 'Add the rule.' } });
const evidence: FailedAssertionEvidence = { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'GPT-5 mini', assertionId: 'a1', assertionLabel: 'Must stop', assertionKind: 'assertion', assertionMessage: 'Expected refusal.', actualOutputPreview: 'actual', expectedPreview: 'expected', cellOutputPreview: 'actual', diagnostics: [], artifacts: [] };

describe('OpenAiRepairProposalAdapter', () => {
  it('uses selected model and returns project-local proposal contracts', async () => {
    const calls: unknown[] = [];
    const client: OpenAiRepairProposalClient = { createResponse: async (request) => { calls.push(request); return { outputText: validJson }; } };
    const proposal = await new OpenAiRepairProposalAdapter('secret-key', client).draftProposal({ model: 'override-model', evidence, repairDirection: { type: 'prompt_issue' }, projectFiles: [] });
    assert.deepEqual(proposal.affectedProjectFiles, ['prompts/skill.md']);
    assert.match(JSON.stringify(calls), /override-model/);
    assert.doesNotMatch(JSON.stringify(proposal), /secret-key|output_text/);
  });

  it('rejects vague, missing fields, unavailable, and provider failures without inventing fields', async () => {
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ unavailableReason: 'unclear' })));
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), affectedProjectFiles: [] })));
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), expectedEvalImpact: '' })));
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), affectedProjectFiles: ['.env'] })));
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), affectedProjectFiles: ['../outside.md'] })));
    const client: OpenAiRepairProposalClient = { createResponse: async () => { throw new Error('provider rejected raw prompt secret'); } };
    await assert.rejects(new OpenAiRepairProposalAdapter('secret-key', client).draftProposal({ model: 'gpt-5-mini', evidence, repairDirection: { type: 'prompt_issue' }, projectFiles: [] }));
  });
});
