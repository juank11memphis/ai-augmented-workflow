import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { APPLY_APPROVED_REPAIR_MARKER } from './command.js';
import { applyApprovedEvalRepair } from './handler.js';
import type { ApplyApprovedEvalRepairDependencies } from './handler.js';
import type { ApplyApprovedRepairLogEvent, PendingApprovedRepairProposal } from './ports.js';

const projectRoot = '/repo';
const approvedChange = { kind: 'replacement' as const, representation: 'approved new content secret-token-value' };

describe('applyApprovedEvalRepair', () => {
  it('blocks missing explicit approval before proposal lookup or writes', async () => {
    const dependencies = fakeDependencies({ proposal: proposal() });
    const result = await applyApprovedEvalRepair({ ...command(), approvalMarker: 'clicked-something-else' }, dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'missing-approval');
    assert.equal(dependencies.calls.lookup, 0);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks unknown or stale proposal ids with no writes', async () => {
    const dependencies = fakeDependencies({ proposal: null });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'stale-proposal');
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('keeps unexpected proposal-read errors uncertain rather than claiming no file changed', async () => {
    const dependencies = fakeDependencies({ proposal: proposal() });
    dependencies.proposalReader.getPendingProposal = async () => { throw new Error('unavailable'); };
    const result = await applyApprovedEvalRepair(command(), dependencies);
    assert.equal(result.status, 'error');
    assert.match(result.message, /uncertain/i);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks proposals drafted for a different active project root', async () => {
    const dependencies = fakeDependencies({ proposal: proposal({ projectRoot: '/other-repo' }) });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'wrong-project-root');
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks unsafe target classes before mutation', async () => {
    for (const unsafePath of ['../outside.md', '/outside/root.md', 'linked/escape.md', '../repo2/file.md', '.env', 'config/private-key.pem']) {
      const dependencies = fakeDependencies({ proposal: proposal({ affectedProjectFiles: [unsafePath] }), unsafePaths: [unsafePath] });
      const result = await applyApprovedEvalRepair(command(), dependencies);
      assert.equal(result.status, 'blocked', unsafePath);
      assert.equal(result.reason, 'unsafe-target', unsafePath);
      assert.deepEqual(dependencies.calls.mutations, [], unsafePath);
    }
  });

  it('blocks unsafe managed-workflow readiness before mutation', async () => {
    const dependencies = fakeDependencies({ readiness: { status: 'blocked', message: 'Run sibu sync first.', guidance: ['Run `sibu sync`.'], affectedPaths: ['AGENTS.md'] } });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'unsafe-workflow-readiness');
    assert.match(result.guidance?.join('\n') ?? '', /sibu sync/);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('returns mutation failure without leaking approved patch content in logs', async () => {
    const dependencies = fakeDependencies({ mutationFails: true });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'mutation-failure');
    assert.equal(dependencies.calls.mutations.length, 1);
    assert.doesNotMatch(JSON.stringify(dependencies.events), /approved new content|secret-token-value/);
  });

  it('applies only the exact approved change representation after all gates pass', async () => {
    const dependencies = fakeDependencies({ proposal: proposal({ affectedProjectFiles: ['prompts/skill.md'] }) });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'applied');
    assert.deepEqual(result.changedFiles, [{ path: 'prompts/skill.md', summary: 'Change prompt hard stop behavior.' }]);
    assert.equal(result.changedFileCount, 1);
    assert.equal(result.validationStatus, 'not-rerun');
    assert.equal(result.rerunRecommendation.primaryAction.scope, 'test_case');
    assert.equal(result.rerunRecommendation.primaryAction.label, 'Rerun this test case');
    assert.equal(result.rerunRecommendation.alternateActions[0]?.scope, 'suite');
    assert.equal(dependencies.calls.mutations.length, 1);
    assert.deepEqual(dependencies.calls.mutations[0], { projectRoot, targetPaths: ['prompts/skill.md'], approvedChange, targetPrecondition: proposal().targetPrecondition });
    assert.doesNotMatch(JSON.stringify(dependencies.events), /approved new content|secret-token-value/);
  });


  it('rejects multiple target files before mutation', async () => {
    const dependencies = fakeDependencies({ proposal: proposal({ affectedProjectFiles: ['prompts/skill.md', 'evals/skill.json'] }) });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.changedFileCount, 0);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('treats a no-change mutator response as uncertain rather than claiming application', async () => {
    const dependencies = fakeDependencies({ changedFiles: [] });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'error');
    assert.equal(result.changedFileCount, 0);
    assert.deepEqual(result.changedFiles, []);
    assert.doesNotMatch(result.message, /fixed|resolved/i);
  });

  it('returns no-change semantics for blocked paths', async () => {
    const scenarios = [
      { marker: 'wrong', reason: 'missing-approval' },
      { proposal: null, reason: 'stale-proposal' },
      { proposal: proposal({ projectRoot: '/other-repo' }), reason: 'wrong-project-root' },
      { unsafePaths: ['.env'], reason: 'unsafe-target' },
      { readiness: { status: 'blocked' as const, message: 'Run sibu sync first.', guidance: ['Run `sibu sync`.'], affectedPaths: ['AGENTS.md'] }, reason: 'unsafe-workflow-readiness' },
    ];

    for (const scenario of scenarios) {
      const dependencies = fakeDependencies(scenario);
      const result = await applyApprovedEvalRepair({ ...command(), approvalMarker: scenario.marker ?? APPLY_APPROVED_REPAIR_MARKER }, dependencies);
      assert.equal(result.status, 'blocked');
      assert.equal(result.reason, scenario.reason);
      assert.equal(result.changedFileCount, 0);
      assert.deepEqual(result.changedFiles, []);
      assert.match(result.message, /No project files changed/i);
    }
  });

});

function command() {
  return { projectRoot, proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER,
    suiteId: 'skill-authoring', runId: 'run-1', testCaseId: 'missing-skill-boundary', attempt: 1, assertionId: 'a1' };
}

function proposal(overrides: Partial<PendingApprovedRepairProposal> = {}): PendingApprovedRepairProposal {
  return {
    proposalId: 'repair_1',
    projectRoot,
    affectedProjectFiles: ['prompts/skill.md'],
    changeSummary: 'Change prompt hard stop behavior.',
    rationale: 'The failed assertion shows the prompt skipped a required stop.',
    expectedEvalImpact: 'The focused assertion should pass after rerun.',
    proposedChange: approvedChange,
    approvalState: 'pending',
    targetPrecondition: { status: 'absent', path: overrides.affectedProjectFiles?.[0] ?? 'prompts/skill.md' },
    sourceFailureScope: { suiteId: 'skill-authoring', runId: 'run-1', testCaseId: 'missing-skill-boundary', attempt: 1, evalRunModelId: 'gpt-5-mini', judgeModel: null, repeats: 1, assertionId: 'a1' },
    ...overrides,
  };
}

function fakeDependencies(options: {
  readonly proposal?: PendingApprovedRepairProposal | null;
  readonly unsafePaths?: readonly string[];
  readonly readiness?: Awaited<ReturnType<ApplyApprovedEvalRepairDependencies['workflowReadiness']['checkReadiness']>>;
  readonly mutationFails?: boolean;
  readonly changedFiles?: readonly { readonly path: string }[];
  readonly marker?: string;
} = {}): ApplyApprovedEvalRepairDependencies & { readonly calls: { lookup: number; mutations: unknown[] }; readonly events: ApplyApprovedRepairLogEvent[] } {
  const calls = { lookup: 0, mutations: [] as unknown[] };
  const events: ApplyApprovedRepairLogEvent[] = [];
  return {
    calls,
    events,
    proposalReader: { getPendingProposal: () => { calls.lookup += 1; return options.proposal === undefined ? proposal() : options.proposal; }, claimPendingProposal: () => true },
    safety: { validateTargets: async (_root, targetPaths) => options.unsafePaths?.length ? { status: 'blocked', reason: 'unsafe target', unsafePaths: options.unsafePaths } : { status: 'ok', safeTargets: targetPaths } },
    workflowReadiness: { checkReadiness: async () => options.readiness ?? { status: 'ready' } },
    mutator: { applyApprovedChange: async (request) => { calls.mutations.push(request); return options.mutationFails ? { status: 'failed', reason: 'disk-error', changedFiles: [] } : { status: 'applied', changedFiles: options.changedFiles ?? request.targetPaths.map((path) => ({ path })) }; } },
    logger: { info: (event) => events.push(event), warn: (event) => events.push(event), error: (event) => events.push(event) },
    clock: () => 10,
  };
}
