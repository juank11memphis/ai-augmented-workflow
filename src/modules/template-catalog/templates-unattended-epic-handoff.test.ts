import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
const guidance = readTemplate(templatePath);
const start = guidance.indexOf('## Present complete Epic for human review');
const end = guidance.indexOf('## Final response behavior', start);
assert.ok(start >= 0 && end > start, 'Epic handoff has a bounded section');
const handoff = guidance.slice(start, end);

describe('future packaged Epic handoff contract', () => {
  it('reconciles all planned Stories with observed merged child PRs in order through the latest Epic head', () => {
    assert.match(handoff, /ordered `stories\/` list/);
    assert.match(handoff, /every.*observed merged child Story PR/);
    assert.match(handoff, /child PR identity, URL, merged state, Epic base, and recorded resulting Epic head/);
    assert.match(handoff, /latest.*Epic branch head/);
    assert.match(handoff, /Missing, duplicate, unmerged, mismatched, or out-of-order children.*stop/);
    assert.match(handoff, /Do not infer completion from Story status text/);
  });

  it('requires the named Epic-level check and rejects absent or non-passing results', () => {
    assert.match(handoff, /named Epic-level check.*Epic, SDD, or repository convention/);
    assert.match(handoff, /exact check against the latest reconciled Epic head/);
    assert.match(handoff, /name, source, head, and actual result/);
    assert.match(handoff, /undefined, unavailable, missing, pending, or failed required Epic-level check stops/);
    assert.match(handoff, /do not invent or substitute a weaker check/);
  });

  it('creates one complete PR only after observed checks and safe head/base state', () => {
    assert.match(handoff, /Recheck the Epic head, agreed target base, branch\/index\/worktree safety/);
    assert.match(handoff, /changed head\/base or unsafe state requires reconciliation/);
    assert.match(handoff, /one Epic PR.*verified Epic branch to the agreed base only after those gates pass/);
    assert.match(handoff, /link every child PR in planned order/);
    for (const field of ['change', 'user value', 'actual local and host checks', 'noteworthy failure attribution', 'reviewed repairs', 'unresolved stops']) {
      assert.ok(handoff.includes(field), `${field} is required for each Story`);
    }
    assert.match(handoff, /named Epic-level check with its source, observed head, and actual result/);
    assert.match(handoff, /known required host-check conclusions and applicable merge-policy status.*explicitly identify each unavailable fact as a verification gap/);
    assert.match(handoff, /Distinguish incomplete or non-applicable facts from passing checks/);
  });

  it('reads back actual body and host state, repairing one PR rather than accepting a mismatch', () => {
    assert.match(handoff, /Query the actual PR after create or update/);
    assert.match(handoff, /identity, open state, full body and every child link, actual head\/base and head commit/);
    assert.match(handoff, /known required host-check conclusions and merge-policy status or explicit verification gaps/);
    assert.match(handoff, /If the body differs, repair \*\*the same PR\*\* and read it back again/);
    assert.match(handoff, /missing body field, mismatched head\/base, changed branch state, or undisclosed host-fact gap is not review-ready/);
  });

  it('reconciles ambiguous creation and waits for human Epic merge confirmation', () => {
    assert.match(handoff, /timeout or ambiguous creation\/update effect.*querying the host.*before any retry/);
    assert.match(handoff, /reuse a matching existing PR.*stop if identity or effect remains ambiguous/);
    assert.match(handoff, /main agent owns this operation; a checked-Task executor does not create an Epic PR/);
    assert.match(handoff, /Hand the read-back Epic PR URL.*human for review and merge/);
    assert.match(handoff, /Ask the user to tell the agent when the PR is approved and merged/);
    assert.match(handoff, /confirmation requests safe local Epic-branch cleanup and continuation/);
    assert.match(handoff, /Do not merge the Epic PR.*start another Epic before that user confirmation/);
  });

  it('reports safe outcomes without obsolete QA fields or live-behavior claims', () => {
    assert.match(handoff, /safe outcome\/reason summaries/);
    assert.match(handoff, /never include credentials, secrets, raw private logs, or invented success/);
    assert.doesNotMatch(handoff, /deferred human-only QA|Deferred human QA remains|`not performed`/i);
    assert.match(handoff, /Deterministic prompt-contract tests do not prove live host or agent behavior/);
  });

  it('closes a human-merged Epic locally only after host and squash-result verification', () => {
    assert.match(handoff, /verify the PR's actual merged state, head, and base with the PR host.*GitHub MCP/);
    assert.match(handoff, /Confirm its base is `main`; otherwise stop for an explicit base decision/);
    assert.match(handoff, /switch to `main`, and fast-forward pull it/);
    assert.match(handoff, /Confirm updated `main` contains the merge result/);
    assert.match(handoff, /compare the resulting trees before using force deletion/);
    assert.match(handoff, /Stop on divergent content, ambiguous host state, dirty local state, or blocked Git permissions/);
    assert.match(handoff, /do not delete a remote branch unless separately requested/);
  });

  it('continues only to a planned next Epic or reports the verified feature ready', () => {
    assert.match(handoff, /After verified merge and safe cleanup, inspect the feature's planned Epics and dependencies/);
    assert.match(handoff, /If another Epic remains, continue its Start Epic delivery gate from the updated base/);
    assert.match(handoff, /stop for an ambiguous order, missing prerequisite, or unsafe state/);
    assert.match(handoff, /If no planned Epic remains and all planned Epic PRs are verified merged, clearly tell the user the feature is ready/);
    assert.match(handoff, /Do not infer feature completion from the current Epic PR or local files alone/);
  });

  it('versions the changed packaged gatekeeper with current sync notes and synced Epic handoff', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '250');
    assert.equal(manifest.templates[templatePath]?.version, '79');
    assert.match(manifest.templates[templatePath]?.changes.join(' ') ?? '', /Starts the first unintegrated Story.*separate human start prompt/i);
    const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');
    assert.match(installed, /## Integrate verified Story: one safe squash-only PR merge/);
    assert.match(installed, /main agent, never the Task executor, creates or updates \*\*one Story PR\*\*/i);
    assert.match(installed, /Do not write human approval markers or claim a human Story decision that did not occur/);
    assert.match(installed, /## Present complete Epic for human review/);
    assert.match(installed, /verify the PR's actual merged state, head, and base with the PR host.*GitHub MCP/);
    assert.match(installed, /Ask the user to tell the agent when the PR is approved and merged/);
  });
});
