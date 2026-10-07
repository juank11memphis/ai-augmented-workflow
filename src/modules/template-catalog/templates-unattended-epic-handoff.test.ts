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
    assert.match(handoff, /undefined, unavailable, missing, pending, or failed required check stops/);
    assert.match(handoff, /do not invent or substitute a weaker check/);
  });

  it('creates one complete PR only after observed checks and safe head/base state', () => {
    assert.match(handoff, /Recheck the Epic head, agreed target base, branch\/index\/worktree safety/);
    assert.match(handoff, /changed head\/base or unsafe state requires reconciliation/);
    assert.match(handoff, /one Epic PR.*verified Epic branch to the agreed base only after those gates pass/);
    assert.match(handoff, /link every child PR in planned order/);
    for (const field of ['change', 'user value', 'local and host verification', 'blockers', 'retries', 'recoveries']) {
      assert.ok(handoff.includes(field), `${field} is required for each Story`);
    }
    assert.match(handoff, /aggregate Epic checks/);
    assert.match(handoff, /human-only QA explicitly marked `not performed`/);
    assert.match(handoff, /remaining limits.*incomplete or non-applicable fact distinguished from a passing check/);
  });

  it('reads back actual body and host state, repairing one PR rather than accepting a mismatch', () => {
    assert.match(handoff, /Query the actual PR after create or update/);
    assert.match(handoff, /identity, open state, full body and every child link, actual head\/base and head commit/);
    assert.match(handoff, /current required host-check conclusions/);
    assert.match(handoff, /If the body differs, repair \*\*the same PR\*\* and read it back again/);
    assert.match(handoff, /missing body field, mismatched head\/base, changed branch state.*not review-ready/);
  });

  it('reconciles ambiguous creation before retry and reserves Epic merge and next Epic for the human', () => {
    assert.match(handoff, /timeout or ambiguous creation\/update effect.*querying the host.*before any retry/);
    assert.match(handoff, /reuse a matching existing PR.*stop if identity or effect remains ambiguous/);
    assert.match(handoff, /main agent owns this operation; a checked-Task executor does not create an Epic PR/);
    assert.match(handoff, /Hand the read-back Epic PR URL.*human for review and merge/);
    assert.match(handoff, /Do not merge the Epic PR.*start another Epic without a new user request/);
  });

  it('reports safe outcomes and deferred QA without claiming live behavior', () => {
    assert.match(handoff, /safe outcome\/reason summaries/);
    assert.match(handoff, /never include credentials, secrets, raw private logs, or invented success/);
    assert.match(handoff, /Deferred human QA remains `not performed`/);
    assert.match(handoff, /deterministic prompt-contract tests do not prove live host or agent behavior/);
  });

  it('versions the changed packaged gatekeeper with current sync notes while preserving installed Story review', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '215');
    assert.equal(manifest.templates[templatePath]?.version, '67');
    assert.match(manifest.templates[templatePath]?.changes.join(' ') ?? '', /Epic PR handoff.*child-PR reconciliation.*named Epic checks/);
    const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');
    assert.match(installed, /## Story review gate: one final PR decision/);
    assert.doesNotMatch(installed, /## Present complete Epic for human review/);
  });
});
