import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OpenAiFailureAnalysisAdapter, type OpenAiFailureAnalysisClient } from './openai-failure-analysis-adapter.js';
import { EnvironmentAssistanceConfig } from './assistance-config.js';
import type { FailedAssertionEvidence } from './evidence.js';

describe('OpenAiFailureAnalysisAdapter', () => {
  it('parses valid fake LLM analysis', async () => {
    const calls: { model: string; input: string; apiKey: string }[] = [];
    const adapter = new OpenAiFailureAnalysisAdapter('secret-key', fakeClient(calls, JSON.stringify({ exactFailureExplanation: 'Output skipped the stop rule.', likelyCause: 'prompt_issue', evidenceSummary: 'The active output continued.', uncertainty: 'Low.' })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() });

    assert.equal(result.likelyCause, 'prompt_issue');
    assert.equal(result.exactFailureExplanation, 'Output skipped the stop rule.');
    assert.equal(calls[0]?.model, 'analysis-model');
    assert.match(calls[0]?.input ?? '', /bad active output/);
    assert.equal(calls[0]?.apiKey, 'secret-key');
  });

  it('supports uncertain likely cause', async () => {
    const adapter = new OpenAiFailureAnalysisAdapter('secret', fakeClient([], JSON.stringify({ exactFailureExplanation: 'The expectation is ambiguous.', likelyCause: 'unclear_needs_human_judgment', evidenceSummary: 'Evidence conflicts.', uncertainty: 'High uncertainty.' })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() });
    assert.equal(result.likelyCause, 'unclear_needs_human_judgment');
    assert.match(result.uncertainty, /High/);
  });

  it('rejects missing required fields and provider failures', async () => {
    await assert.rejects(() => new OpenAiFailureAnalysisAdapter('secret', fakeClient([], JSON.stringify({ likelyCause: 'prompt_issue' }))).analyzeFailure({ model: 'analysis-model', evidence: evidence() }));
    await assert.rejects(() => new OpenAiFailureAnalysisAdapter('secret', { createResponse: async () => { throw new Error('provider rejection full response'); } }).analyzeFailure({ model: 'analysis-model', evidence: evidence() }));
  });

  it('uses selected model override and default fallback from environment config', () => {
    assert.equal(new EnvironmentAssistanceConfig({ OPENAI_API_KEY: 'secret', SIBU_EVALS_MODEL: 'custom-model' }).getConfig().assistanceModelLabel, 'custom-model');
    assert.equal(new EnvironmentAssistanceConfig({ OPENAI_API_KEY: 'secret' }).getConfig().assistanceModelLabel, 'gpt-5-mini');
  });
});

function fakeClient(calls: { model: string; input: string; apiKey: string }[], outputText: string): OpenAiFailureAnalysisClient {
  return { createResponse: async (request) => { calls.push(request); return { outputText }; } };
}

function evidence(): FailedAssertionEvidence {
  return { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'GPT-5 mini', assertionId: 'a1', assertionLabel: 'Must stop first', assertionKind: 'assertion', assertionMessage: 'Failed.', actualOutputPreview: 'bad active output', expectedPreview: 'expected', cellOutputPreview: 'cell output', diagnostics: [], artifacts: [] };
}
