import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
const guidance = readTemplate(templatePath);
const agents = readTemplate('AGENTS.md');
const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');

function section(heading: string, nextHeading: string): string {
  const start = guidance.indexOf(heading);
  const end = guidance.indexOf(nextHeading, start + heading.length);
  assert.ok(start >= 0 && end > start, `${heading} section exists`);
  return guidance.slice(start, end);
}

const integration = section('## Integrate verified Story:', '## Verified Story metadata');

describe('future packaged verified Story integration contract', () => {
  it('keeps exact-plan acceptance before Story branch and checks identity at dispatch and integration', () => {
    const base = section('## Safe Epic and sequential Story base', '## Exact-plan architecture review');
    assert.ok(base.indexOf('exact independently reviewed and accepted Story plan') < base.indexOf('Only then create the one active Story branch'));
    assert.match(guidance, /compare it again immediately before each executor dispatch/);
    assert.match(integration, /exact accepted plan identity is still current/);
    assert.match(integration, /recheck the accepted plan/);
    assert.match(base, /missing, stale, or unaccepted plan stops before Story-branch creation or Task dispatch/);
  });

  it('requires every checked Task result and Done when evidence plus Story validation', () => {
    assert.match(guidance, /each expected evidence item against actual tests and assertions/);
    assert.match(guidance, /A passing command or existing Task commit cannot stand in for missing evidence/);
    assert.match(integration, /every Task's prescribed check and each `Done when` item have evidence/);
    assert.match(integration, /actual Story-level validation passes/);
    assert.match(integration, /missing or failed required local checks/);
  });

  it('retains bounded reviewed recovery and stops for material decisions or missing evidence', () => {
    assert.match(guidance, /## AFK recovery for a post-commit evidence gap/);
    assert.match(guidance, /## AFK recovery for a cross-Task validation regression/);
    assert.match(guidance, /fresh independent \*\*plan-only\*\* architecture review/);
    assert.match(integration, /Use the bounded reviewed evidence-gap or same-Story regression paths/);
    assert.match(integration, /unresolved material decisions or unsafe state require focused human action/);
  });

  it('requires actual PR body readback and safe, truthful content without a separate QA gate', () => {
    assert.match(integration, /Read back the actual PR body and verify these fields/);
    assert.match(integration, /repair the \*\*same PR\*\* if its body does not match/);
    assert.match(integration, /Do not treat a submitted create\/update call as PR evidence/);
    assert.match(integration, /noteworthy failures and their attribution, reviewed repairs, unresolved stops/);
    assert.doesNotMatch(integration, /deferred human-only QA|human-only QA prerequisite/);
    assert.match(integration, /Never include credentials, secrets, raw private logs, or invented success/);
  });

  it('rejects failed, pending, missing, and unavailable required host checks', () => {
    assert.match(integration, /exact current PR identity, head commit and base branch\/head from host readback/);
    assert.match(integration, /failed, pending, missing, unavailable, stale, or ambiguous required check or policy fact blocks merge and later Story work/);
    assert.match(integration, /Passing local commands cannot substitute for host checks/);
    assert.match(integration, /host merge policy/);
  });

  it('rejects changed Epic head or unsafe state immediately before squash-only merge', () => {
    assert.match(integration, /Immediately before merge, recheck/);
    assert.match(integration, /Story and Epic branch heads, PR head\/base and body, index\/worktree/);
    assert.match(integration, /stale or concurrent Epic-head change, branch mismatch, unsafe worktree\/index/);
    assert.match(integration, /\*\*squash-only merge\*\*/);
    assert.match(integration, /verify the reported merge method, merged PR identity and base, actual merge result, and updated Epic head/);
  });

  it('does not blindly retry timeout after possible host effect or advance a later Story', () => {
    assert.match(integration, /command timeout or ambiguous possible host effect/);
    assert.match(integration, /read back actual PR identity, state, head\/base, merge method and Epic-head state before retry or next Story/);
    assert.match(integration, /record the closed child PR URL and resulting Epic head before allowing the next Story/);
    assert.match(integration, /prevents the affected merge or later Story/);
  });

  it('records verified integration without routine human Story approval in synced guidance', () => {
    assert.match(integration, /no separate post-code architecture review or routine human Story PR decision/);
    assert.doesNotMatch(integration, /Present the PR for one explicit/);
    assert.match(guidance, /record the Story as `verified\/integrated`/);
    assert.match(guidance, /Do not write human approval markers/);
    assert.match(agents, /without routine human Story review only after required evidence/);
    assert.match(agents, /already installed customized workflows retain their human Story review/);
    assert.match(installed, /## Integrate verified Story: one safe squash-only PR merge/);
    assert.match(installed, /The main agent, never the Task executor, creates or updates \*\*one Story PR\*\*/);
    assert.match(installed, /Do not write human approval markers or claim a human Story decision that did not occur/);
  });

  it('versions both changed templates with current user-facing sync notes', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '248');
    assert.equal(manifest.templates[templatePath]?.version, '79');
    assert.equal(manifest.templates['AGENTS.md']?.version, '56');
    assert.match(manifest.templates[templatePath]?.changes.join(' ') ?? '', /Starts the first unintegrated Story.*separate human start prompt/i);
    assert.match(manifest.templates['AGENTS.md']?.changes.join(' ') ?? '', /Routes existing Sibu eval runs and troubleshooting.*agent-guided skill.*eval artifact authoring separate/);
  });
});
