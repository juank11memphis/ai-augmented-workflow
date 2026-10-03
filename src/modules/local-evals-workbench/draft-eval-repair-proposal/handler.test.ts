import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftEvalRepairProposal, type DraftEvalRepairProposalDependencies } from './handler.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import type { SelectedFailureRead } from '../repair-context/selected-evidence.js';
import { NodeSafeProjectFileReader } from './project-file-safety.js';
import { ProposalProviderFailure, type DraftRepairProposalLogEvent, type ProposalProviderFailureReason } from './ports.js';
import { UnsafeRepairProposalTargetError } from './proposal-validation.js';

const command: DraftEvalRepairProposalCommand = { projectRoot: '/repo', suiteId: 'suite', runId: 'run-1',
  testCaseId: 'case-1', attempt: 2, evalRunModelId: 'model', runScope: { type: 'all' }, assertionId: 'a1', analysisId: 'analysis-1',
  repairDirection: { type: 'prompt_issue' } };
const selected: SelectedFailureRead = { status: 'ready', value: {
  testedModel: 'model', judgeModel: null, repeats: 2, runScope: 'all',
  evidence: { suiteId: 'suite', runId: 'run-1', attempt: 2, testCaseId: 'case-1', evalRunModelId: 'model',
    evalRunModelLabel: 'model', assertionId: 'a1', assertionLabel: 'a1', assertionKind: 'assertion',
    assertionMessage: 'failed', actualOutputPreview: 'selected actual', expectedPreview: 'selected expected',
    cellOutputPreview: null, diagnostics: [], artifacts: [] },
} };

function dependencies(options: { selected?: SelectedFailureRead; targetFiles?: readonly string[]; calls?: unknown[]; changed?: boolean; change?: { kind: 'unified-diff' | 'replacement'; representation: string }; events?: DraftRepairProposalLogEvent[]; providerError?: Error; loggerThrows?: boolean; analysis?: null; missingKey?: boolean } = {}): DraftEvalRepairProposalDependencies {
  const state = { status: 'present' as const, path: 'prompts/agent.md', digest: options.changed ? 'changed' : 'first', content: 'before', preview: 'before' };
  return {
    artifactReader: { read: async selection => { options.calls?.push(selection); return options.selected ?? selected; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: !options.missingKey, assistanceModelLabel: 'assist', apiKey: 'secret' }) },
    analysisStore: { get: () => options.analysis === null ? null : ({ exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }) },
    context: { namedFiles: () => ({ status: 'ready', paths: ['prompts/agent.md'] }) },
    projectFileReader: {
      readProjectFilePreviews: async () => ({ status: 'ok', files: [{ path: 'prompts/agent.md', preview: 'before', digest: 'first' }] }),
      readTargetState: async () => ({ status: 'ok', value: state }),
    },
    llm: { draftProposal: async request => { options.calls?.push(request); if (options.providerError) throw options.providerError; return {
      affectedProjectFiles: options.targetFiles ?? ['prompts/agent.md'],
      changeSummary: 'Require the agent to stop first.', rationale: 'The selected assertion failed because the rule was missed.',
      expectedEvalImpact: 'The selected case should now stop before continuing.',
      proposedChange: options.change ?? { kind: 'replacement', representation: 'Stop before proceeding.' },
    }; } },
    proposalStore: { savePendingProposal: async request => { options.calls?.push(request); return { ...request.proposal, proposalId: 'repair-1', approvalState: 'pending' }; } },
    logger: { info: event => capture(event), warn: event => capture(event), error: event => capture(event) },
  };
  function capture(event: DraftRepairProposalLogEvent): void {
    options.events?.push(event);
    if (options.loggerThrows) throw new Error('SYNTHETIC_SECRET_LOGGER');
  }
}

describe('draftEvalRepairProposal', () => {
  it('binds one named target to the selected saved run and attempt', async () => {
    const calls: unknown[] = [];
    const result = await draftEvalRepairProposal(command, dependencies({ calls }));
    assert.equal(result.status, 'proposal-ready');
    assert.deepEqual(calls[0], command);
    assert.match(JSON.stringify(calls[2]), /run-1/);
    assert.doesNotMatch(JSON.stringify(calls[1]), /other attempt/);
  });
  it('rejects multiple, substituted and changed targets before storage', async () => {
    for (const options of [{ targetFiles: ['prompts/agent.md', 'evals/suite.json'] }, { targetFiles: ['other.md'] }, { changed: true }]) {
      const calls: unknown[] = [];
      const result = await draftEvalRepairProposal(command, dependencies({ ...options, calls }));
      assert.notEqual(result.status, 'proposal-ready');
      assert.equal(calls.length, 2);
    }
  });
  it('blocks missing selected evidence before provider or storage', async () => {
    const calls: unknown[] = [];
    const result = await draftEvalRepairProposal(command, dependencies({ selected: { status: 'blocked', reason: 'missing-evidence' }, calls }));
    assert.equal(result.status, 'blocked');
    assert.equal(calls.length, 1);
  });
  it('blocks suite-named conventional private keys before provider submission', async () => {
    for (const target of ['.ssh/id_ed25519', '.ssh/id_ecdsa']) {
      const calls: unknown[] = [];
      const result = await draftEvalRepairProposal(command, {
        ...dependencies({ calls }),
        context: { namedFiles: () => ({ status: 'ready', paths: [target] }) },
        projectFileReader: new NodeSafeProjectFileReader(),
      });
      assert.equal(result.status, 'blocked', target);
      assert.equal(calls.length, 1, 'only saved evidence is read; provider and store are untouched');
    }
  });
  it('rejects unsupported or stale diffs before proposal-ready and storage', async () => {
    for (const representation of [
      '--- a/prompts/agent.md\n+++ b/prompts/agent.md\n@@ -1 +1 @@\n-before\n+after\n@@ -2 +2 @@\n-x\n+y',
      '--- a/prompts/agent.md\n+++ b/prompts/agent.md\n@@ -1 +1 @@\n-stale\n+after',
    ]) {
      const calls: unknown[] = [];
      const result = await draftEvalRepairProposal(command, dependencies({ calls, change: { kind: 'unified-diff', representation } }));
      assert.equal(result.status, 'proposal-rejected');
      if (result.status === 'proposal-rejected') assert.match(result.message, /single matching hunk/);
      assert.equal(calls.length, 2);
    }
  });
  it('accepts an applicable one-hunk diff', async () => {
    const result = await draftEvalRepairProposal(command, dependencies({ change: { kind: 'unified-diff', representation:
      '--- a/prompts/agent.md\n+++ b/prompts/agent.md\n@@ -1 +1 @@\n-before\n+after' } }));
    assert.equal(result.status, 'proposal-ready');
  });
  it('blocks mismatched analysis, selected model and missing failed evidence without saving', async () => {
    const wrongAnalysis = await draftEvalRepairProposal({ ...command, repairDirection: { type: 'fixture_input_issue' } }, dependencies());
    assert.equal(wrongAnalysis.status, 'blocked');
    const calls: unknown[] = [];
    const wrongModel = await draftEvalRepairProposal(command, dependencies({ selected: { status: 'ready', value: { ...selected.value, testedModel: 'other' } }, calls }));
    assert.equal(wrongModel.status, 'blocked');
    assert.equal(calls.length, 1);
    const nonfailed = await draftEvalRepairProposal(command, dependencies({ selected: { status: 'blocked', reason: 'non-failed-assertion' }, calls: [] }));
    assert.equal(nonfailed.status, 'blocked');
  });
  it('reports stale analysis, missing evidence and missing configuration with distinct observed reasons', async () => {
    for (const scenario of [
      { options: { analysis: null }, reason: 'stale-analysis', calls: 0 },
      { options: { selected: { status: 'blocked', reason: 'missing-evidence' } as SelectedFailureRead }, reason: 'missing-artifact', calls: 1 },
      { options: { missingKey: true }, reason: 'missing-openai-api-key', calls: 1 },
    ]) {
      const calls: unknown[] = []; const events: DraftRepairProposalLogEvent[] = [];
      const result = await draftEvalRepairProposal(command, dependencies({ ...scenario.options, calls, events }));
      assert.equal(result.status === 'proposal-unavailable' || result.status === 'blocked' ? result.reason : '', scenario.reason);
      assert.equal(calls.length, scenario.calls);
      assert.equal(events.at(-1)?.reason, scenario.reason);
    }
  });
  it('keeps evidence and analysis input after vague, unsafe, provider and unknown failures without storing', async () => {
    const secret = 'SYNTHETIC_SECRET_MODEL_OUTPUT';
    const cases: { options: Parameters<typeof dependencies>[0]; reason: string; expectedCalls: number }[] = [
      { options: { change: { kind: 'replacement', representation: 'before' } }, reason: 'vague-proposal', expectedCalls: 2 },
      { options: { targetFiles: ['../../secret'] }, reason: 'unsafe-target-files', expectedCalls: 2 },
      { options: { providerError: new UnsafeRepairProposalTargetError() }, reason: 'unsafe-target-files', expectedCalls: 2 },
      { options: { providerError: new ProposalProviderFailure('provider-timeout') }, reason: 'provider-timeout', expectedCalls: 2 },
      { options: { providerError: new Error(secret) }, reason: 'unknown-cause', expectedCalls: 2 },
    ];
    for (const scenario of cases) {
      const calls: unknown[] = []; const events: DraftRepairProposalLogEvent[] = [];
      const result = await draftEvalRepairProposal(command, { ...dependencies({ ...scenario.options, calls, events }), reference: '123e4567-e89b-42d3-a456-426614174000' });
      assert.equal(result.status === 'proposal-rejected' || result.status === 'error' ? result.reason : '', scenario.reason);
      assert.equal(result.status === 'proposal-rejected' || result.status === 'error' ? result.evidence : null, selected.status === 'ready' ? selected.value.evidence : null);
      assert.equal(calls.length, scenario.expectedCalls, 'provider input but no proposal save');
      assert.deepEqual((calls[1] as { priorAnalysis: unknown }).priorAnalysis, { summary: 'Selected evidence', likelyCause: 'prompt_issue' });
      assert.equal(events.at(-1)?.reason, scenario.reason);
      assert.equal(events.at(-1)?.reference, '123e4567-e89b-42d3-a456-426614174000');
      assert.doesNotMatch(JSON.stringify({ result, events }), /SYNTHETIC_SECRET/);
      assert.doesNotMatch(JSON.stringify(events), /selected actual|selected expected|before|prompt_issue/);
    }
  });
  it('keeps observed provider categories separate from unknown failures', async () => {
    for (const reason of ['provider-authorization', 'provider-rate-limit', 'provider-timeout', 'provider-unavailable', 'invalid-llm-response'] as ProposalProviderFailureReason[]) {
      const events: DraftRepairProposalLogEvent[] = [];
      const result = await draftEvalRepairProposal(command, dependencies({ providerError: new ProposalProviderFailure(reason), events }));
      assert.equal(result.status === 'error' ? result.reason : '', reason);
      assert.equal(events.at(-1)?.reason, reason);
    }
  });
  it('contains failed log sinks on ready and blocked paths and excludes unvalidated references', async () => {
    const ready = await draftEvalRepairProposal(command, { ...dependencies({ loggerThrows: true }), reference: 'SECRET_INVALID_REFERENCE' });
    assert.equal(ready.status, 'proposal-ready');
    const blocked = await draftEvalRepairProposal(command, { ...dependencies({ loggerThrows: true, analysis: null }), reference: 'SECRET_INVALID_REFERENCE' });
    assert.equal(blocked.status, 'blocked');
    const failed = await draftEvalRepairProposal(command, dependencies({ loggerThrows: true, providerError: new ProposalProviderFailure('provider-unavailable') }));
    assert.equal(failed.status === 'error' ? failed.reason : '', 'provider-unavailable');
    const events: DraftRepairProposalLogEvent[] = [];
    await draftEvalRepairProposal(command, { ...dependencies({ events, analysis: null }), reference: 'SECRET_INVALID_REFERENCE' });
    assert.equal(events[0]?.reference, undefined);
    assert.deepEqual(Object.keys(events[0]!).sort(), ['durationMs', 'event', 'outcome', 'stage']);
  });
});
