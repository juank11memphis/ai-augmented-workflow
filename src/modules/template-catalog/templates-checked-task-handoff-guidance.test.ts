import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const path = 'skills/ai-implementation-plan-executor/SKILL.md';
const guidance = readTemplate(path);
const handoff = guidance.split('### Publish each checked Task checkpoint')[1]?.split('### AFK blocked-check diagnosis')[0];

describe('checked Task publication guidance', () => {
  it('orders check, commit, push, matching issue/progress, and first draft PR', () => {
    assert.ok(handoff, 'checked Task handoff section exists');
    const ordered = [
      'passing prescribed check and every `Done when` item',
      'scoped Task-ID commit',
      'push that checked commit',
      'publish matching completed Task status',
      'after the first pushed Task, open one draft Story PR',
    ];
    let previous = -1;
    for (const phrase of ordered) {
      const position = handoff.indexOf(phrase, previous + 1);
      assert.ok(position > previous, `${phrase} must follow the prior checkpoint action`);
      previous = position;
    }
    assert.match(handoff, /main agent owns publication, not the checked-Task worker/);
    assert.match(handoff, /Later Tasks update the same branch and PR without a routine human continuation prompt/);
  });

  it('records a matching pushed commit, check evidence, and next work without bloating the checklist', () => {
    assert.ok(handoff);
    assert.match(handoff, /progress entry records the actual check\/result and evidence, pushed commit ID, next Task or workflow step/);
    assert.match(handoff, /checklist holds only ordered Task IDs and statuses, not detailed logs/);
    assert.match(handoff, /remote Story head contains the Task commit/);
    assert.match(handoff, /issue checklist and progress artifact name the same completed Task and pushed commit/);
    assert.match(handoff, /A local commit, submitted push, or issue write alone is not a handoff/);
    assert.match(handoff, /draft PR to be confirmed open with the expected Story head and Epic base/);
  });

  it('stops on stale plans, concurrent advances, and uncertain partial remote effects', () => {
    assert.ok(handoff);
    assert.match(handoff, /recheck the accepted exact plan fingerprint against the authoritative Story plan artifact/);
    assert.match(handoff, /stale plan fingerprint, concurrent remote advance, mismatched branch or issue state/);
    assert.match(handoff, /push, checklist update, progress append, and draft PR creation as distinct effects/);
    assert.match(handoff, /read back the exact remote branch, issue\/artifact, or PR by identity before any retry/);
    assert.match(handoff, /Report confirmed effects separately from uncertain ones/);
    assert.match(handoff, /Do not claim handoff or dispatch the next Task until all required checkpoint effects are confirmed/);
    assert.match(handoff, /never expose credentials, full private artifacts, raw prompts, or private logs/);
  });

  it('does not delay PR creation until final checks or weaken final merge gates', () => {
    assert.doesNotMatch(guidance, /Open one Story PR from the dedicated Story branch only after all final-Milestone Tasks/);
    assert.doesNotMatch(guidance, /Do not open a PR early, from another branch/);
    assert.match(guidance, /make it ready only after all final-Milestone Tasks have passing prescribed checks/);
    assert.match(guidance, /actual Story-level validation passes/);
    assert.match(guidance, /every \*\*required\*\* host check conclusion and applicable merge-policy fact/);
    assert.match(guidance, /request a \*\*squash-only merge\*\* of that verified Story PR/);
  });

  it('ships a bumped template version with current user-facing sync notes', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '259');
    assert.equal(manifest.templates[path]?.version, '83');
    assert.deepEqual(manifest.templates[path]?.changes, [
      'Publishes each checked Task checkpoint and opens a draft Story PR after the first pushed Task, with safe readback before continuing.',
    ]);
  });
});
