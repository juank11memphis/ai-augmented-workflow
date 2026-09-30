import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const reviewer = readTemplate('skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md');

describe('exact Story-plan review and conditional acceptance gate', () => {
  it('reviews the plan before execution rather than an implementation diff', () => {
    assert.match(gatekeeper, /before the first executor dispatch/i);
    assert.match(gatekeeper, /independent read-only architecture review/i);
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
    assert.match(gatekeeper, /Compare the reviewable identity at reviewer dispatch, review-packet receipt, acceptance \(automatic or human\), and every executor dispatch/i);
    assert.match(gatekeeper, /For a review requiring human choice, compare it again at presentation and human acceptance/i);
    assert.match(gatekeeper, /Status\/progress-only changes do not/i);
    assert.match(gatekeeper, /If separation is ambiguous.*pause and clarify/i);
  });

  it('automatically accepts only a complete risk-free review and immediately proceeds', () => {
    assert.match(gatekeeper, /no findings in any required category and no unresolved risks/i);
    assert.match(gatekeeper, /Record that it was accepted through the clean-review path; do not ask for human plan approval/i);
    assert.match(gatekeeper, /Immediately continue to the Story branch and first Task/i);
    assert.match(gatekeeper, /Silence, a vague "clean" label, missing category, malformed packet, unassessed concern, or missing check is not a clean review/i);
  });

  it('blocks unreviewed, deferred, revised, or stale plans but allows explicit accepted risk', () => {
    assert.match(gatekeeper, /accept with explicitly visible warnings/i);
    assert.match(gatekeeper, /request revision.*defer/i);
    assert.match(gatekeeper, /warning does not automatically veto informed human acceptance/i);
    assert.match(gatekeeper, /Revision returns to the planner and a fresh review cycle; deferral leaves execution stopped/i);
    assert.match(gatekeeper, /finding or unresolved risk requires explicit human acceptance of that exact version before execution/i);
    assert.match(gatekeeper, /missing review, missing\/ambiguous identity, changed plan, or missing applicable acceptance blocks executor dispatch/i);
    assert.match(gatekeeper, /compare it again immediately before each executor dispatch/i);
  });

  it('does not waive a missing Task check on either acceptance path', () => {
    assert.match(gatekeeper, /Before any executor dispatch, verify that every Task in the accepted plan has its own specific, objective, executable pass\/fail check/i);
    assert.match(gatekeeper, /missing, vague, or non-executable Task check is a non-waivable plan defect/i);
    assert.match(gatekeeper, /stop dispatch even if the review otherwise appears clean or the human accepted visible warnings/i);
    assert.match(gatekeeper, /Return it to the planner to split or clarify the Task; if judgment is needed before safe continuation, stop for a human decision/i);
    assert.match(gatekeeper, /fresh architecture review and apply the conditional decision to the revised plan/i);
    assert.match(gatekeeper, /other genuinely waivable risks available for informed human acceptance/i);
  });

  it('keeps final PR review distinct from plan acceptance and excludes runtime machinery', () => {
    assert.match(gatekeeper, /PR is the final Milestone and Story review surface/i);
    assert.match(gatekeeper, /Present the PR for one explicit.*decision/i);
    assert.match(gatekeeper, /Acceptance alone permits approval metadata and any remaining eligible final Story commit/i);
    assert.match(gatekeeper, /There is no separate post-PR approval/i);
    assert.match(gatekeeper, /Do not add a runtime module or persistent hash helper/i);
    assert.match(gatekeeper, /fresh independent plan-only architecture review and apply the same clean-review or human-decision rule to the revised identity before executor dispatch/i);
  });

  it('requires a fresh read-only reviewer and plain-language finding presentation', () => {
    assert.match(gatekeeper, /fresh `sibu-architecture-reviewer` exactly one Story and one plan folder/i);
    assert.match(gatekeeper, /source-verified \*\*start here\*\*/i);
    assert.match(gatekeeper, /independently verifies the full authoritative sources and plan/i);
    assert.match(gatekeeper, /top-level bullet with three indented bullets.*What it means.*Why it matters.*Fix/i);
    assert.match(gatekeeper, /Preserve unresolved risks even when no blocking finding exists/i);
    assert.match(reviewer, /main agent conditionally accepts an exact plan only after verifying a complete packet with no findings or unresolved risks; findings or risks require explicit human acceptance/i);
  });
});
