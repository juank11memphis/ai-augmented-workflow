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
    assert.equal(dependencies.calls.claims, 0);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks unknown or stale proposal ids with no writes', async () => {
    const dependencies = fakeDependencies({ proposal: null });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'stale-proposal');
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('keeps unexpected proposal-read errors separate from attempted mutation', async () => {
    const dependencies = fakeDependencies({ proposal: proposal() });
    dependencies.proposalReader.getPendingProposal = async () => { throw new Error('unavailable'); };
    const result = await applyApprovedEvalRepair(command(), dependencies);
    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'unexpected-port-failure');
    assert.equal(result.mutationState, 'not-attempted');
    assert.match(result.message, /could not be started/i);
    assert.doesNotMatch(result.message, /No project files changed/i);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks proposals drafted for a different active project root', async () => {
    const dependencies = fakeDependencies({ proposal: proposal({ projectRoot: '/other-repo' }) });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'wrong-project-root');
    assert.equal(dependencies.calls.safety.length, 0);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('blocks unsafe target classes before mutation', async () => {
    for (const unsafePath of ['../outside.md', '/outside/root.md', 'linked/escape.md', '../repo2/file.md', '.env', 'config/private-key.pem']) {
      const dependencies = fakeDependencies({ proposal: proposal({ affectedProjectFiles: [unsafePath] }), unsafePaths: [unsafePath] });
      const result = await applyApprovedEvalRepair(command(), dependencies);
      assert.equal(result.status, 'blocked', unsafePath);
      assert.equal(result.reason, 'unsafe-target', unsafePath);
      assert.deepEqual(dependencies.calls.mutations, [], unsafePath);
      assert.equal(dependencies.calls.claims, 0);
    }
  });

  it('blocks unsafe managed-workflow readiness before mutation', async () => {
    const dependencies = fakeDependencies({ readiness: { status: 'blocked', message: 'Run sibu sync first.', guidance: ['Run `sibu sync`.'], affectedPaths: ['AGENTS.md'] } });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'unsafe-workflow-readiness');
    assert.match(result.guidance?.join('\n') ?? '', /sibu sync/);
    assert.equal(dependencies.calls.mutations.length, 0);
    assert.equal(dependencies.calls.claims, 0);
  });

  it('blocks safety-port target mismatches before readiness, claim, or mutation', async () => {
    const dependencies = fakeDependencies({ safeTargets: ['different.md'] });
    const result = await applyApprovedEvalRepair(command(), dependencies);
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'unsafe-target');
    assert.equal(dependencies.calls.readiness.length, 0);
    assert.equal(dependencies.calls.claims, 0);
    assert.equal(dependencies.calls.mutations.length, 0);
  });

  it('returns mutation failure without leaking approved patch content in logs', async () => {
    const dependencies = fakeDependencies({ mutationFails: true });
    const result = await applyApprovedEvalRepair(command(), dependencies);

    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'mutation-failure');
    assert.equal(result.mutationState, 'attempted-outcome-uncertain');
    assert.deepEqual(result.inspectionPaths, ['prompts/skill.md']);
    assert.doesNotMatch(result.message, /No project files changed|retry/i);
    assert.equal(dependencies.calls.mutations.length, 1);
    assert.equal(dependencies.calls.claims, 1);
    assert.doesNotMatch(JSON.stringify(dependencies.events), /approved new content|secret-token-value/);
    assert.doesNotMatch(JSON.stringify(dependencies.events), /prompts\/skill\.md/);
  });

  it('keeps partial mutation and the named target uncertain without a second attempt', async () => {
    const dependencies = fakeDependencies({ mutationFails: true, changedFiles: [{ path: 'prompts/skill.md' }] });
    const result = await applyApprovedEvalRepair(command(), dependencies);
    assert.equal(result.status, 'error');
    assert.equal(result.mutationState, 'attempted-outcome-uncertain');
    assert.deepEqual(result.changedFiles, [{ path: 'prompts/skill.md' }]);
    assert.deepEqual(result.inspectionPaths, ['prompts/skill.md']);
    assert.match(result.message, /Inspect prompts\/skill\.md/);
    assert.equal(dependencies.calls.mutations.length, 1);
  });

  it('contains thrown ports before and after mutation with the correct attempt state', async () => {
    const before = fakeDependencies({ throwAt: 'readiness' });
    const beforeResult = await applyApprovedEvalRepair(command(), before);
    assert.equal(beforeResult.status, 'error');
    assert.equal(beforeResult.mutationState, 'not-attempted');
    assert.deepEqual(beforeResult.inspectionPaths, ['prompts/skill.md']);
    assert.equal(before.calls.mutations.length, 0);

    const after = fakeDependencies({ throwAt: 'mutation' });
    const afterResult = await applyApprovedEvalRepair(command(), after);
    assert.equal(afterResult.status, 'error');
    assert.equal(afterResult.mutationState, 'attempted-outcome-uncertain');
    assert.deepEqual(afterResult.inspectionPaths, ['prompts/skill.md']);
    assert.match(afterResult.message, /Inspect prompts\/skill\.md/);
    assert.equal(after.calls.mutations.length, 1);
  });

  it('does not let a logger sink failure change applied, blocked, or uncertain results', async () => {
    for (const options of [{}, { unsafePaths: ['.env'] }, { mutationFails: true }]) {
      const baseline = await applyApprovedEvalRepair(command(), fakeDependencies(options));
      const withBrokenLogger = await applyApprovedEvalRepair(command(), fakeDependencies({ ...options, loggerThrows: true }));
      assert.deepEqual(withBrokenLogger, baseline);
    }
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
    assert.deepEqual(dependencies.calls.safety, [{ root: projectRoot, paths: ['prompts/skill.md'] }]);
    assert.deepEqual(dependencies.calls.readiness, [{ root: projectRoot, paths: ['prompts/skill.md'] }]);
    assert.equal(dependencies.calls.claims, 1);
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
    assert.equal(result.mutationState, 'attempted-outcome-uncertain');
    assert.deepEqual(result.inspectionPaths, ['prompts/skill.md']);
    assert.equal(dependencies.calls.mutations.length, 1);
    assert.doesNotMatch(result.message, /No project files changed|retry/i);
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
    sourceFailureScope: { suiteId: 'skill-authoring', runId: 'run-1', testCaseId: 'missing-skill-boundary', attempt: 1, evalRunModelId: 'gpt-5-mini', judgeModel: null, assertionId: 'a1' },
    ...overrides,
  };
}

function fakeDependencies(options: {
  readonly proposal?: PendingApprovedRepairProposal | null;
  readonly unsafePaths?: readonly string[];
  readonly safeTargets?: readonly string[];
  readonly readiness?: Awaited<ReturnType<ApplyApprovedEvalRepairDependencies['workflowReadiness']['checkReadiness']>>;
  readonly mutationFails?: boolean;
  readonly changedFiles?: readonly { readonly path: string }[];
  readonly marker?: string;
  readonly throwAt?: 'readiness' | 'mutation';
  readonly loggerThrows?: boolean;
} = {}): ApplyApprovedEvalRepairDependencies & { readonly calls: { lookup: number; claims: number; safety: { root: string; paths: readonly string[] }[]; readiness: { root: string; paths: readonly string[] }[]; mutations: unknown[] }; readonly events: ApplyApprovedRepairLogEvent[] } {
  const calls = { lookup: 0, claims: 0, safety: [] as { root: string; paths: readonly string[] }[], readiness: [] as { root: string; paths: readonly string[] }[], mutations: [] as unknown[] };
  const events: ApplyApprovedRepairLogEvent[] = [];
  const log = (event: ApplyApprovedRepairLogEvent) => { if (options.loggerThrows) throw new Error('sink unavailable secret-token-value'); events.push(event); };
  return {
    calls,
    events,
    proposalReader: { getPendingProposal: () => { calls.lookup += 1; return options.proposal === undefined ? proposal() : options.proposal; }, claimPendingProposal: () => { calls.claims += 1; return true; } },
    safety: { validateTargets: async (root, targetPaths) => { calls.safety.push({ root, paths: targetPaths }); return options.unsafePaths?.length ? { status: 'blocked', reason: 'unsafe target', unsafePaths: options.unsafePaths } : { status: 'ok', safeTargets: options.safeTargets ?? targetPaths }; } },
    workflowReadiness: { checkReadiness: async (root, targetPaths) => { calls.readiness.push({ root, paths: targetPaths }); if (options.throwAt === 'readiness') throw new Error('readiness unavailable'); return options.readiness ?? { status: 'ready' }; } },
    mutator: { applyApprovedChange: async (request) => { calls.mutations.push(request); if (options.throwAt === 'mutation') throw new Error('mutation interrupted'); return options.mutationFails ? { status: 'failed', reason: 'disk-error', changedFiles: options.changedFiles ?? [] } : { status: 'applied', changedFiles: options.changedFiles ?? request.targetPaths.map((path) => ({ path })) }; } },
    logger: { info: log, warn: log, error: log },
    clock: () => 10,
  };
}
