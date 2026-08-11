import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeFailedAssertion, type AnalyzeFailedAssertionDependencies } from './handler.js';
import type { AnalyzeFailedAssertionCommand } from './command.js';
import type { AnalyzeFailedAssertionLogEvent, FailureAnalysisLlmPort } from './ports.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';

const command: AnalyzeFailedAssertionCommand = { projectRoot: '/repo', suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1' };

describe('analyzeFailedAssertion', () => {
  it('returns ready analysis with available credentials and active assertion evidence only', async () => {
    const llmCalls: Parameters<FailureAnalysisLlmPort['analyzeFailure']>[0][] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ llmCalls }));

    assert.equal(result.status, 'analysis-ready');
    assert.equal(llmCalls.length, 1);
    assert.equal(llmCalls[0]?.model, 'gpt-5-mini');
    assert.equal(llmCalls[0]?.evidence.assertionId, 'a1');
    assert.match(llmCalls[0]?.evidence.actualOutputPreview ?? '', /bad active output/);
    assert.doesNotMatch(JSON.stringify(llmCalls[0]?.evidence), /other failed output/);
  });

  it('returns unavailable without calling LLM when credentials are missing', async () => {
    const llmCalls: unknown[] = [];
    const result = await analyzeFailedAssertion(command, dependencies({ hasKey: false, llmCalls }));

    assert.equal(result.status, 'analysis-unavailable');
    assert.equal(llmCalls.length, 0);
    assert.match(JSON.stringify(result), /OPENAI_API_KEY/);
  });

  it('uses selected assistance model and default fallback', async () => {
    const overrideCalls: Parameters<FailureAnalysisLlmPort['analyzeFailure']>[0][] = [];
    await analyzeFailedAssertion(command, dependencies({ model: 'custom-analysis-model', llmCalls: overrideCalls }));
    assert.equal(overrideCalls[0]?.model, 'custom-analysis-model');

    const defaultCalls: Parameters<FailureAnalysisLlmPort['analyzeFailure']>[0][] = [];
    await analyzeFailedAssertion(command, dependencies({ model: 'gpt-5-mini', llmCalls: defaultCalls }));
    assert.equal(defaultCalls[0]?.model, 'gpt-5-mini');
  });

  it('returns safe error when LLM fails', async () => {
    const result = await analyzeFailedAssertion(command, dependencies({ llmThrows: true }));
    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'llm-failure');
  });

  it('blocks missing artifact, missing cell, missing assertion, non-failed assertion, and invalid scope', async () => {
    assert.equal((await analyzeFailedAssertion(command, dependencies({ artifact: undefined }))).status, 'blocked');
    assert.equal((await analyzeFailedAssertion(command, dependencies({ artifact: artifact({ omitCell: true }) }))).status, 'blocked');
    assert.equal((await analyzeFailedAssertion({ ...command, assertionId: 'missing' }, dependencies())).status, 'blocked');
    assert.equal((await analyzeFailedAssertion({ ...command, assertionId: 'passed' }, dependencies())).status, 'blocked');
    assert.equal((await analyzeFailedAssertion({ ...command, runScope: { type: 'test_case', testCaseId: 'case-2' } }, dependencies())).status, 'blocked');
  });

  it('logs only safe metadata', async () => {
    const events: AnalyzeFailedAssertionLogEvent[] = [];
    await analyzeFailedAssertion(command, dependencies({ events, model: 'safe-model-label' }));

    const serialized = JSON.stringify(events);
    assert.match(serialized, /failure_analysis_requested/);
    assert.match(serialized, /safe-model-label/);
    assert.doesNotMatch(serialized, /openai-secret|bad active output|prompt|full model response|raw eval output|\/repo/);
  });
});

function dependencies(options: { readonly hasKey?: boolean; readonly model?: string; readonly llmThrows?: boolean; readonly llmCalls?: unknown[]; readonly artifact?: StoredRunArtifact; readonly events?: AnalyzeFailedAssertionLogEvent[] } = {}): AnalyzeFailedAssertionDependencies {
  return {
    artifactReader: { getRunArtifact: () => options.artifact === undefined && 'artifact' in options ? undefined : options.artifact ?? artifact() },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: options.model ?? 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'openai-secret' }) },
    llm: { analyzeFailure: async (request) => { options.llmCalls?.push(request); if (options.llmThrows) throw new Error('full model response raw eval output'); return { exactFailureExplanation: 'The active assertion failed.', likelyCause: 'prompt_issue', evidenceSummary: 'The output skipped the required stop.', uncertainty: 'Low uncertainty.' }; } },
    logger: { info: (event) => options.events?.push(event), warn: (event) => options.events?.push(event), error: (event) => options.events?.push(event) },
    clock: () => 100,
  };
}

function artifact(options: { readonly omitCell?: boolean } = {}): StoredRunArtifact {
  return {
    suiteId: 'suite',
    modelId: 'gpt-5-mini',
    scope: 'all',
    matrix: {
      suiteId: 'suite', suiteName: 'Suite', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [],
      rows: [{ testCaseId: 'case-1', name: 'Case 1', status: 'failed', cells: options.omitCell ? [] : [{ testCaseId: 'case-1', modelId: 'gpt-5-mini', modelLabel: 'GPT-5 mini', status: 'failed', outputPreview: 'cell output', durationMs: 10, diagnostics: [], metrics: [], artifacts: [], assertions: [
        { id: 'a1', label: 'Active assertion', kind: 'assertion', status: 'failed', message: 'Failed active', expectedPreview: 'expected active', actualPreview: 'bad active output', diagnostics: [], metrics: [], artifacts: [] },
        { id: 'a2', label: 'Other assertion', kind: 'assertion', status: 'failed', message: 'Other failed', expectedPreview: 'expected other', actualPreview: 'other failed output', diagnostics: [], metrics: [], artifacts: [] },
        { id: 'passed', label: 'Passed assertion', kind: 'assertion', status: 'passed', metrics: [], diagnostics: [], artifacts: [] },
      ] }] }],
    },
  };
}
