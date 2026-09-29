import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const gatekeeper = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/milestone-review/${name}.md`, import.meta.url), 'utf8');
}

function ordered(contract: string, phrases: string[]): void {
  let previous = -1;
  for (const phrase of phrases) {
    const position = contract.indexOf(phrase, previous + 1);
    assert.ok(position > previous, `Expected ${JSON.stringify(phrase)} after preceding contract step`);
    previous = position;
  }
}

describe('Milestone review written contract', () => {
  it('uses one final Story gate even for a one-Milestone Story', () => {
    assert.match(fixture('one-milestone'), /final Story review is the one M-01 review; do not ask twice/i);
    assert.match(gatekeeper, /final Milestone, including a one-Milestone Story.*same Milestone decision.*not a second gate/i);
    assert.match(gatekeeper, /Do not open a PR here/i);
    assert.match(gatekeeper, /must not be followed by another Milestone or Story approval request for the same outcome/i);
  });

  it('requires verified Task evidence before pausing, then advances only after acceptance', () => {
    const scenario = fixture('multi-milestone');
    assert.match(scenario, /Pending M-01 review: no M-02 dispatch/);
    assert.match(scenario, /M-01 accepted: only M-02 becomes eligible after plan identity and checks are rechecked/);
    ordered(gatekeeper, [
      'prescribed check passed, scoped Task-ID commit verified, and post-commit progress recorded',
      'pause before dispatching any Task in a later Milestone',
      'On acceptance, advance **only to the next Milestone**',
      'recheck its identity and Task checks before dispatch',
    ]);
  });

  it('shows a concise outcome and all human choices without invented evidence', () => {
    const example = fixture('one-milestone');
    for (const item of ['M-01 delivered', 'T-01:', '`pnpm verify` passed', 'commit `abc1234`', 'Blockers:', 'Risk:', 'accept / request changes / defer']) {
      assert.ok(example.includes(item), `Missing example item: ${item}`);
    }
    assert.match(gatekeeper, /what changed and why it matters; each Task ID, actual check and result, and commit reference; known blockers and risks/i);
    assert.match(gatekeeper, /Never claim an unrun check passed/i);
  });

  it('preserves state on deferral and stops a blocked or stale Milestone', () => {
    assert.match(fixture('multi-milestone'), /deferred: preserve review and progress; no M-02 dispatch/i);
    const failures = fixture('revision-and-blockers');
    assert.match(failures, /Stale plan identity at dispatch: stop; no dispatch/);
    assert.match(failures, /Blocked T-01: M-01 incomplete; no review-as-success and no M-02 dispatch/);
    assert.match(gatekeeper, /blocked or unverified Task does not complete its Milestone.*stop without presenting a review-as-success claim/i);
    assert.match(gatekeeper, /On deferral, preserve Milestone review and progress state and dispatch nothing/i);
    assert.match(gatekeeper, /Missing checks or stale identity stop dispatch/i);
  });

  it('requires checked revision, fresh plan-only review, and exact-version human acceptance', () => {
    const failures = fixture('revision-and-blockers');
    for (const missing of ['without Task checks', 'without fresh independent plan-only architecture review', 'without explicit human acceptance']) {
      assert.match(failures, new RegExp(`${missing}.*no dispatch`, 'i'));
    }
    ordered(gatekeeper, [
      'Human-requested changes become new or revised bounded planned Tasks',
      'Changed reviewable plan content invalidates the previous identity',
      'fresh independent plan-only architecture review',
      'require explicit human acceptance of that exact version before any executor resumes',
    ]);
    assert.match(gatekeeper, /Do not substitute an implementation-code architecture review/i);
  });

  it('keeps worker authority narrow and ships a versioned skill', () => {
    for (const path of [
      '.codex/agents/sibu-implementation-executor.toml',
      '.claude/agents/sibu-implementation-executor.md',
      '.gemini/agents/sibu-implementation-executor.md',
    ]) {
      const wrapper = readTemplate(path);
      assert.match(wrapper, /Never approve your own work/i);
      assert.match(wrapper, /Task-ID commit only after pass/i);
    }
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '197');
    assert.equal(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.version, '53');
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /Milestone.*fresh review/i);
  });
});
