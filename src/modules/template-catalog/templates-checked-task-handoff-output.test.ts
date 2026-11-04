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

test('shipped guidance anchors state, action, consequence, width, and partial-publication contracts', () => {
  assert.ok(outputContract);
  for (const phrase of [
    'current state → next action → consequence → optional detail',
    'about 40 columns', 'about 80 columns', 'about 120 columns',
    'Check passed. Commit pushed.', 'Story progress updated.',
    'Last checkpoint: Task <n> — checked and pushed',
    'Next work is paused. Check the remote state, then reconcile.',
  ]) assert.ok(outputContract.includes(phrase), `missing guidance: ${phrase}`);
  assert.match(outputContract, /Show the PR line only after confirmed open/);
  assert.match(outputContract, /without a routine permission prompt/);
  assert.match(outputContract, /show `ready for handoff`, `Starting Task`, or an unconfirmed PR link/);
});

test('40-column confirmed first-Task handoff shows checked/pushed/progress hierarchy and confirmed draft PR', () => {
  const message = handoffMessage(40, { ...confirmed, task: 1, next: 2, prRequired: true });
  assert.deepEqual(message.split('\n'), [
    'Task 1 ready for handoff', 'Check passed. Commit pushed.', 'Story progress updated.',
    'Story: https://github.test/issues/12', 'Draft PR: https://github.test/pull/3', 'Starting Task 2',
  ]);
});

test('80- and 120-column later-Task continuation adds orientation without a decision prompt', () => {
  for (const width of [80, 120] as const) {
    const message = handoffMessage(width, confirmed);
    assert.match(message, /Last checkpoint: Task 3 — checked and pushed/);
    assert.match(message, /Next: Task 4/);
    assert.match(message, /Story: https:\/\/github\.test\/issues\/12/);
    assert.match(message, /Draft PR: https:\/\/github\.test\/pull\/3/);
    assert.ok(message.endsWith('Starting Task 4'));
    assert.doesNotMatch(message, /\?|continue\?/i);
  }
});

test('rejected or uncertain push, issue update, or first-Task PR pauses without false success or link', () => {
  const states: Publication[] = [
    { ...confirmed, pushed: false },
    { ...confirmed, checklist: false },
    { ...confirmed, progress: false },
    { ...confirmed, task: 1, prRequired: true, prConfirmed: false },
  ];
  for (const state of states) {
    for (const width of [40, 80, 120] as const) {
      const message = handoffMessage(width, state);
      assert.match(message, /^Task \d+ publication incomplete/);
      assert.match(message, /Next work is paused/);
      assert.doesNotMatch(message, /ready for handoff|Starting Task|Draft PR: https:/);
      if (!state.pushed) assert.doesNotMatch(message, /Commit pushed:/);
      if (!state.checklist || !state.progress) assert.doesNotMatch(message, /Story progress updated/);
    }
  }
});

test('later-Task handoff pauses when its existing draft PR is not confirmed', () => {
  const message = handoffMessage(40, { ...confirmed, prConfirmed: false });
  assert.match(message, /Task 3 publication incomplete/);
  assert.match(message, /Draft PR not confirmed/);
  assert.doesNotMatch(message, /ready for handoff|Draft PR: https:/);
});
