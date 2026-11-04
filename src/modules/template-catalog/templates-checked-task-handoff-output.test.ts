import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readTemplate } from './index.js';

const guidance = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const outputContract = guidance.split('### Checked-Task handoff output')[1]?.split('### AFK blocked-check diagnosis')[0];

type Publication = {
  task: number;
  next: number;
  pushed: boolean;
  checklist: boolean;
  progress: boolean;
  prRequired: boolean;
  prConfirmed: boolean;
};

function handoffMessage(width: 40 | 80 | 120, state: Publication): string {
  const confirmed = state.pushed && state.checklist && state.progress &&
    (!state.prRequired || state.prConfirmed);
  if (!confirmed) {
    const facts = [
      `Task ${state.task} publication incomplete`,
      state.pushed ? 'Commit pushed: abc123' : 'Commit push not confirmed',
      state.checklist && state.progress ? 'Story progress updated.' : 'Story progress not confirmed',
      state.prRequired && !state.prConfirmed ? 'Draft PR not confirmed' : '',
      'Next work is paused. Check the remote state, then reconcile.',
    ];
    return facts.filter(Boolean).join('\n');
  }

  const story = 'Story: https://github.test/issues/12';
  const pr = state.prConfirmed ? 'Draft PR: https://github.test/pull/3' : '';
  if (width === 40) {
    return [
      `Task ${state.task} ready for handoff`,
      'Check passed. Commit pushed.',
      'Story progress updated.',
      story, pr, `Starting Task ${state.next}`,
    ].filter(Boolean).join('\n');
  }
  if (width === 80) {
    return [
      'Feature / Story',
      `Last checkpoint: Task ${state.task} — checked and pushed`,
      `Next: Task ${state.next}`,
      [story, pr].filter(Boolean).join('   '),
      `Starting Task ${state.next}`,
    ].join('\n');
  }
  return [
    'Feature / Story',
    `Last checkpoint: Task ${state.task} — checked and pushed  |  Next: Task ${state.next}`,
    [story, pr].filter(Boolean).join('  |  '),
    `Starting Task ${state.next}`,
  ].join('\n');
}

const confirmed: Publication = {
  task: 3, next: 4, pushed: true, checklist: true, progress: true,
  prRequired: true, prConfirmed: true,
};


test('40-column confirmed first-Task handoff shows checked/pushed/progress hierarchy and confirmed draft PR', () => {
  const message = handoffMessage(40, { ...confirmed, task: 1, next: 2, prRequired: true });
  assert.deepEqual(message.split('\n'), [
    'Task 1 ready for handoff', 'Check passed. Commit pushed.', 'Story progress updated.',
    'Story: https://github.test/issues/12', 'Draft PR: https://github.test/pull/3', 'Starting Task 2',
  ]);
});
