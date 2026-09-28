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
    assert.doesNotMatch(calls[0]?.input ?? '', /secret-key/);
  });

  it('supports uncertain likely cause', async () => {
    const adapter = new OpenAiFailureAnalysisAdapter('secret', fakeClient([], JSON.stringify({ exactFailureExplanation: 'The expectation is ambiguous.', likelyCause: 'unclear_needs_human_judgment', evidenceSummary: 'Evidence conflicts.', uncertainty: 'High uncertainty.' })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() });
    assert.equal(result.likelyCause, 'unclear_needs_human_judgment');
    assert.match(result.uncertainty, /High/);
  });
  it('keeps selected synthetic credential-like evidence eligible and provider configuration separate', async () => {
    const calls: { model: string; input: string; apiKey: string }[] = [];
    const adapter = new OpenAiFailureAnalysisAdapter('provider-auth-only', fakeClient(calls, JSON.stringify({
      exactFailureExplanation: 'Selected value OPENAI_API_KEY=synthetic', likelyCause: 'unclear_needs_human_judgment',
      evidenceSummary: 'Bearer synthetic-trace', uncertainty: 'The evidence may be incomplete.',
    })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: {
      ...evidence(), actualOutputPreview: 'OPENAI_API_KEY=synthetic',
      artifacts: [{ id: 'trace', label: 'Tool verify', kind: 'trace', preview: 'Bearer synthetic-trace' }],
    } });
    assert.match(calls[0]?.input ?? '', /OPENAI_API_KEY=synthetic|Bearer synthetic-trace/);
    assert.doesNotMatch(calls[0]?.input ?? '', /provider-auth-only/);
    assert.match(result.exactFailureExplanation, /OPENAI_API_KEY=synthetic/);
  });

  it('rejects missing required fields and provider failures', async () => {
    await assert.rejects(() => new OpenAiFailureAnalysisAdapter('secret', fakeClient([], JSON.stringify({ likelyCause: 'prompt_issue' }))).analyzeFailure({ model: 'analysis-model', evidence: evidence() }));
    await assert.rejects(() => new OpenAiFailureAnalysisAdapter('secret', { createResponse: async () => { throw new Error('provider rejection full response'); } }).analyzeFailure({ model: 'analysis-model', evidence: evidence() }));
  });
  it('rejects malformed, invalid-cause, and oversized provider output', async () => {
    for (const output of ['not-json', '', JSON.stringify({ exactFailureExplanation: 'Failure', likelyCause: 'invented', evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      JSON.stringify({ exactFailureExplanation: 'X'.repeat(1_201), likelyCause: 'prompt_issue', evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      'x'.repeat(8_001)]) {
      await assert.rejects(() => new OpenAiFailureAnalysisAdapter('secret', fakeClient([], output))
        .analyzeFailure({ model: 'analysis-model', evidence: evidence() }));
    }
  });
  it('times out a stalled fake provider without retrying', async () => {
    let calls = 0;
    const adapter = new OpenAiFailureAnalysisAdapter('synthetic-auth', { createResponse: async () => {
      calls++;
      return new Promise(() => undefined);
    } }, 5);
    await assert.rejects(() => adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() }), /timed out/);
    assert.equal(calls, 1);
  });
  it('bounds the HTTP body and keeps authentication outside the prompt', async () => {
    const requests: RequestInit[] = [];
    const client = new (await import('./openai-failure-analysis-adapter.js')).FetchOpenAiFailureAnalysisClient('secret-key', async (_url, init) => {
      requests.push(init ?? {});
      return new Response('x'.repeat(16_001), { status: 200 });
    });
    await assert.rejects(() => client.createResponse({ model: 'analysis-model', input: 'selected' }));
    assert.equal((requests[0]?.headers as Record<string, string>).authorization, 'Bearer secret-key');
    assert.doesNotMatch(String(requests[0]?.body), /secret-key/);
    assert.ok(requests[0]?.signal);
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
