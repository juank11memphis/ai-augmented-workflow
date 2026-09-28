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
import { previewEvalRun } from '../preview-eval-run/handler.js';
import { startEvalRun } from '../start-eval-run/handler.js';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';

const logger = { info() {}, warn() {}, error() {} };
const selection = { suiteId: 'suite', testCaseId: 'case', attempt: 2, assertionId: 'assertion',
  evalRunModelId: 'synthetic', runScope: { type: 'all' as const } };

test('restored failure remains immutable through approval and distinct confirmed case and suite reruns', async () => {
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
    const sourceAttempt = await fs.readFile(path.join(p.root, 'evals/artifacts/suite', runId, 'cases/case/2.json'), 'utf8');
    const suite: NormalizedEvalSuite = { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Offline',
      target: { id: 'target', kind: 'agent', path: 'prompts/agent.md' }, coverage: { categories: [], gaps: [] },
      runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
      testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: { type: 'inline', text: 'Check' } }], toolMocks: [],
        assertions: [{ id: 'assertion', type: 'output-contains', expected: 'yes' }], graders: [] }] };
    const scheduled: string[] = [];
    const runner = { describe: async () => ({ status: 'ready' as const, value: { runnerId: 'offline', capabilities: ['single-turn' as const],
      models: ['synthetic'], judgeModels: [], requiredEnvironment: [], costEstimation: true } }),
    estimate: async () => ({ status: 'ready' as const, value: { targetCalls: 1, judgeCalls: 0, totalCalls: 1,
      cost: { status: 'available' as const, amount: 0, currency: 'USD' } } }) };
    const runPorts = { suites: { load: async () => suite }, runner, inputs: { resolve: async () => ({ status: 'ready' as const, value: suite.testCases }) },
      artifacts: { check: async () => ({ status: 'ready' as const, value: null }) }, store: history.store,
      scheduler: { schedule: ({ runId: scheduledId }: { runId: string }) => { scheduled.push(scheduledId); } } };
    for (const scope of [{ type: 'test_case' as const, testCaseId: 'case' }, { type: 'all' as const }]) {
      const selection = { suiteId: 'suite', scope, model: 'synthetic', judgeModel: null, repeats: 2 };
      const preview = await previewEvalRun(selection, runPorts);
      assert.equal(preview.status, 'ready');
      assert.equal(scheduled.length, scope.type === 'test_case' ? 0 : 1, 'preview never schedules');
      if (preview.status !== 'ready') continue;
      const started = await startEvalRun({ ...selection, review: { selectedCaseIds: preview.selectedCaseIds, targetCalls: preview.targetCalls,
        judgeCalls: preview.judgeCalls, totalCalls: preview.totalCalls, cost: preview.cost } }, runPorts);
      assert.equal(started.status, 'queued');
      if (started.status !== 'queued') continue;
      assert.notEqual(started.runId, runId);
      assert.equal(scheduled.at(-1), started.runId);
      assert.equal((await history.store.start('suite', started.runId)).status, 'ok');
      const rerunEvidence = { ...evidence(started.runId), outcome: scope.type === 'all' ? 'failed' as const : 'passed' as const,
        assertions: [{ ...evidence(started.runId).assertions[0]!, outcome: scope.type === 'all' ? 'failed' as const : 'passed' as const }] };
      assert.equal((await history.store.append('suite', started.runId, rerunEvidence)).status, 'ok');
      assert.equal((await history.store.append('suite', started.runId, { ...rerunEvidence, number: 2 })).status, 'ok');
      assert.equal((await history.store.finalize('suite', started.runId, 'completed')).status, 'ok');
      const read = await history.get({ suiteId: 'suite', runId: started.runId });
      assert.equal(read.status, 'ok');
      if (read.status === 'ok') assert.equal(read.value.summary.runId, started.runId);
    }
    assert.equal(new Set(scheduled).size, 2);
    assert.equal(await fs.readFile(path.join(p.root, 'evals/artifacts/suite', runId, 'run.json'), 'utf8'), beforeManifest);
    assert.equal(await fs.readFile(path.join(p.root, 'evals/artifacts/suite', runId, 'cases/case/2.json'), 'utf8'), sourceAttempt);
  } finally { await p.cleanup(); }
});
