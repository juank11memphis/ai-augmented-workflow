import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftEvalRepairProposal, type DraftEvalRepairProposalDependencies } from './handler.js';
import type { DraftEvalRepairProposalCommand } from './command.js';
import type { SelectedFailureRead } from '../repair-context/selected-evidence.js';
import { NodeSafeProjectFileReader } from './project-file-safety.js';

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

function dependencies(options: { selected?: SelectedFailureRead; targetFiles?: readonly string[]; calls?: unknown[]; changed?: boolean; change?: { kind: 'unified-diff' | 'replacement'; representation: string } } = {}): DraftEvalRepairProposalDependencies {
  const state = { status: 'present' as const, path: 'prompts/agent.md', digest: options.changed ? 'changed' : 'first', content: 'before', preview: 'before' };
  return {
    artifactReader: { read: async selection => { options.calls?.push(selection); return options.selected ?? selected; } },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: true, assistanceModelLabel: 'assist', apiKey: 'secret' }) },
    analysisStore: { get: () => ({ exactFailureExplanation: 'Failed', likelyCause: 'prompt_issue', evidenceSummary: 'Selected evidence', uncertainty: 'Low' }) },
    context: { namedFiles: () => ({ status: 'ready', paths: ['prompts/agent.md'] }) },
    projectFileReader: {
      readProjectFilePreviews: async () => ({ status: 'ok', files: [{ path: 'prompts/agent.md', preview: 'before', digest: 'first' }] }),
      readTargetState: async () => ({ status: 'ok', value: state }),
    },
    llm: { draftProposal: async request => { options.calls?.push(request); return {
      affectedProjectFiles: options.targetFiles ?? ['prompts/agent.md'],
      changeSummary: 'Require the agent to stop first.', rationale: 'The selected assertion failed because the rule was missed.',
      expectedEvalImpact: 'The selected case should now stop before continuing.',
      proposedChange: options.change ?? { kind: 'replacement', representation: 'Stop before proceeding.' },
    }; } },
    proposalStore: { savePendingProposal: async request => { options.calls?.push(request); return { ...request.proposal, proposalId: 'repair-1', approvalState: 'pending' }; } },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
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
});
