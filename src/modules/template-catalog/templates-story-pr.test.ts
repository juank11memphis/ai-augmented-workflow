import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/story-pr/${name}.md`, import.meta.url), 'utf8');
}

function assertInOrder(content: string, phrases: string[]): void {
  let prior = -1;
  for (const phrase of phrases) {
    const position = content.indexOf(phrase, prior + 1);
    assert.ok(position > prior, `Expected ${JSON.stringify(phrase)} after preceding phrase`);
    prior = position;
  }
}

describe('Final Story PR written contract', () => {
  it('opens one PR only after accepted plan, correct branch, checked Tasks, and Story validation', () => {
    const scenarios = fixture('scenarios');
    assert.match(scenarios, /One Milestone:.*one final M-01\/Story decision/);
    assert.match(scenarios, /Multiple Milestones:.*verified M-01 advances automatically to M-02.*final M-02\/Story decision/);
    assert.match(scenarios, /Early or wrong-branch attempt: no PR/);
    assertInOrder(gatekeeper, [
      'accepted plan identity',
      'final Task check/commit/progress evidence',
      'actual story-level command results before opening it',
    ]);
    assert.match(gatekeeper, /main agent, never the Task executor, opens one PR from the verified dedicated Story branch/i);
    assert.match(gatekeeper, /Do not open a PR early, from another branch, or with missing or failed required local checks/i);
  });

  it('uses PR review as the only final gate and updates that PR after checked revisions', () => {
    const scenarios = fixture('scenarios');
    assert.match(scenarios, /Final PR change request:.*fresh independent plan-only architecture review.*AFK planner-reviewer loop.*same PR with review history/);
    assert.match(gatekeeper, /PR is the final Milestone and Story review surface for one- and multi-Milestone Stories/);
    assert.match(gatekeeper, /There is no separate post-PR approval or implementation-code architecture review/);
    assert.match(gatekeeper, /update the \*\*same PR\*\*, including its plan review history and actual checks, for renewed final review/);
    assert.match(gatekeeper, /Acceptance alone permits approval metadata/);
  });

  it('accepts an approved-and-merged PR report without a duplicate Story decision', () => {
    assert.match(gatekeeper, /approved and merged.*in either order.*explicit Story acceptance/);
    assert.match(gatekeeper, /verify the merge, record approval, and do not ask for a second Story decision/);
    assert.match(gatekeeper, /A report of merge alone is not acceptance/);
  });

  it('reports actual local and hosted check states without invented success', () => {
    assert.match(fixture('scenarios'), /passing is passing; failing is failing; pending is pending; unavailable is unavailable/);
    assert.match(gatekeeper, /distinguish passing, failing, pending, and unavailable CI checks as observed/);
    assert.match(gatekeeper, /Never call an unrun, pending, failed, or unavailable check passing/);
    assert.match(gatekeeper, /If CI has not settled, disclose that and wait for its available status/);
  });

  it('stops safely on hosting or check-retrieval failure', () => {
    assert.match(fixture('scenarios'), /Host failure:.*preserves Story branch and evidence.*final review incomplete/);
    assert.match(gatekeeper, /If source-control hosting access, PR creation, or check retrieval fails, preserve the branch and validation evidence, report the blocker, and leave final review incomplete/);
    assert.match(gatekeeper, /Do not silently substitute a conversational approval, create a second PR, merge, or deploy/);
  });

  it('tracks Story status without treating Task completion or PR creation as Story approval', () => {
    assertInOrder(gatekeeper, [
      'Only after acceptance, create or select one dedicated Story branch',
      'change only the selected Story file\'s `**Status:**` field from `ready-for-planning` to `in-progress`',
      'Dispatch exactly the next ordered Task',
    ]);
    assert.match(gatekeeper, /preserve `in-progress`; if the field is missing, `draft`, `done`, or otherwise conflicts.*stop and reconcile it with the human/);
    assert.match(gatekeeper, /Leave the Story `in-progress` through Task execution, human-decision blockers, PR blockers, and final PR review/);
    assert.match(gatekeeper, /Deferral and requested changes leave the Story `in-progress`/);
    assert.match(gatekeeper, /Only after explicit story-level user approval, change only the selected Story file's `\*\*Status:\*\*` field from `in-progress` to `done`/);
    assert.match(gatekeeper, /Do not stage or commit ignored paths, including ignored `docs\/features\/\*\*` paths/);
  });

  it('rechecks feature continuation after merge without bypassing human gates', () => {
    assert.match(gatekeeper, /After a Story PR merge is confirmed, including a merge requested in a later turn, run this check again before ending the turn/);
    assert.match(gatekeeper, /Do not treat a merge report alone as Story approval: if the final human Story decision is still missing, stop at that gate/);
    assert.match(gatekeeper, /If the user reports both approval and merge for the identified Story PR, record approval and continue without asking for a separate Story or continuation confirmation/);
    assert.match(gatekeeper, /continue without asking for a separate Story or continuation confirmation; preserve every required plan review, applicable human decision, code-change permission, and blocker gate/);
    assert.match(gatekeeper, /If no logical next Epic exists or every Epic has all stories approved, tell the user the feature appears ready and stop/);
  });

  it('provides a scannable representative description and versioned distribution note', () => {
    const description = fixture('representative-description');
    for (const section of ['What changed', 'Why it matters', 'Verification', 'Known risks and limits']) {
      assert.match(description, new RegExp(`^## ${section}$`, 'm'));
      assert.match(gatekeeper, new RegExp(`\\*\\*${section}\\*\\*`));
    }
    assert.match(gatekeeper, /\*\*Plan review history\*\*/);
    assert.match(gatekeeper, /number of independent review iterations, each finding and planner revision/i);
    assert.match(description, /Hosted CI is pending; it has not been counted as passing/);
    assert.match(description, /not live agent behavior or pull-request hosting/);
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '211');
    assert.equal(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.version, '64');
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /approved-and-merged PR report.*Story approval/);
  });
});
