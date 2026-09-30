import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const toolbox = readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md');

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
    assert.match(gatekeeper, /blocker stops the Story/i);
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
    assert.match(toolbox, /After two failed fixes, stop without marking done or making a completed-Task commit/i);
    assert.match(toolbox, /Stop immediately for missing\/changed check, ambiguous or contradictory evidence, scope expansion/i);
  });

  it('allows only a passing scoped Task commit, then durable progress', () => {
    assert.match(toolbox, /Only after every assigned check passes, stage \*\*only Task-owned eligible files\*\*/i);
    assert.match(toolbox, /inspect staged paths and diff for unrelated or ignored work/i);
    assert.match(toolbox, /one Conventional Commit referencing the Task ID on the Story branch/i);
    assert.match(toolbox, /Append a compact progress entry \*\*after\*\* commit with actual check command\/result, commit reference, gotchas, and decisions/i);
    assert.match(toolbox, /On blocker, record check, attempts, and reason in progress without a done state or completed-Task commit/i);
    assert.match(gatekeeper, /Already checked Task commits do not confer Story approval/i);
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
    assert.match(manifest.templates['AGENTS.md']?.changes.join('') ?? '', /exact Story plan/);
    assert.match(manifest.templates['skills/ai-implementation-executor-toolbox/SKILL.md']?.changes.join('') ?? '', /Task/i);
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /clean, risk-free architecture-reviewed Story plans/);
    assert.match(readTemplate('AGENTS.md'), /checked-Task executor may commit only its scoped Task after the prescribed check passes/i);
  });
});
