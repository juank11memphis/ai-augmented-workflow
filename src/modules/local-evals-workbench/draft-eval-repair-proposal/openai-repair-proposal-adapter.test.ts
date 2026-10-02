import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FetchOpenAiRepairProposalClient, OpenAiRepairProposalAdapter, parseRepairProposalDraft } from './openai-repair-proposal-adapter.js';
import { UnsafeRepairProposalTargetError } from './proposal-validation.js';
import type { OpenAiRepairProposalClient } from './openai-repair-proposal-adapter.js';
import { ProposalProviderFailure } from './ports.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';

const validJson = JSON.stringify({ affectedProjectFiles: ['prompts/skill.md'], changeSummary: 'Add a hard stop rule.', rationale: 'The active output skipped the expected refusal.', expectedEvalImpact: 'The selected assertion should pass.', proposedChange: { kind: 'replacement', representation: 'Add the rule.' } });
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
    for (const target of ['.env', '../PRIVATE_TARGET_CONTENT']) {
      assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), affectedProjectFiles: [target] })),
        (error: unknown) => error instanceof UnsafeRepairProposalTargetError && error.reason === 'unsafe-target-files' && !error.message.includes('PRIVATE_TARGET_CONTENT'));
    }
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), proposedChange: { kind: 'instructions', representation: 'Do something.' } })));
    assert.throws(() => parseRepairProposalDraft(JSON.stringify({ ...JSON.parse(validJson), affectedProjectFiles: ['prompts/skill.md', 'other.md'] })));
    assert.throws(() => parseRepairProposalDraft(' '.repeat(65 * 1024)));
    const client: OpenAiRepairProposalClient = { createResponse: async () => { throw new Error('provider rejected raw prompt secret'); } };
    await assert.rejects(new OpenAiRepairProposalAdapter('secret-key', client).draftProposal({ model: 'gpt-5-mini', evidence, repairDirection: { type: 'prompt_issue' }, projectFiles: [] }));
  });

  it('classifies only observed built-in provider statuses, without reading private response bodies', async () => {
    for (const [status, reason] of [[401, 'provider-authorization'], [403, 'provider-authorization'], [429, 'provider-rate-limit'], [408, 'provider-timeout'], [504, 'provider-timeout'], [503, 'provider-unavailable']] as const) {
      const fetchImpl: typeof fetch = async () => new Response('PRIVATE_PROVIDER_BODY', { status });
      await assert.rejects(new FetchOpenAiRepairProposalClient('PRIVATE_API_KEY', fetchImpl).createResponse({ model: 'test', input: 'PRIVATE_PROMPT' }),
        (error: unknown) => error instanceof ProposalProviderFailure && error.reason === reason && !JSON.stringify(error).includes('PRIVATE_'));
    }
    const unknownStatus: typeof fetch = async () => new Response('PRIVATE_PROVIDER_BODY', { status: 418 });
    await assert.rejects(new FetchOpenAiRepairProposalClient('PRIVATE_API_KEY', unknownStatus).createResponse({ model: 'test', input: 'PRIVATE_PROMPT' }),
      (error: unknown) => error instanceof Error && !(error instanceof ProposalProviderFailure) && !error.message.includes('PRIVATE_'));
  });

  it('separates observed timeout from unknown network failures', async () => {
    const network: typeof fetch = async () => { throw new Error('PRIVATE_NETWORK_DETAIL'); };
    await assert.rejects(new FetchOpenAiRepairProposalClient('PRIVATE_API_KEY', network).createResponse({ model: 'test', input: 'PRIVATE_PROMPT' }),
      (error: unknown) => error instanceof Error && !(error instanceof ProposalProviderFailure) && !error.message.includes('PRIVATE_'));
    const timeout: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('PRIVATE_ABORT_DETAIL')), { once: true });
    });
    const client = new FetchOpenAiRepairProposalClient('PRIVATE_API_KEY', timeout, 1);
    const pending = client.createResponse({ model: 'test', input: 'PRIVATE_PROMPT' });
    await assert.rejects(pending, (error: unknown) => error instanceof ProposalProviderFailure && error.reason === 'provider-timeout');
  });

  it('rejects malformed and oversized provider output with private content excluded', async () => {
    const cases = ['not-json PRIVATE_RESPONSE', JSON.stringify({ output: [] }), 'x'.repeat(129 * 1024)];
    for (const body of cases) {
      const fetchImpl: typeof fetch = async () => new Response(body);
      await assert.rejects(new FetchOpenAiRepairProposalClient('PRIVATE_API_KEY', fetchImpl).createResponse({ model: 'test', input: 'PRIVATE_PROMPT' }),
        (error: unknown) => error instanceof ProposalProviderFailure && error.reason === 'invalid-llm-response' && !JSON.stringify(error).includes('PRIVATE_'));
    }
    assert.throws(() => parseRepairProposalDraft('PRIVATE_RESPONSE'),
      (error: unknown) => error instanceof ProposalProviderFailure && error.reason === 'invalid-llm-response' && !JSON.stringify(error).includes('PRIVATE_'));
  });
});
