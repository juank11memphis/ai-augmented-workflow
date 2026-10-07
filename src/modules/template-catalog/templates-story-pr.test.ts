import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
const gatekeeper = readTemplate(templatePath);
const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');

function assertInOrder(content: string, phrases: string[]): void {
  let prior = -1;
  for (const phrase of phrases) {
    const position = content.indexOf(phrase, prior + 1);
    assert.ok(position > prior, `Expected ${JSON.stringify(phrase)} after preceding phrase`);
    prior = position;
  }
}

describe('future packaged verified Story PR contract', () => {
  it('opens one PR only after accepted plan, checked Tasks, and Story validation', () => {
    assertInOrder(gatekeeper, [
      'exact accepted plan identity is still current',
      "every Task's prescribed check and each `Done when` item have evidence",
      'actual Story-level validation passes',
    ]);
    assert.match(gatekeeper, /main agent, never the Task executor, creates or updates \*\*one Story PR\*\*/i);
    assert.match(gatekeeper, /Do not open a PR early, from another branch, or with missing or failed required local checks/i);
  });

  it('keeps main-only PR ownership and no routine human Story decision', () => {
    assert.match(gatekeeper, /For the final Milestone, including a one-Milestone Story, proceed to verified Story integration below without a routine human Story decision/);
    assert.match(gatekeeper, /there is no separate post-code architecture review or routine human Story PR decision/);
    assert.match(gatekeeper, /request a \*\*squash-only merge\*\* of that verified Story PR/);
    assert.match(gatekeeper, /Do not write human approval markers or claim a human Story decision that did not occur/);
  });

  it('requires a complete PR body, readback, and same-PR repair', () => {
    for (const section of ['What changed', 'Why it matters', 'Plan review history', 'Verification', 'Known risks and limits']) {
      assert.match(gatekeeper, new RegExp(`\\*\\*${section}\\*\\*`));
    }
    assert.match(gatekeeper, /independent review iterations and finding dispositions/);
    assert.match(gatekeeper, /Read back the actual PR body and verify these fields/);
    assert.match(gatekeeper, /repair the \*\*same PR\*\* if its body does not match/);
    assert.match(gatekeeper, /deferred human-only QA as `not performed`/);
  });

  it('blocks unsafe host checks and ambiguous merge effects before later Story work', () => {
    assert.match(gatekeeper, /failed, pending, missing, or unavailable required check blocks merge and later Story work/);
    assert.match(gatekeeper, /recheck the accepted plan, Story and Epic branch heads, PR head\/base and body, index\/worktree/);
    assert.match(gatekeeper, /query PR and Epic-head identity first, then stop until reconciled/);
    assert.match(gatekeeper, /record the closed child PR URL and resulting Epic head before allowing the next Story/);
  });

  it('continues only after observed integration and preserves installed human review', () => {
    assert.match(gatekeeper, /After the verified Story PR squash merge and updated Epic head are observed, continue only to the next planned Story/);
    assert.match(gatekeeper, /Never advance from an attempted or ambiguous merge/);
    assert.match(gatekeeper, /If no next Story exists, stop Story dispatch and use the separate Epic verification and human-handoff contract/);
    assert.match(installed, /## Story review gate: one final PR decision/);
    assert.notEqual(installed, gatekeeper);
  });

  it('ships current gatekeeper version and user-facing Epic handoff note', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '216');
    const executorTemplate = manifest.templates[templatePath];
    assert.equal(executorTemplate?.version, '68');
    assert.match(executorTemplate?.changes.join(' ') ?? '', /verified local branch cleanup.*squash-merge checks.*GitHub host readback/);
  });
});
