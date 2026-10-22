import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const paths = {
  planner: 'skills/ai-implementation-planner/SKILL.md',
  plannerWorker: 'skills/ai-implementation-planner-toolbox/SKILL.md',
  executor: 'skills/ai-implementation-plan-executor/SKILL.md',
  executorWorker: 'skills/ai-implementation-executor-toolbox/SKILL.md',
  eval: 'skills/eval-authoring/SKILL.md',
} as const;

const guidance = Object.fromEntries(
  Object.entries(paths).map(([role, path]) => [role, readTemplate(path)]),
) as Record<keyof typeof paths, string>;

type Decision = {
  id: string;
  gate: string;
  choice: string;
  scope: string;
  humanConfirmed: boolean;
};

// Fixture oracle for the documented contract, not a simulation of agent behavior.
function reusable(record: Decision | undefined, current: Omit<Decision, 'id' | 'humanConfirmed'>): boolean {
  return Boolean(record?.humanConfirmed
    && record.gate === current.gate
    && record.choice === current.choice
    && record.scope === current.scope);
}

const target = { gate: 'eval target-confirmation', choice: 'Prompt A', scope: 'Feature A' };
const coverage = {
  gate: 'eval coverage approval',
  choice: 'safety, failures; rubric; simulated tools; excluded latency',
  scope: 'Prompt A in Feature A',
};
const confirmedTarget: Decision = { id: 'FD-01', ...target, humanConfirmed: true };
const approvedCoverage: Decision = { id: 'FD-02', ...coverage, humanConfirmed: true };

test('planner and fresh Task packets carry IDs and exact SDD pointers, but consumers re-read the governing record', () => {
  for (const role of ['planner', 'plannerWorker', 'executor', 'executorWorker'] as const) {
    assert.match(guidance[role], /Feature Decision/);
    assert.match(guidance[role], /IDs? and exact .*SDD path\/section pointers|IDs and exact SDD path\/section pointers|IDs and SDD pointers/);
    assert.match(guidance[role], /governing SDD record|authoritative SDD record/);
    assert.match(guidance[role], /named .*gate|named gate/);
    assert.match(guidance[role], /choice/);
    assert.match(guidance[role], /scope/);
    assert.match(guidance[role], /packet summary|navigation/);
  }
  assert.match(guidance.plannerWorker, /Story steps and curated source packets for fresh checked Tasks/);
  assert.match(guidance.executor, /fresh checked-Task packets/);
});

test('unchanged matching gate, choice, and scope avoid duplicate approval, including targets and coverage', () => {
  assert.equal(reusable(confirmedTarget, target), true);
  assert.equal(reusable(approvedCoverage, coverage), true);
  for (const role of ['planner', 'plannerWorker', 'executor', 'executorWorker', 'eval'] as const) {
    assert.match(guidance[role], /unchanged.*match|unchanged.*matching/i);
    assert.match(guidance[role], /no duplicate|without asking again/);
  }
  assert.match(guidance.eval, /separately verify.*Eval Coverage Plan Feature Decision/);
});

test('missing, ambiguous, changed, and newly discovered gates stop only affected work for a new human answer', () => {
  const missing = undefined;
  const ambiguous = { ...confirmedTarget, humanConfirmed: false };
  const changedChoice = { ...confirmedTarget, choice: 'Prompt B' };
  const changedScope = { ...confirmedTarget, scope: 'Feature B' };
  const newGate = { ...target, gate: 'new eval gate' };
  for (const record of [missing, ambiguous, changedChoice, changedScope]) {
    assert.equal(reusable(record, target), false);
  }
  assert.equal(reusable(confirmedTarget, newGate), false);
  assert.equal(reusable(approvedCoverage, coverage), true, 'unrelated valid decision remains usable');
  for (const role of ['planner', 'plannerWorker', 'executor', 'executorWorker', 'eval'] as const) {
    assert.match(guidance[role], /missing|absent/);
    assert.match(guidance[role], /ambiguous/);
    assert.match(guidance[role], /materially changed/);
    assert.match(guidance[role], /newly/);
    assert.match(guidance[role], /only affected|only the affected/);
    assert.match(guidance[role], /explicit human answer|explicit renewed human approval/);
    assert.match(guidance[role], /edited record|edit alone/);
  }
});

test('unrelated SDD prose edits leave the approved decision usable, not SDD-wide approval', () => {
  const before = { prose: 'Initial introduction', decisions: [confirmedTarget, approvedCoverage] };
  const after = { ...before, prose: 'Reworded introduction' };
  assert.deepEqual(after.decisions, before.decisions);
  assert.equal(reusable(after.decisions[0], target), true);
  assert.equal(reusable(after.decisions[1], coverage), true);
  for (const role of ['planner', 'plannerWorker', 'executor', 'executorWorker', 'eval'] as const) {
    assert.match(guidance[role], /unrelated SDD prose|unrelated prose/i);
    assert.match(guidance[role], /generic SDD approval|generic SDD sign-off|SDD-wide approval/);
  }
});

test('planned eval needs both matching approvals; independent eval retains both questions and targets alone deny writes', () => {
  assert.equal(reusable(confirmedTarget, target) && reusable(undefined, coverage), false);
  assert.match(guidance.eval, /Independent eval authoring without an applicable feature SDD still requires the target-confirmation question/);
  assert.match(guidance.eval, /Independent eval authoring without an applicable SDD still requires the coverage-approval question/);
  assert.match(guidance.eval, /target confirmation alone never authorizes artifact writes/);
  for (const detail of ['targets', 'scenarios and risk categories', 'grading', 'simulated tool behavior', 'gaps or exclusions', 'scope']) {
    assert.ok(guidance.eval.includes(detail), detail);
  }
});

test('Feature Decisions cannot bypass operational or final Epic gates', () => {
  for (const role of ['executor', 'executorWorker', 'eval'] as const) {
    for (const gate of [/Git/i, /model[- ]routes?/i, /credentials?/i, /external\/destructive/i, /final/i, /Epic/i]) {
      assert.match(guidance[role], gate, `${role}: ${gate}`);
    }
  }
  assert.match(guidance.executor, /changed-plan independent review/);
  assert.match(guidance.executorWorker, /changed-plan independent review/);
});

test('manifest bumps every changed template with replacement user-facing current-version sync notes', () => {
  const manifest = readTemplateManifest();
  assert.equal(manifest.templateVersion, '248');
  const versions = { planner: '36', plannerWorker: '24', executor: '79', executorWorker: '31', eval: '11' };
  for (const role of Object.keys(paths) as (keyof typeof paths)[]) {
    const template = manifest.templates[paths[role]];
    assert.equal(template?.version, versions[role], role);
    assert.equal(template?.changes.length, 1, role);
    assert.match(
      template.changes[0] ?? '',
      role === 'executor' ? /Starts the first unintegrated Story.*separate human start prompt/ : /Feature Decision|eval targets and coverage/,
    );
    assert.doesNotMatch(template.changes[0] ?? '', /Extends same-Task|Reports named Epic checks|byte-exact capture/);
  }
});
