import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

type Route = 'same-task' | 'prerequisite' | 'follow-up' | 'stop';
type Case = {
  name: string;
  attribution: 'pre-existing' | 'earlier-task' | 'host' | 'unresolved';
  overlap: boolean;
  safe: boolean;
  reviewed: boolean;
  currentHeads: boolean;
  currentEvidence: boolean;
  currentPlan?: boolean;
  converging?: boolean;
  expected: Route;
};

const cases: Case[] = [
  { name: 'reviewed pre-existing overlap', attribution: 'pre-existing', overlap: true, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'same-task' },
  { name: 'reviewed pre-existing path-disjoint prerequisite', attribution: 'pre-existing', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'prerequisite' },
  { name: 'reviewed earlier-Task path-disjoint regression', attribution: 'earlier-task', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'follow-up' },
  { name: 'earlier-Task overlap remains the blocked Task', attribution: 'earlier-task', overlap: true, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'same-task' },
  { name: 'missing fresh review', attribution: 'pre-existing', overlap: false, safe: true, reviewed: false, currentHeads: true, currentEvidence: true, expected: 'stop' },
  { name: 'changed head', attribution: 'pre-existing', overlap: false, safe: true, reviewed: true, currentHeads: false, currentEvidence: true, expected: 'stop' },
  { name: 'changed plan identity', attribution: 'pre-existing', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, currentPlan: false, expected: 'stop' },
  { name: 'unsafe index or edit ownership', attribution: 'earlier-task', overlap: false, safe: false, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'stop' },
  { name: 'stale checks or missing Done when evidence', attribution: 'pre-existing', overlap: true, safe: true, reviewed: true, currentHeads: true, currentEvidence: false, expected: 'stop' },
  { name: 'host or test-runner cause', attribution: 'host', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'stop' },
  { name: 'unresolved cause', attribution: 'unresolved', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, expected: 'stop' },
  { name: 'non-converging attempts', attribution: 'earlier-task', overlap: false, safe: true, reviewed: true, currentHeads: true, currentEvidence: true, converging: false, expected: 'stop' },
];

function route(scenario: Case): Route {
  if (!scenario.safe || !scenario.reviewed || !scenario.currentHeads || !scenario.currentEvidence || scenario.currentPlan === false || scenario.converging === false) return 'stop';
  if (scenario.attribution === 'host' || scenario.attribution === 'unresolved') return 'stop';
  if (scenario.overlap) return 'same-task';
  return scenario.attribution === 'pre-existing' ? 'prerequisite' : 'follow-up';
}

const names = ['ai-implementation-plan-executor', 'ai-implementation-planner', 'ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox'] as const;
const template = Object.fromEntries(names.map((name) => [name, readTemplate(`skills/${name}/SKILL.md`)])) as Record<(typeof names)[number], string>;
const installed = Object.fromEntries(names.map((name) => [name, readFileSync(new URL(`../../../.agents/skills/${name}/SKILL.md`, import.meta.url), 'utf8')])) as Record<(typeof names)[number], string>;
const main = template['ai-implementation-plan-executor'];
const planner = template['ai-implementation-planner'];
const plannerWorker = template['ai-implementation-planner-toolbox'];
const executorWorker = template['ai-implementation-executor-toolbox'];

function includesAll(text: string, phrases: string[]): void {
  for (const phrase of phrases) assert.ok(text.includes(phrase), `missing contract: ${phrase}`);
}

describe('AFK reviewed recovery guidance and disposable scenarios', () => {
  for (const scenario of cases) {
    it(scenario.name, () => assert.equal(route(scenario), scenario.expected));
  }

  it('AC-01: reviewed prerequisite follows inventory, isolated baseline, planner, and exact-identity review', () => {
    includesAll(main, ['complete grouped failure inventory', 'isolated comparison at the observed Epic head', 'pre-existing failure', 'checked prerequisite', 'new exact reviewable plan identity', 'fresh independent', 'plan-only', 'Before **each** dispatch']);
    assert.ok(main.indexOf('complete grouped failure inventory') < main.indexOf('Ask the planner for the smallest revision'));
    assert.ok(main.indexOf('Ask the planner for the smallest revision') < main.indexOf('Before **each** dispatch'));
  });

  it('AC-02: overlap preserves original Task, unstaged edits, and one commit', () => {
    for (const text of [main, planner, plannerWorker, executorWorker]) {
      includesAll(text, ['pre-existing', 'same', 'Task', 'preserved', 'unstaged', 'commit']);
    }
    includesAll(executorWorker, ['original goal', 'prescribed check', 'expected evidence', 'single eventual scoped commit']);
  });

  it('AC-03: disjoint prerequisite or earlier-Task repair has a separate checked commit and resumes later', () => {
    for (const text of [main, planner, plannerWorker, executorWorker]) {
      includesAll(text, ['path-disjoint', 'pre-existing', 'earlier', 'checked', 'commit']);
    }
    includesAll(main, ['resume the blocked Task in fresh context', 'own passing executable check']);
  });

  it('preserves blocked edits and excludes them from a disjoint repair commit', () => {
    const blockedEdits = new Set(['src/blocked.ts', 'src/blocked.test.ts']);
    const repairPaths = new Set(['src/earlier.ts', 'src/earlier.test.ts']);
    const index = new Set<string>();
    assert.equal(index.size, 0);
    assert.ok([...repairPaths].every((path) => !blockedEdits.has(path)));
    const scopedCommit = [...repairPaths];
    assert.ok(scopedCommit.every((path) => !blockedEdits.has(path)));
    includesAll(main, ['every preserved unstaged path and index state', 'scoped commit must exclude the blocked edits']);
    includesAll(executorWorker, ['Before staging, verify the packet', 'excluding the blocked Task']);
  });

  it('AC-04: original goal, every Done when item, stale checks, and current results gate advance', () => {
    includesAll(main, ['original goal', 'exact prescribed check', 'every `Done when` item', 'previously passing final checks', 'Only current passing evidence']);
    includesAll(executorWorker, ['original goal', '**every** `Done when` item', 'made stale by changed paths']);
  });

  it('AC-05: unsafe state, ambiguity, material decisions, and non-convergence stop', () => {
    includesAll(main, ['Changed heads or identity', 'staged/unrelated/ambiguous edits', 'material decision', 'non-converging attempts', 'focused human decision', 'host/test-runner failure or unresolved classification']);
    includesAll(executorWorker, ['Changed plan identity or heads', 'unrelated/staged/ambiguous edits', 'failed checks', 'non-convergence stop']);
  });

  it('managed installed guidance matches distributed text; customized planner is protected', () => {
    const anchors = {
      'ai-implementation-plan-executor': '### AFK reviewed recovery after blocked checks',
      'ai-implementation-planner-toolbox': 'For AFK blocked-check recovery revisions',
      'ai-implementation-executor-toolbox': 'For AFK recovery, keep the main-agent route',
    } as const;
    for (const [name, anchor] of Object.entries(anchors)) {
      const expected = template[name as keyof typeof anchors];
      const actual = installed[name as keyof typeof anchors];
      assert.ok(expected.includes(anchor) && actual.includes(anchor));
      assert.equal(actual.slice(actual.indexOf(anchor), actual.indexOf('\n\n', actual.indexOf(anchor))), expected.slice(expected.indexOf(anchor), expected.indexOf('\n\n', expected.indexOf(anchor))), `${name} recovery gate differs`);
    }
    includesAll(installed['ai-implementation-planner'], ['same Task', 'preserved unstaged edit inventory', 'fresh independent plan-only review']);
    includesAll(planner, ['pre-existing failure', 'path-disjoint pre-existing prerequisite', 'Host/test-runner']);
  });
});
