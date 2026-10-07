import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
const gatekeeper = readTemplate(templatePath);
const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');
const epicContract = /## Safe Epic and sequential Story base \(UED-S01\)([\s\S]*?)## Exact-plan architecture review/;

function epicGuidance(text: string): string {
  const section = text.match(epicContract)?.[1];
  assert.ok(section, 'Epic/Story base guidance is present');
  return section;
}

describe('safe Epic integration base template contract', () => {
  it('names complete prerequisites and stops missing context before branch or Task work', () => {
    for (const guidance of [epicGuidance(gatekeeper), epicGuidance(installed)]) {
      for (const prerequisite of [
        'Epic', 'ordered Stories', 'feature BRD and SDD', 'project SAD',
        'required UX', 'selected architecture', 'agreed initial base and target',
        'Git and PR-host access',
      ]) {
        assert.ok(guidance.includes(prerequisite), `missing ${prerequisite}`);
      }
      assert.match(guidance, /Name each missing or insufficient prerequisite and stop \*\*before any branch or Task work\*\*/);
      assert.ok(guidance.indexOf('before any branch or Task work') < guidance.indexOf('Observe the current branch'));
    }
  });

  it('establishes one Epic branch only from an agreed base after safe observation', () => {
    const guidance = epicGuidance(gatekeeper);
    assert.match(guidance, /Observe the current branch, index, worktree, local\/remote branch identity, and host state before effects/);
    assert.match(guidance, /With a clean, unambiguous state, establish or reconcile \*\*one Epic integration branch from the agreed base\*\*/);
    assert.ok(guidance.indexOf('Observe the current branch') < guidance.indexOf('one Epic integration branch'));
    assert.match(guidance, /observe its actual head/);
  });

  it('selects Stories in order from verified integrated Epic ancestry', () => {
    const guidance = epicGuidance(gatekeeper);
    assert.match(guidance, /\*\*only the next Story in planned order\*\*/);
    assert.match(guidance, /every prior Story is integrated in the Epic branch/);
    assert.match(guidance, /one active Story branch from that \*\*observed current Epic head\*\* and verify its ancestry/);
    assert.match(guidance, /uncertain prior integration stops later Story work/);
  });

  it('accepts the exact plan before a fresh Epic-head and safety recheck and Story branch', () => {
    for (const guidance of [epicGuidance(gatekeeper), epicGuidance(installed)]) {
      const accept = guidance.indexOf('exact independently reviewed and accepted Story plan');
      const recheck = guidance.indexOf('After plan acceptance, re-observe the Epic head');
      const branch = guidance.indexOf('Only then create the one active Story branch');
      assert.ok(accept >= 0 && accept < recheck && recheck < branch);
      assert.match(guidance, /missing, stale, or unaccepted plan stops before Story-branch creation or Task dispatch/);
      assert.match(guidance, /branch\/index\/worktree\/host safety/);
    }
  });

  it('stops unsafe, stale, concurrent, and partial effects without destructive retry', () => {
    const guidance = epicGuidance(gatekeeper);
    for (const failure of [
      'collision', 'unrelated local change', 'conflicting remote change',
      'unavailable host or permission', 'ambiguous partial branch effect',
      'unverified or stale Epic head', 'concurrent change',
    ]) {
      assert.ok(guidance.includes(failure), `missing ${failure}`);
    }
    assert.match(guidance, /Re-query actual branch\/host state before retrying; do not infer success from a submitted command/);
    assert.match(guidance, /Never stash, reset, force push, automatically rebase, bypass branch protection, or expose credentials/);
  });

  it('retains exact-plan and checked-Task evidence before verified Story integration', () => {
    assert.match(gatekeeper, /Compare the reviewable identity at reviewer dispatch, review-packet receipt, acceptance/);
    assert.match(gatekeeper, /every Task in the accepted plan has its own specific, objective, executable pass\/fail check and expected passing evidence/);
    assert.match(gatekeeper, /each expected evidence item against actual tests and assertions/);
    assert.match(gatekeeper, /every Task's prescribed check and each `Done when` item have evidence/);
    assert.match(epicGuidance(gatekeeper), /replaces routine human Story PR review for future distributed workflows/);
    assert.match(epicGuidance(gatekeeper), /does not authorize an Epic PR, parallel Stories, deployment/);
  });

  it('versions the packaged guidance and preserves customized installed clauses', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '216');
    assert.equal(manifest.templates[templatePath]?.version, '68');
    assert.match(manifest.templates[templatePath]?.changes.join(' ') ?? '', /verified local branch cleanup.*squash-merge checks.*GitHub host readback/i);
    assert.match(installed, /same uncommitted Task/);
    assert.match(installed, /## Human QA at Story review/);
    assert.notEqual(installed, gatekeeper, 'installed project customizations must not be replaced by packaged template');
  });
});
