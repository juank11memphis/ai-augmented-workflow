import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchOpenAiFailureAnalysisClient, OpenAiFailureAnalysisAdapter, type OpenAiFailureAnalysisClient } from './openai-failure-analysis-adapter.js';
import { EnvironmentAssistanceConfig } from './assistance-config.js';
import type { FailedAssertionEvidence } from './evidence.js';
import { FailureAnalysisProviderError, type FailureAnalysisProviderCategory } from './ports.js';

const privateMarkers = ['synthetic-key', 'synthetic-prompt', 'synthetic-output', 'synthetic-body'];

describe('OpenAiFailureAnalysisAdapter', () => {
  it('parses valid fake LLM analysis', async () => {
    const calls: { model: string; input: string; apiKey: string }[] = [];
    const adapter = new OpenAiFailureAnalysisAdapter('secret-key', fakeClient(calls, JSON.stringify({ exactFailureExplanation: 'Output skipped the stop rule.', likelyCause: 'prompt_issue', suggestedFix: 'Add an explicit stop rule to the target prompt.', evidenceSummary: 'The active output continued.', uncertainty: 'Low.' })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() });

    assert.equal(result.likelyCause, 'prompt_issue');
    assert.equal(result.exactFailureExplanation, 'Output skipped the stop rule.');
    assert.equal(result.suggestedFix, 'Add an explicit stop rule to the target prompt.');
    assert.equal(calls[0]?.model, 'analysis-model');
    assert.match(calls[0]?.input ?? '', /bad active output/);
    assert.equal(calls[0]?.apiKey, 'secret-key');
    assert.doesNotMatch(calls[0]?.input ?? '', /secret-key/);
  });

  it('supports uncertain likely cause', async () => {
    const adapter = new OpenAiFailureAnalysisAdapter('secret', fakeClient([], JSON.stringify({ exactFailureExplanation: 'The expectation is ambiguous.', likelyCause: 'unclear_needs_human_judgment', suggestedFix: 'Decide whether answering from approved facts is allowed for this case.', evidenceSummary: 'Evidence conflicts.', uncertainty: 'High uncertainty.' })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() });
    assert.equal(result.likelyCause, 'unclear_needs_human_judgment');
    assert.match(result.uncertainty, /High/);
  });
  it('keeps selected synthetic credential-like evidence eligible and provider configuration separate', async () => {
    const calls: { model: string; input: string; apiKey: string }[] = [];
    const adapter = new OpenAiFailureAnalysisAdapter('provider-auth-only', fakeClient(calls, JSON.stringify({
      exactFailureExplanation: 'Selected value OPENAI_API_KEY=synthetic', likelyCause: 'unclear_needs_human_judgment',
      suggestedFix: 'Decide which source defines the expected response.', evidenceSummary: 'Bearer synthetic-trace', uncertainty: 'The evidence may be incomplete.',
    })));
    const result = await adapter.analyzeFailure({ model: 'analysis-model', evidence: {
      ...evidence(), actualOutputPreview: 'OPENAI_API_KEY=synthetic',
      artifacts: [{ id: 'trace', label: 'Tool verify', kind: 'trace', preview: 'Bearer synthetic-trace' }],
    } });
    assert.match(calls[0]?.input ?? '', /OPENAI_API_KEY=synthetic|Bearer synthetic-trace/);
    assert.doesNotMatch(calls[0]?.input ?? '', /provider-auth-only/);
    assert.match(result.exactFailureExplanation, /OPENAI_API_KEY=synthetic/);
  });

  it('classifies an unrecognized client rejection as unknown without exposing its message', async () => {
    const adapter = new OpenAiFailureAnalysisAdapter('synthetic-key', { createResponse: async () => {
      throw new Error(privateMarkers.join(' '));
    } });
    await assertProviderFailure(() => adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() }), 'unknown');
  });

  it('does not infer a provider category from a project-runner exit message', async () => {
    const adapter = new OpenAiFailureAnalysisAdapter('synthetic-key', { createResponse: async () => {
      throw new Error('project runner exited 1: synthetic-body');
    } });
    await assertProviderFailure(() => adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() }), 'unknown');
  });

  it('classifies malformed, invalid-shape, and oversized analysis output as invalid response', async () => {
    for (const output of ['synthetic-output not-json', '', JSON.stringify({ likelyCause: 'prompt_issue' }),
      JSON.stringify({ exactFailureExplanation: 'Failure', likelyCause: 'invented', evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      JSON.stringify({ exactFailureExplanation: 'Failure', likelyCause: 'prompt_issue', evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      JSON.stringify({ exactFailureExplanation: 'X'.repeat(1_201), likelyCause: 'prompt_issue', suggestedFix: 'Fix prompt.', evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      JSON.stringify({ exactFailureExplanation: 'Failure', likelyCause: 'prompt_issue', suggestedFix: 'X'.repeat(401), evidenceSummary: 'Evidence', uncertainty: 'Low' }),
      'x'.repeat(8_001)]) {
      await assertProviderFailure(() => new OpenAiFailureAnalysisAdapter('synthetic-key', fakeClient([], output))
        .analyzeFailure({ model: 'analysis-model', evidence: evidence() }), 'invalid-response');
    }
  });
  it('times out a stalled fake provider without retrying', async () => {
    let calls = 0;
    const adapter = new OpenAiFailureAnalysisAdapter('synthetic-auth', { createResponse: async () => {
      calls++;
      return new Promise(() => undefined);
    } }, 5);
    await assertProviderFailure(() => adapter.analyzeFailure({ model: 'analysis-model', evidence: evidence() }), 'timeout');
    assert.equal(calls, 1);
  });

  it('classifies observed HTTP authorization, rate limit, unavailability, and other statuses before reading the body', async () => {
    for (const [status, category] of [[401, 'authorization'], [403, 'authorization'], [429, 'rate-limit'],
      [500, 'unavailable'], [503, 'unavailable'], [400, 'unknown']] as const) {
      const response = new Response('synthetic-body', { status });
      Object.defineProperty(response, 'body', { get: () => { throw new Error('synthetic-body was read'); } });
      const client = new FetchOpenAiFailureAnalysisClient('synthetic-key', async () => response);
      await assertProviderFailure(() => client.createResponse({ model: 'analysis-model', input: 'synthetic-prompt' }), category);
    }
  });

  it('classifies observed fetch timeout, network unavailability, and unclassified transport failures', async () => {
    for (const [rejection, category] of [[new DOMException('synthetic-body', 'TimeoutError'), 'timeout'],
      [new TypeError('synthetic-body'), 'unavailable'], [new Error('synthetic-body'), 'unknown']] as const) {
      const client = new FetchOpenAiFailureAnalysisClient('synthetic-key', async () => { throw rejection; });
      await assertProviderFailure(() => client.createResponse({ model: 'analysis-model', input: 'synthetic-prompt' }), category);
    }
  });

  it('classifies malformed, missing-text, and oversized HTTP responses as invalid response', async () => {
    for (const body of ['synthetic-body not-json', '{}', JSON.stringify({ output_text: 123 }),
      JSON.stringify({ output: [{ content: [{ text: 123 }] }] }), 'x'.repeat(16_001)]) {
      const client = new FetchOpenAiFailureAnalysisClient('synthetic-key', async () => new Response(body, { status: 200 }));
      await assertProviderFailure(() => client.createResponse({ model: 'analysis-model', input: 'synthetic-prompt' }), 'invalid-response');
    }
  });

  it('bounds the HTTP body and keeps authentication outside the prompt', async () => {
    const requests: RequestInit[] = [];
    const client = new FetchOpenAiFailureAnalysisClient('synthetic-key', async (_url, init) => {
      requests.push(init ?? {});
      return new Response('x'.repeat(16_001), { status: 200 });
    });
    await assertProviderFailure(() => client.createResponse({ model: 'analysis-model', input: 'synthetic-prompt' }), 'invalid-response');
    assert.equal((requests[0]?.headers as Record<string, string>).authorization, 'Bearer synthetic-key');
    assert.doesNotMatch(String(requests[0]?.body), /synthetic-key/);
    assert.ok(requests[0]?.signal);
  });

  it('uses selected model override and default fallback from environment config', () => {
    assert.equal(new EnvironmentAssistanceConfig({ OPENAI_API_KEY: 'secret', SIBU_EVALS_MODEL: 'custom-model' }).getConfig().assistanceModelLabel, 'custom-model');
    assert.equal(new EnvironmentAssistanceConfig({ OPENAI_API_KEY: 'secret' }).getConfig().assistanceModelLabel, 'gpt-5-mini');
  });
});

async function assertProviderFailure(operation: () => Promise<unknown>, category: FailureAnalysisProviderCategory): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof FailureAnalysisProviderError);
    assert.equal(error.category, category);
    const exposed = `${String(error)} ${JSON.stringify(error)}`;
    for (const marker of privateMarkers) assert.doesNotMatch(exposed, new RegExp(marker));
    assert.deepEqual(Object.keys(error), ['category', 'name']);
    return true;
  });
}

function fakeClient(calls: { model: string; input: string; apiKey: string }[], outputText: string): OpenAiFailureAnalysisClient {
  return { createResponse: async (request) => { calls.push(request); return { outputText }; } };
}

function evidence(): FailedAssertionEvidence {
  return { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'GPT-5 mini', assertionId: 'a1', assertionLabel: 'Must stop first', assertionKind: 'assertion', assertionMessage: 'Failed.', actualOutputPreview: 'bad active output', expectedPreview: 'expected', cellOutputPreview: 'cell output', diagnostics: [], artifacts: [] };
}
