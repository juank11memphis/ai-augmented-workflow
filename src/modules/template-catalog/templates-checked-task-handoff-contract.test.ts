import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const guidance = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const handoff = guidance.split('### Publish each checked Task checkpoint')[1]?.split('### AFK blocked-check diagnosis')[0];
const taskId = 'T-01';
const commit = 'checked-commit-1';
const epicBase = 'epic/checked-delivery';

type Effect = 'push' | 'checklist' | 'progress' | 'pr';
type Fault = 'reject' | 'timeout-applied' | 'timeout-unchanged' | 'timeout-unknown' | 'conflict';
type CheckpointState = {
  remoteHead: string;
  checklist: { taskId: string; status: string } | null;
  progress: { taskId: string; commit: string; check: string; evidence: string; next: string } | null;
  pr: { head: string; base: string; draft: boolean } | null;
};
type Scenario = {
  check?: 'pass' | 'fail';
  evidence?: boolean;
  acceptedPlan?: string;
  observedPlan?: string;
  observedHead?: string;
  remoteHead?: string;
  task?: string;
  commit?: string;
  lastTask?: boolean;
  existingPr?: boolean;
  mismatchedReadback?: 'remote' | 'checklist' | 'progress' | 'pr';
  fault?: Partial<Record<Effect, Fault>>;
};
type Report = {
  trace: string[];
  confirmed: Effect[];
  uncertain: Effect[];
  handoff: boolean;
  nextTask: boolean;
  state: CheckpointState;
};

function runScenario(scenario: Scenario = {}): Report {
  const trace: string[] = [];
  const confirmed: Effect[] = [];
  const uncertain: Effect[] = [];
  const selectedTask = scenario.task ?? taskId;
  const selectedCommit = scenario.commit ?? commit;
  const oldHead = scenario.observedHead ?? 'epic-head';
  const state: CheckpointState = {
    remoteHead: scenario.remoteHead ?? oldHead,
    checklist: null,
    progress: null,
    pr: scenario.existingPr ? { head: oldHead, base: epicBase, draft: true } : null,
  };
  const report = (): Report => ({ trace, confirmed, uncertain, handoff: false, nextTask: false, state });

  trace.push('check');
  if (scenario.check === 'fail' || scenario.evidence === false) return report();
  trace.push('plan-readback');
  if ((scenario.acceptedPlan ?? 'reviewed-v1') !== (scenario.observedPlan ?? 'reviewed-v1')) return report();
  trace.push('branch-readback');
  if (state.remoteHead !== oldHead) return report();
  trace.push('scoped-commit');

  const expected = {
    push: selectedCommit,
    checklist: { taskId: selectedTask, status: 'done' },
    progress: {
      taskId: selectedTask,
      commit: selectedCommit,
      check: 'node --test focused-check.js: pass',
      evidence: 'all Done when items verified',
      next: scenario.lastTask ? 'Story validation' : 'T-02',
    },
    pr: { head: selectedCommit, base: epicBase, draft: true },
  };
  const read = (effect: Effect): unknown => {
    if (effect === 'push') return state.remoteHead;
    if (effect === 'checklist') return state.checklist;
    if (effect === 'progress') return state.progress;
    return state.pr;
  };
  const write = (effect: Effect, value: unknown): void => {
    if (effect === 'push') state.remoteHead = value as string;
    if (effect === 'checklist') state.checklist = value as CheckpointState['checklist'];
    if (effect === 'progress') state.progress = value as CheckpointState['progress'];
    if (effect === 'pr') state.pr = value as CheckpointState['pr'];
  };
  const publish = (effect: Effect): boolean => {
    const fault = scenario.fault?.[effect];
    trace.push(`write:${effect}`);
    if (fault === 'reject') {
      uncertain.push(effect);
      return false;
    }
    if (fault === 'conflict') write(effect, { conflicting: true });
    else if (fault !== 'timeout-unchanged' && fault !== 'timeout-unknown') write(effect, expected[effect]);
    if (fault?.startsWith('timeout') || fault === 'conflict') {
      trace.push(`readback:${effect}`);
      if (fault === 'timeout-unknown' || JSON.stringify(read(effect)) !== JSON.stringify(expected[effect])) {
        uncertain.push(effect);
        return false;
      }
    }
    confirmed.push(effect);
    return true;
  };

  if (!publish('push')) return report();
  if (!publish('checklist')) return report();
  if (!publish('progress')) return report();
  if (state.pr) {
    trace.push('readback:pr');
    if (state.pr.base !== epicBase || !state.pr.draft) {
      uncertain.push('pr');
      return report();
    }
    state.pr.head = selectedCommit;
    confirmed.push('pr');
  } else if (!publish('pr')) return report();

  if (scenario.mismatchedReadback === 'remote') state.remoteHead = 'unexpected-commit';
  if (scenario.mismatchedReadback === 'checklist' && state.checklist) state.checklist.taskId = 'unexpected-task';
  if (scenario.mismatchedReadback === 'progress' && state.progress) state.progress.commit = 'unexpected-commit';
  if (scenario.mismatchedReadback === 'pr' && state.pr) state.pr.head = 'unexpected-commit';
  trace.push('checkpoint-compare');
  if (state.remoteHead !== selectedCommit ||
      state.checklist?.status !== 'done' || state.checklist.taskId !== selectedTask ||
      state.progress?.commit !== selectedCommit || state.progress.taskId !== selectedTask ||
      state.pr?.head !== selectedCommit || state.pr.base !== epicBase) return report();
  return { trace, confirmed, uncertain, handoff: true, nextTask: !scenario.lastTask, state };
}

describe('checked Task remote handoff contract with deterministic fake hosts', () => {

  it('stops a failed check or missing Done-when evidence before commit and push', () => {
    for (const scenario of [{ check: 'fail' as const }, { evidence: false }]) {
      const result = runScenario(scenario);
      assert.deepEqual(result.trace, ['check']);
      assert.equal(result.handoff, false);
      assert.deepEqual(result.confirmed, []);
    }
  });

  it('orders scoped commit, push, matching compact checklist, progress, and first draft PR', () => {
    const result = runScenario();
    assert.deepEqual(result.trace, [
      'check', 'plan-readback', 'branch-readback', 'scoped-commit',
      'write:push', 'write:checklist', 'write:progress', 'write:pr', 'checkpoint-compare',
    ]);
    assert.deepEqual(result.confirmed, ['push', 'checklist', 'progress', 'pr']);
    assert.equal(result.state.remoteHead, commit);
    assert.deepEqual(result.state.checklist, { taskId, status: 'done' });
    assert.deepEqual(result.state.progress, {
      taskId, commit, check: 'node --test focused-check.js: pass',
      evidence: 'all Done when items verified', next: 'T-02',
    });
    assert.deepEqual(result.state.pr, { head: commit, base: epicBase, draft: true });
    assert.equal(result.handoff, true);
    assert.equal(result.nextTask, true);
  });

  it('opens the draft PR even for a one-Task Story, without dispatching another Task', () => {
    const result = runScenario({ lastTask: true });
    assert.equal(result.trace.filter((event) => event === 'write:pr').length, 1);
    assert.equal(result.state.progress?.next, 'Story validation');
    assert.equal(result.handoff, true);
    assert.equal(result.nextTask, false);
  });

  it('refuses handoff when any persisted Task identity or commit hash differs at final comparison', () => {
    for (const mismatchedReadback of ['remote', 'checklist', 'progress', 'pr'] as const) {
      const result = runScenario({ mismatchedReadback });
      assert.equal(result.trace.at(-1), 'checkpoint-compare');
      assert.equal(result.handoff, false, `${mismatchedReadback} mismatch must block handoff`);
      assert.equal(result.nextTask, false);
    }
  });

  it('reuses the existing draft PR for a later Task without duplicate create or continuation prompt', () => {
    const result = runScenario({ task: 'T-02', commit: 'checked-commit-2', existingPr: true });
    assert.equal(result.trace.includes('write:pr'), false);
    assert.equal(result.trace.includes('readback:pr'), true);
    assert.deepEqual(result.state.pr, { head: 'checked-commit-2', base: epicBase, draft: true });
    assert.equal(result.handoff, true);
  });

  it('stops on a changed plan fingerprint or concurrent remote advance before commit', () => {
    const changedPlan = runScenario({ observedPlan: 'reviewed-v2' });
    assert.deepEqual(changedPlan.trace, ['check', 'plan-readback']);
    const advanced = runScenario({ remoteHead: 'other-engineer-commit' });
    assert.deepEqual(advanced.trace, ['check', 'plan-readback', 'branch-readback']);
    for (const result of [changedPlan, advanced]) {
      assert.equal(result.handoff, false);
      assert.equal(result.nextTask, false);
      assert.deepEqual(result.confirmed, []);
    }
  });

  it('separates confirmed push from rejected, timed-out, conflicting, or unknown push', () => {
    for (const fault of ['reject', 'timeout-unchanged', 'timeout-unknown', 'conflict'] as const) {
      const result = runScenario({ fault: { push: fault } });
      assert.deepEqual(result.confirmed, []);
      assert.deepEqual(result.uncertain, ['push']);
      assert.equal(result.trace.includes('write:checklist'), false);
      assert.equal(result.handoff, false);
      if (fault !== 'reject') assert.equal(result.trace.includes('readback:push'), true);
    }
    const applied = runScenario({ fault: { push: 'timeout-applied' } });
    assert.equal(applied.trace.includes('readback:push'), true);
    assert.equal(applied.trace.filter((event) => event === 'write:push').length, 1);
    assert.equal(applied.handoff, true);
  });

  it('reports issue checklist and progress partial effects without a false handoff or blind repeat', () => {
    for (const effect of ['checklist', 'progress'] as const) {
      for (const fault of ['reject', 'timeout-unchanged', 'timeout-unknown', 'conflict'] as const) {
        const result = runScenario({ fault: { [effect]: fault } });
        assert.deepEqual(result.confirmed, effect === 'checklist' ? ['push'] : ['push', 'checklist']);
        assert.deepEqual(result.uncertain, [effect]);
        assert.equal(result.trace.filter((event) => event === `write:${effect}`).length, 1);
        assert.equal(result.trace.includes('write:pr'), false);
        assert.equal(result.handoff, false);
        assert.equal(result.nextTask, false);
        if (fault !== 'reject') assert.equal(result.trace.includes(`readback:${effect}`), true);
      }
      const applied = runScenario({ fault: { [effect]: 'timeout-applied' } });
      assert.equal(applied.trace.includes(`readback:${effect}`), true);
      assert.equal(applied.trace.filter((event) => event === `write:${effect}`).length, 1);
      assert.equal(applied.handoff, true);
    }
  });

  it('stops failed or ambiguous draft-PR creation after confirmed effects, without duplicate create', () => {
    for (const fault of ['reject', 'timeout-unchanged', 'timeout-unknown', 'conflict'] as const) {
      const result = runScenario({ fault: { pr: fault } });
      assert.deepEqual(result.confirmed, ['push', 'checklist', 'progress']);
      assert.deepEqual(result.uncertain, ['pr']);
      assert.equal(result.trace.filter((event) => event === 'write:pr').length, 1);
      assert.equal(result.handoff, false);
      assert.equal(result.nextTask, false);
      if (fault !== 'reject') assert.equal(result.trace.includes('readback:pr'), true);
    }
    const applied = runScenario({ fault: { pr: 'timeout-applied' } });
    assert.equal(applied.trace.filter((event) => event === 'write:pr').length, 1);
    assert.equal(applied.handoff, true);
  });
});
