import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const toolbox = readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md');
const planner = readTemplate('skills/ai-implementation-planner/SKILL.md');
const plannerToolbox = readTemplate('skills/ai-implementation-planner-toolbox/SKILL.md');

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/checked-task-execution/${name}.md`, import.meta.url), 'utf8');
}

describe('checked Task execution template contract', () => {
  it('gates branch creation and one fresh Task dispatch on accepted plan identity', () => {
    assert.match(fixture('accepted-story'), /reviewed plan v1 accepted by human/);
    assert.match(fixture('accepted-story'), /second fresh worker receives T-02/);
    assert.match(gatekeeper, /Before branch creation and each dispatch, compare the accepted reviewable plan identity/i);
    assert.match(gatekeeper, /create or select one dedicated Story branch/i);
    assert.match(gatekeeper, /Dispatch exactly the next ordered Task to a \*\*fresh\*\* `sibu-implementation-executor` context/i);
    assert.match(gatekeeper, /conventions, recent progress, named skills, and exact optional source pointers/i);
    assert.match(gatekeeper, /an unresolved blocker stops the Story/i);
  });

  it('stops before unsafe branch or missing-check execution', () => {
    assert.match(fixture('blocked-story'), /unaccepted or its reviewed identity changed/);
    for (const risk of ['branch collisions', 'unrelated staged', 'unavailable source control/isolation', 'real-credential need']) {
      assert.match(gatekeeper, new RegExp(risk));
    }
    assert.match(gatekeeper, /Task lacks its prescribed executable check and expected evidence.*stop for plan review/i);
    assert.match(gatekeeper, /never stash, reset, rebase, overwrite, force-add ignored files/i);
    assert.match(toolbox, /If branch\/index\/worktree state is unsafe or isolation is unavailable, stop/i);
  });

  it('runs a fixed check and allows zero, one, or two fix-and-rerun attempts, not a third', () => {
    assert.match(toolbox, /Run the exact prescribed check after implementation/i);
    assert.match(toolbox, /at most \*\*two\*\* evidence-guided, in-scope fixes, rerunning that same check after each fix/i);
    assert.match(toolbox, /Do not retry an unchanged failing command, weaken or replace the check/i);
    assert.match(toolbox, /After two failed fixes or an unresolved evidence gap, stop without marking done or making a completed-Task commit/i);
    assert.match(toolbox, /Stop immediately for missing\/changed check, ambiguous or contradictory evidence, work outside the owning area or accepted Task outcome/i);
  });

  it('treats planned paths as hints while keeping module and safety boundaries', () => {
    assert.match(gatekeeper, /file list guides navigation, not an exhaustive edit allowlist/i);
    assert.match(toolbox, /planned file paths as expected touchpoints, not an exhaustive edit allowlist/i);
    assert.match(toolbox, /directly necessary adjacent type, implementation, or test within the owning module\/area/i);
    assert.match(toolbox, /Explain and validate each unlisted file in the Task report/i);
    assert.match(toolbox, /Stop for unrelated modules, destructive actions, secret or credential exposure/i);
  });

  it('allows only a passing scoped Task commit, then durable progress', () => {
    assert.match(toolbox, /Only after every assigned check passes \*\*and every expected evidence item is supported\*\*, stage \*\*only Task-owned eligible files\*\* \(including justified adjacent files\)/i);
    assert.match(toolbox, /inspect staged paths and diff for unrelated or ignored work/i);
    assert.match(toolbox, /one Conventional Commit referencing the Task ID on the Story branch/i);
    assert.match(toolbox, /Append a compact progress entry \*\*after\*\* commit with actual check command\/result, evidence coverage, commit reference, gotchas, and decisions/i);
    assert.match(toolbox, /On blocker, record check, attempts, missing evidence, and reason in progress without a done state or completed-Task commit/i);
    assert.match(gatekeeper, /Already checked Task commits do not confer Story approval/i);
  });

  it('checks expected evidence before commit and recovers a bounded post-commit gap through a new reviewed Task', () => {
    assert.match(toolbox, /Compare the actual tests, assertions, and results with \*\*each\*\* Task `Done when` item and expected evidence/i);
    assert.match(toolbox, /command exit zero alone does not complete the Task/i);
    assert.match(gatekeeper, /each expected evidence item against actual tests and assertions/i);
    assert.match(gatekeeper, /record the gap and leave the Milestone incomplete/i);
    assert.match(gatekeeper, /send the gap to `ai-implementation-planner` for the smallest follow-up checked Task/i);
    assert.match(gatekeeper, /fresh independent \*\*plan-only\*\* architecture review/i);
    assert.match(gatekeeper, /do not ask the human merely because the gap was noticed after commit/i);
    assert.match(gatekeeper, /Stop for non-convergence, an unexecutable check, failed prescribed validation/i);
    assert.match(gatekeeper, /does not authorize broad code review, a second commit for the original Task/i);
    assert.match(gatekeeper, /post-commit evidence gap and follow-up Task disposition/i);
  });

  it('plans a bounded same-Story regression repair without losing a blocked Task or its failed check', () => {
    const agents = readTemplate('AGENTS.md');
    const manifest = readTemplateManifest();

    assert.match(agents, /bounded same-Story regression found by a failed check/i);
    assert.match(agents, /Unresolved failures, material decisions, unsafe state, or non-convergence still stop/i);
    assert.match(gatekeeper, /clearly attributable regression from an earlier checked Task in the same Story/i);
    assert.match(gatekeeper, /Send the regression to `ai-implementation-planner` for a separate, ordered follow-up checked Task/i);
    assert.match(gatekeeper, /fresh independent \*\*plan-only\*\* architecture review of the changed reviewable identity/i);
    assert.match(gatekeeper, /preserved edits.*unstaged, and path-disjoint from the repair/i);
    assert.match(gatekeeper, /resume the original Task in a fresh executor context.*rerun its failed check/i);
    assert.match(toolbox, /Never modify, stage, or commit those preserved edits/i);
    assert.match(planner, /Do not require or invent a prior reviewer finding/i);
    assert.match(plannerToolbox, /failed check and evidence, attribution to an earlier checked Task in the same Story/i);
    assert.match(manifest.templates['AGENTS.md']?.changes.join('') ?? '', /same-Story validation regressions/i);
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /same-Story validation regressions/i);
  });

  it('requires declared flag checks and stops on an undeclared flag', () => {
    assert.match(fixture('declared-flag'), /exact off and on checks/);
    assert.match(fixture('declared-flag'), /no-reference check/);
    assert.match(fixture('undeclared-flag'), /stop immediately/);
    assert.match(toolbox, /assigned flag-off and flag-on checks/);
    assert.match(toolbox, /supplied no-reference check/);
    assert.match(toolbox, /An undeclared flag need blocks immediately/);
  });

  it('ships the same narrow authority through all three wrappers and versioned templates', () => {
    const manifest = readTemplateManifest();
    const paths = [
      '.codex/agents/sibu-implementation-executor.toml',
      '.claude/agents/sibu-implementation-executor.md',
      '.gemini/agents/sibu-implementation-executor.md',
    ];
    for (const path of paths) {
      const wrapper = readTemplate(path);
      assert.match(wrapper, /checked-task.*one ordered Task/i);
      assert.match(wrapper, /Task-ID commit only after pass/i);
      assert.match(wrapper, /Never approve your own work.*stash, reset/i);
      assert.match(manifest.templates[path]?.changes.join('') ?? '', /checked Task/i);
    }
    assert.match(manifest.templates['AGENTS.md']?.changes.join('') ?? '', /post-commit evidence recovery/);
    assert.match(manifest.templates['skills/ai-implementation-executor-toolbox/SKILL.md']?.changes.join('') ?? '', /Task/i);
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /post-commit Task evidence gaps/);
    assert.match(readTemplate('AGENTS.md'), /checked-Task executor may commit only its scoped Task after the prescribed check passes/i);
  });
});
