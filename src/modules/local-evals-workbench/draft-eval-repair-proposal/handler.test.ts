import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftEvalRepairProposal } from './handler.js';
import type { DraftEvalRepairProposalCommand, RepairDirection } from './command.js';
import type { DraftEvalRepairProposalDependencies } from './handler.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';

const baseCommand: DraftEvalRepairProposalCommand = { projectRoot: '/repo', suiteId: 'skill-authoring', testCaseId: 'missing-skill-boundary', evalRunModelId: 'gpt-5-mini', runScope: { type: 'all' }, assertionId: 'a1', repairDirection: { type: 'prompt_issue' } };

describe('draftEvalRepairProposal', () => {
  for (const direction of [{ type: 'prompt_issue' }, { type: 'eval_assertion_issue' }, { type: 'fixture_input_issue' }, { type: 'regression_case' }, { type: 'custom', instruction: 'Update prompts/skill.md to require a hard stop.' }] as readonly RepairDirection[]) {
    it(`stores a pending concrete proposal for ${direction.type} without file mutation`, async () => {
      const writes: string[] = [];
      const saved: unknown[] = [];
      const result = await draftEvalRepairProposal({ ...baseCommand, repairDirection: direction }, dependencies({ saved, writes }));
      assert.equal(result.status, 'proposal-ready');
      if (result.status === 'proposal-ready') {
        assert.equal(result.proposal.approvalState, 'pending');
        assert.deepEqual(result.proposal.affectedProjectFiles, ['prompts/skill-authoring.md']);
      }
      assert.equal(saved.length, 1);
      assert.deepEqual(writes, []);
    });
  }

  it('blocks unclear direction, missing artifact/cell/assertion, non-failed assertion, and missing credentials without writes', async () => {
    const cases = [
      { command: { ...baseCommand, repairDirection: { type: 'custom', instruction: 'fix' } as const }, deps: dependencies(), status: 'blocked' },
      { command: baseCommand, deps: dependencies({ artifact: undefined }), status: 'blocked' },
      { command: { ...baseCommand, testCaseId: 'missing' }, deps: dependencies(), status: 'blocked' },
      { command: { ...baseCommand, assertionId: 'missing' }, deps: dependencies(), status: 'blocked' },
      { command: { ...baseCommand, assertionId: 'passed' }, deps: dependencies(), status: 'blocked' },
      { command: baseCommand, deps: dependencies({ hasKey: false }), status: 'proposal-unavailable' },
    ];
    for (const item of cases) assert.equal((await draftEvalRepairProposal(item.command, item.deps)).status, item.status);
  });

  it('rejects vague and unsafe proposals and handles LLM failures without storing approvable state', async () => {
    const saved: unknown[] = [];
    assert.equal((await draftEvalRepairProposal(baseCommand, dependencies({ saved, summary: 'fix it' }))).status, 'proposal-rejected');
    assert.equal((await draftEvalRepairProposal(baseCommand, dependencies({ saved, targetFile: '.env' }))).status, 'proposal-rejected');
    assert.equal((await draftEvalRepairProposal(baseCommand, dependencies({ saved, throws: true }))).status, 'error');
    assert.deepEqual(saved, []);
  });

  it('blocks unsafe context target requests and enforces one active assertion scope', async () => {
    const fixtureResult = await draftEvalRepairProposal({ ...baseCommand, repairDirection: { type: 'fixture_input_issue' } }, dependencies({ projectFileBlocked: true }));
    assert.equal(fixtureResult.status, 'blocked');
    const scoped = await draftEvalRepairProposal({ ...baseCommand, runScope: { type: 'test_case', testCaseId: 'other' } }, dependencies());
    assert.equal(scoped.status, 'blocked');
  });

  it('logs only safe metadata', async () => {
    const logs: unknown[] = [];
    await draftEvalRepairProposal(baseCommand, dependencies({ logs }));
    const text = JSON.stringify(logs);
    assert.match(text, /repair_proposal_requested/);
    assert.doesNotMatch(text, /secret|raw prompt|full model response|patch contents|active failed output/);
  });
});

function dependencies(options: { readonly artifact?: StoredRunArtifact; readonly hasKey?: boolean; readonly throws?: boolean; readonly targetFile?: string; readonly summary?: string; readonly saved?: unknown[]; readonly writes?: string[]; readonly logs?: unknown[]; readonly projectFileBlocked?: boolean } = {}): DraftEvalRepairProposalDependencies {
  const saved = options.saved ?? [];
  const logs = options.logs ?? [];
  return {
    artifactReader: { getRunArtifact: () => options.artifact === undefined && 'artifact' in options ? undefined : options.artifact ?? artifact() },
    assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: options.hasKey ?? true, assistanceModelLabel: 'gpt-5-mini', apiKey: options.hasKey === false ? undefined : 'secret' }) },
    projectFileReader: { readProjectFilePreviews: async () => options.projectFileBlocked ? { status: 'blocked', reason: 'unsafe context file', unsafePaths: ['.env'] } : { status: 'ok', files: [] } },
    llm: { draftProposal: async () => { if (options.throws) throw new Error('raw prompt secret full model response'); return { affectedProjectFiles: [options.targetFile ?? 'prompts/skill-authoring.md'], changeSummary: options.summary ?? 'Require missing input hard stops before drafting.', rationale: 'The active assertion failed because the prompt skipped the stop rule.', expectedEvalImpact: 'The selected assertion should pass while preserving other checks.', proposedChange: { kind: 'instructions', representation: 'Add an explicit missing-input hard stop rule.' } }; } },
    proposalStore: { savePendingProposal: async (request) => { saved.push(request); return { ...request.proposal, proposalId: 'repair_test', approvalState: 'pending' }; } },
    logger: { info: (event) => logs.push(event), warn: (event) => logs.push(event), error: (event) => logs.push(event) },
  };
}

function artifact(): StoredRunArtifact {
  return { suiteId: 'skill-authoring', modelId: 'gpt-5-mini', scope: 'all', matrix: { suiteId: 'skill-authoring', suiteName: 'Skill checks', status: 'failed', aggregates: { total: 1, passed: 0, failed: 1, blocked: 0, error: 0 }, diagnostics: [], rows: [{ testCaseId: 'missing-skill-boundary', name: 'Missing skill boundary', status: 'failed', cells: [{ testCaseId: 'missing-skill-boundary', modelId: 'gpt-5-mini', modelLabel: 'GPT-5 mini', status: 'failed', outputPreview: 'short output', durationMs: 10, diagnostics: [], metrics: [], artifacts: [], assertions: [
    { id: 'a1', label: 'Must stop first', kind: 'assertion', status: 'failed', message: 'Failed active', expectedPreview: 'expected stop', actualPreview: 'active failed output', metrics: [], diagnostics: [], artifacts: [] },
    { id: 'passed', label: 'Already passed', kind: 'assertion', status: 'passed', message: 'Passed', metrics: [], diagnostics: [], artifacts: [] },
  ] }] }] } };
}
