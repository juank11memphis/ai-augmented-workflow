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
    assert.match(gatekeeper, /This is a completion-evidence check, not an automatic implementation-code review/i);
    assert.doesNotMatch(gatekeeper, /## Automated implementation review loop/i);
    assert.match(gatekeeper, /Preserve the verified Story integration gate below/);
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

  it('revises actionable plan findings without a numeric loop cap or premature execution', () => {
    assert.match(gatekeeper, /actionable, source-aligned finding or risk with a clear smallest adequate fix/i);
    assert.match(gatekeeper, /send the reviewer packet, reviewed identity, and fix to `ai-implementation-planner`/i);
    assert.match(gatekeeper, /planner—not the reviewer or code executor—revises only the affected plan content/i);
    assert.match(gatekeeper, /fresh independent plan-only review/i);
    assert.match(gatekeeper, /there is no fixed iteration limit/i);
    assert.match(gatekeeper, /never dispatch a code executor during this loop/i);
    assert.match(gatekeeper, /same finding remains without a substantive plan change or the latest review shows no progress; stop/i);
    assert.match(gatekeeper, /stop for a finding or risk whose fix requires an unresolved product, architecture, security, privacy, persisted-data, dependency, or scope decision/i);
    assert.match(gatekeeper, /explicit human acceptance of the unchanged reviewed identity is required to proceed with residual findings or risks/i);
    assert.match(gatekeeper, /compare it again immediately before each executor dispatch/i);
  });

  it('does not waive a missing Task check on either acceptance path', () => {
    assert.match(gatekeeper, /Before any executor dispatch, verify that every Task in the accepted plan has its own specific, objective, executable pass\/fail check/i);
    assert.match(gatekeeper, /missing, vague, or non-executable Task check is a non-waivable plan defect: return it to the planner/i);
    assert.match(gatekeeper, /Human acceptance cannot waive a missing Task check/i);
  });

  it('keeps verified integration distinct from plan acceptance and excludes runtime machinery', () => {
    assert.match(gatekeeper, /proceed to verified Story integration below without a routine human Story decision/i);
    assert.match(gatekeeper, /Do not write human approval markers or claim a human Story decision that did not occur/i);
    assert.match(gatekeeper, /Do not duplicate a checked Task commit/i);
    assert.match(gatekeeper, /Do not add a runtime module or persistent hash helper/i);
    assert.match(gatekeeper, /fresh independent plan-only architecture review.*same AFK finding\/revision loop and conditional acceptance before any executor resumes/i);
    assert.match(gatekeeper, /\*\*Plan review history\*\*/i);
    assert.match(gatekeeper, /independent review iterations and finding dispositions/i);
  });

  it('requires a fresh read-only reviewer and plain-language finding presentation', () => {
    assert.match(gatekeeper, /fresh `sibu-architecture-reviewer` exactly one Story and one plan folder/i);
    assert.match(gatekeeper, /source-verified \*\*start here\*\*/i);
    assert.match(gatekeeper, /independently verifies the full authoritative sources and plan/i);
    assert.match(gatekeeper, /At a stop, present each finding or unresolved risk.*What it means.*Why it matters.*Fix/i);
    assert.match(gatekeeper, /Preserve unresolved risks even when no blocking finding exists/i);
    assert.match(reviewer, /Actionable findings return to the planner for a new plan version and independent review/i);
    assert.match(reviewer, /Prior finding dispositions: <resolved \| persists \| superseded/i);
  });
});
