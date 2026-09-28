import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { project } from '../run-history/test-project.js';
import { config, evidence } from '../run-history/test-fixtures.js';
import { createRunHistory } from '../run-history/composition.js';
import { createSelectedFailureReader } from './selected-evidence.js';
import { InMemoryFailureAnalysisStore } from './analysis-store.js';
import { analyzeFailedAssertion } from '../analyze-failed-assertion/handler.js';
import { draftEvalRepairProposal } from '../draft-eval-repair-proposal/handler.js';
import { NodeSafeProjectFileReader } from '../draft-eval-repair-proposal/project-file-safety.js';
import { InMemoryRepairProposalStore } from '../draft-eval-repair-proposal/proposal-store.js';
import { applyApprovedEvalRepair } from '../apply-approved-eval-repair/handler.js';
import { APPLY_APPROVED_REPAIR_MARKER } from '../apply-approved-eval-repair/command.js';
import { NodeSafeProjectFileMutator } from '../apply-approved-eval-repair/safe-project-file-mutator.js';
import { RepairProposalStoreReadinessAdapter } from '../apply-approved-eval-repair/proposal-readiness-adapter.js';

const logger = { info() {}, warn() {}, error() {} };
const selection = { suiteId: 'suite', testCaseId: 'case', attempt: 2, assertionId: 'assertion',
  evalRunModelId: 'synthetic', runScope: { type: 'all' as const } };

test('restored persisted failure stays isolated through analysis, one-file proposal, approval and no-rerun result', async () => {
  const p = await project();
  try {
    await fs.mkdir(path.join(p.root, 'prompts'));
    await fs.writeFile(path.join(p.root, 'prompts/agent.md'), 'before');
    const history = createRunHistory(p.root);
    const first = await history.store.create({ ...config, repeats: 2 });
    const second = await history.store.create({ ...config, repeats: 2 });
    assert.equal(first.status, 'ok'); assert.equal(second.status, 'ok');
    if (first.status !== 'ok' || second.status !== 'ok') return;
    for (const [runId, sentinel] of [[first.value.runId, 'OTHER_RUN'], [second.value.runId, 'SELECTED_RUN']] as const) {
      assert.equal((await history.store.start('suite', runId)).status, 'ok');
      const pass = evidence(runId);
      assert.equal((await history.store.append('suite', runId, pass)).status, 'ok');
      const failed = { ...pass, number: 2, outcome: 'failed' as const,
        assertions: [{ ...pass.assertions[0]!, outcome: 'failed' as const, score: 0.3, threshold: 0.8, actual: sentinel,
          expected: 'safe behavior', diagnostics: ['selected failure'] }] };
      assert.equal((await history.store.append('suite', runId, failed)).status, 'ok');
      assert.equal((await history.store.finalize('suite', runId, 'completed')).status, 'ok');
    }
    const runId = second.value.runId;
    const beforeManifest = await fs.readFile(path.join(p.root, 'evals/artifacts/suite', runId, 'run.json'), 'utf8');
    const restored = createRunHistory(p.root);
    const selectedReader = createSelectedFailureReader(restored.get);
    const analysisStore = new InMemoryFailureAnalysisStore();
    const providerEvidence: unknown[] = [];
    const analysis = await analyzeFailedAssertion({ projectRoot: p.root, runId, ...selection }, {
      artifactReader: selectedReader, analysisStore,
      assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: true, assistanceModelLabel: 'offline' }) },
      llm: { analyzeFailure: async request => { providerEvidence.push(request.evidence); return {
        exactFailureExplanation: 'Selected assertion failed.', likelyCause: 'prompt_issue', evidenceSummary: 'Only selected evidence.', uncertainty: 'Low.',
      }; } }, logger,
    });
    assert.equal(analysis.status, 'analysis-ready');
    assert.match(JSON.stringify(providerEvidence), /SELECTED_RUN/);
    assert.match(JSON.stringify(providerEvidence), /"score":0.3/);
    assert.match(JSON.stringify(providerEvidence), /"threshold":0.8/);
    assert.doesNotMatch(JSON.stringify(providerEvidence), /OTHER_RUN/);
    if (analysis.status !== 'analysis-ready') return;
    const proposalStore = new InMemoryRepairProposalStore();
    const proposal = await draftEvalRepairProposal({ projectRoot: p.root, runId, analysisId: analysis.analysisId,
      ...selection, repairDirection: { type: 'prompt_issue' } }, {
      artifactReader: selectedReader, analysisStore,
      assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: true, assistanceModelLabel: 'offline' }) },
      context: { namedFiles: () => ({ status: 'ready', paths: ['prompts/agent.md'] }) },
      projectFileReader: new NodeSafeProjectFileReader(),
      llm: { draftProposal: async request => { providerEvidence.push(request.evidence); return {
        affectedProjectFiles: ['prompts/agent.md'], changeSummary: 'Require safe behavior in the prompt.',
        rationale: 'The selected check failed.', expectedEvalImpact: 'Selected case should pass after rerun.',
        proposedChange: { kind: 'replacement', representation: 'Verify before action.' },
      }; } }, proposalStore, logger,
    });
    assert.equal(proposal.status, 'proposal-ready');
    assert.equal(await fs.readFile(path.join(p.root, 'prompts/agent.md'), 'utf8'), 'before');
    if (proposal.status !== 'proposal-ready') return;
    assert.equal(new InMemoryRepairProposalStore().getPendingProposal(proposal.proposal.proposalId), undefined);
    const mutator = new NodeSafeProjectFileMutator();
    const deps = { proposalReader: new RepairProposalStoreReadinessAdapter(proposalStore), safety: mutator,
      workflowReadiness: { checkReadiness: async () => ({ status: 'ready' as const }) }, mutator, logger };
    const applyCommand = { projectRoot: p.root, proposalId: proposal.proposal.proposalId,
      approvalMarker: APPLY_APPROVED_REPAIR_MARKER, suiteId: 'suite', runId, testCaseId: 'case', attempt: 2, assertionId: 'assertion' };
    const applied = await applyApprovedEvalRepair(applyCommand, deps);
    assert.equal(applied.status, 'applied');
    if (applied.status === 'applied') assert.equal(applied.validationStatus, 'not-rerun');
    assert.equal(await fs.readFile(path.join(p.root, 'prompts/agent.md'), 'utf8'), 'Verify before action.');
    assert.equal((await applyApprovedEvalRepair(applyCommand, deps)).status, 'blocked');
    assert.equal(await fs.readFile(path.join(p.root, 'evals/artifacts/suite', runId, 'run.json'), 'utf8'), beforeManifest);
  } finally { await p.cleanup(); }
});
