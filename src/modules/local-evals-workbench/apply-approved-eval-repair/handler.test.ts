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
    const result = await applyApprovedEvalRepair({ projectRoot, proposalId: 'repair_1', approvalMarker: 'clicked-something-else' }, dependencies);

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
    assert.deepEqual(result.changedFiles, [{ path: 'prompts/skill.md' }]);
    assert.equal(dependencies.calls.mutations.length, 1);
    assert.deepEqual(dependencies.calls.mutations[0], { projectRoot, targetPaths: ['prompts/skill.md'], approvedChange });
    assert.doesNotMatch(JSON.stringify(dependencies.events), /approved new content|secret-token-value/);
  });
});

function command() {
  return { projectRoot, proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER };
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
    ...overrides,
  };
}

function fakeDependencies(options: {
  readonly proposal?: PendingApprovedRepairProposal | null;
  readonly unsafePaths?: readonly string[];
  readonly readiness?: Awaited<ReturnType<ApplyApprovedEvalRepairDependencies['workflowReadiness']['checkReadiness']>>;
  readonly mutationFails?: boolean;
} = {}): ApplyApprovedEvalRepairDependencies & { readonly calls: { lookup: number; mutations: unknown[] }; readonly events: ApplyApprovedRepairLogEvent[] } {
  const calls = { lookup: 0, mutations: [] as unknown[] };
  const events: ApplyApprovedRepairLogEvent[] = [];
  return {
    calls,
    events,
    proposalReader: { getPendingProposal: () => { calls.lookup += 1; return options.proposal === undefined ? proposal() : options.proposal; } },
    safety: { validateTargets: async (_root, targetPaths) => options.unsafePaths?.length ? { status: 'blocked', reason: 'unsafe target', unsafePaths: options.unsafePaths } : { status: 'ok', safeTargets: targetPaths } },
    workflowReadiness: { checkReadiness: async () => options.readiness ?? { status: 'ready' } },
    mutator: { applyApprovedChange: async (request) => { calls.mutations.push(request); return options.mutationFails ? { status: 'failed', reason: 'disk-error' } : { status: 'applied', changedFiles: request.targetPaths.map((path) => ({ path })) }; } },
    logger: { info: (event) => events.push(event), warn: (event) => events.push(event), error: (event) => events.push(event) },
    clock: () => 10,
  };
}
