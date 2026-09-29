import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const reviewer = readTemplate('skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md');

describe('exact Story-plan review and human gate', () => {
  it('reviews the plan before execution rather than an implementation diff', () => {
    assert.match(gatekeeper, /before any executor starts/i);
    assert.match(gatekeeper, /independent read-only architecture review of that plan/i);
    assert.match(gatekeeper, /Do not send a code diff, changed-file list, executor validation summary/i);
    assert.match(gatekeeper, /Do not introduce automatic code review or a post-code architecture-review\/repair loop/i);
    assert.doesNotMatch(gatekeeper, /## Automated implementation review loop/i);
    assert.match(gatekeeper, /preserve the human Story review/i);
  });

  it('keeps reviewable plan version separate from execution state', () => {
    for (const item of ['source decisions', 'acceptance-criteria coverage', 'Milestone outcomes', 'Task scopes/dependencies', 'prescribed executable check']) {
      assert.match(gatekeeper, new RegExp(item, 'i'));
    }
    assert.match(gatekeeper, /Exclude execution-only Task status, Milestone progress, run log, commit references/i);
    assert.match(gatekeeper, /Compare the reviewable identity at reviewer dispatch, presentation of the human choice, human acceptance, and every executor dispatch/i);
    assert.match(gatekeeper, /Status\/progress-only changes do not/i);
    assert.match(gatekeeper, /If separation is ambiguous.*pause and clarify/i);
  });

  it('blocks unreviewed, deferred, revised, or stale plans but allows explicit accepted risk', () => {
    assert.match(gatekeeper, /accept with explicitly visible warnings/i);
    assert.match(gatekeeper, /request revision.*defer/i);
    assert.match(gatekeeper, /warning does not automatically veto an informed human acceptance/i);
    assert.match(gatekeeper, /Revision returns to the planner and a fresh review cycle; deferral leaves execution stopped/i);
    assert.match(gatekeeper, /missing review, missing\/ambiguous identity, changed plan, or absent explicit human acceptance blocks executor dispatch/i);
    assert.match(gatekeeper, /compare it again immediately before each executor dispatch/i);
  });

  it('does not waive a missing Task check when the human accepts warnings', () => {
    assert.match(gatekeeper, /Before any executor dispatch, verify that every Task in the accepted plan has its own specific, objective, executable pass\/fail check/i);
    assert.match(gatekeeper, /missing, vague, or non-executable Task check is a non-waivable plan defect/i);
    assert.match(gatekeeper, /stop dispatch even if the human accepted the plan with visible warnings/i);
    assert.match(gatekeeper, /Return it to the planner to split or clarify the Task, or move genuinely judgment-based work to a human-reviewed Milestone/i);
    assert.match(gatekeeper, /fresh architecture review and human decision on the revised plan/i);
    assert.match(gatekeeper, /other genuinely waivable risks available for informed human acceptance/i);
  });

  it('preserves separate human Story review and excludes later Git behavior', () => {
    assert.match(gatekeeper, /Story review is distinct from the earlier human plan decision/i);
    assert.match(gatekeeper, /Wait for explicit Story-level approval before marking steps approved, committing/i);
    assert.match(gatekeeper, /Do not add a runtime module, persistent hash helper, branch, Task commit, or PR for this Story/i);
    assert.match(gatekeeper, /If requested work changes reviewable plan content, repeat the independent plan review/i);
  });

  it('requires a fresh read-only reviewer and plain-language finding presentation', () => {
    assert.match(gatekeeper, /fresh `sibu-architecture-reviewer` exactly one Story and one plan folder/i);
    assert.match(gatekeeper, /source-verified \*\*start here\*\*/i);
    assert.match(gatekeeper, /independently verifies the full authoritative sources and plan/i);
    assert.match(gatekeeper, /what is wrong, why it matters, and the smallest practical fix/i);
    assert.match(gatekeeper, /unresolved risks even for an otherwise clean review/i);
    assert.match(reviewer, /only the human can accept this reviewed version and visible risks/i);
  });
});
