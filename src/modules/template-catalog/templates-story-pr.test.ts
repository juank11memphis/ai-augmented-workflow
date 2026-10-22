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
  it('tries GitHub MCP first without routine branch-rules probing or weaker merge gates', () => {
    assert.match(gatekeeper, /For GitHub PR operations and remote host observations, try the configured GitHub MCP first/);
    assert.match(gatekeeper, /name the specific missing capability before using `gh` or another configured host interface for only that fact/);
    assert.match(gatekeeper, /Do not perform broad branch-rules or branch-protection lookups as a routine prerequisite/);
    assert.match(gatekeeper, /Establish required checks and applicable merge policy from current, narrowly scoped host observations before any merge/);
    assert.match(gatekeeper, /read back its actual state before any retry or fallback/);
    assert.match(gatekeeper, /An absent, unavailable, stale, or ambiguous required check or host policy is not permission to merge/);
  });

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
    assert.match(gatekeeper, /noteworthy failures and their attribution, reviewed repairs, unresolved stops/);
    assert.match(gatekeeper, /If no recovery occurred, report only actual checks/);
    assert.doesNotMatch(gatekeeper, /deferred human-only QA|human-only QA prerequisite|QA remains `not performed`/i);
  });

  it('blocks unsafe host checks and ambiguous merge effects before later Story work', () => {
    assert.match(gatekeeper, /failed, pending, missing, unavailable, stale, or ambiguous required check or policy fact blocks merge and later Story work/);
    assert.match(gatekeeper, /recheck the accepted plan, scoped Task commits and every `Done when` item, actual Story-level validation, Story and Epic branch heads, PR head\/base and body, index\/worktree/);
    assert.match(gatekeeper, /read back actual PR identity, state, head\/base, merge method and Epic-head state before retry or next Story/);
    assert.match(gatekeeper, /record the closed child PR URL and resulting Epic head before allowing the next Story/);
  });

  it('continues only after observed integration with synced installed guidance', () => {
    assert.match(gatekeeper, /After the verified Story PR squash merge and updated Epic head are observed, continue only to the next planned Story/);
    assert.match(gatekeeper, /Never advance from an attempted or ambiguous merge/);
    assert.match(gatekeeper, /If no next Story exists, stop Story dispatch and use the separate Epic verification and human-handoff contract/);
    assert.match(installed, /## Integrate verified Story: one safe squash-only PR merge/);
    assert.match(installed, /The main agent, never the Task executor, creates or updates \*\*one Story PR\*\*/);
    assert.match(installed, /Do not write human approval markers or claim a human Story decision that did not occur/);
  });

  it('ships current gatekeeper version and user-facing Epic handoff note', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '249');
    const executorTemplate = manifest.templates[templatePath];
    assert.equal(executorTemplate?.version, '79');
    assert.match(executorTemplate?.changes.join(' ') ?? '', /Starts the first unintegrated Story.*separate human start prompt/i);
  });
});
