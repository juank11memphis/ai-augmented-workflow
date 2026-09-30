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

describe('Milestone progression written contract', () => {
  it('uses one final Story gate even for a one-Milestone Story', () => {
    assert.match(fixture('one-milestone'), /final Story review is the one M-01 PR review; do not ask twice/i);
    assert.match(gatekeeper, /final Milestone, including a one-Milestone Story.*only routine post-execution decision/i);
    assert.match(gatekeeper, /PR is the final Milestone and Story review surface for one- and multi-Milestone Stories/i);
    assert.match(gatekeeper, /There is no separate post-PR approval or implementation-code architecture review/i);
  });

  it('advances to the next Milestone only after verified Task evidence', () => {
    const scenario = fixture('multi-milestone');
    assert.match(scenario, /M-01 verified: M-02 becomes eligible automatically after plan identity and checks are rechecked/);
    assert.match(scenario, /M-01 unchecked or uncommitted: no M-02 dispatch/);
    ordered(gatekeeper, [
      'prescribed check passed, scoped Task-ID commit verified, and post-commit progress recorded',
      'advance automatically **only to the next Milestone**',
      'recheck plan identity, ordered Task scope, and prescribed checks before dispatch',
    ]);
    assert.match(gatekeeper, /Do not ask for a routine Milestone decision/);
  });

  it('records a concise outcome without invented evidence', () => {
    const example = fixture('one-milestone');
    for (const item of ['M-01 delivered', 'T-01:', '`pnpm verify` passed', 'commit `abc1234`', 'Blockers:', 'Risk:']) {
      assert.ok(example.includes(item), `Missing example item: ${item}`);
    }
    assert.match(gatekeeper, /record a concise Milestone outcome with Task IDs, actual checks\/results, commits, and known risks/i);
    assert.match(gatekeeper, /Never claim an unrun check passed/i);
  });

  it('stops for ambiguity, material decisions, failed checks, and stale plans', () => {
    assert.match(fixture('multi-milestone'), /material ambiguity: stop for human decision; no M-02 dispatch/i);
    const failures = fixture('revision-and-blockers');
    assert.match(failures, /Stale plan identity at dispatch: stop; no dispatch/);
    assert.match(failures, /Blocked T-01: M-01 incomplete; no review-as-success and no M-02 dispatch/);
    assert.match(failures, /Consequential architecture change at M-01: stop for human decision; no M-02 dispatch/);
    assert.match(gatekeeper, /blocked or unverified Task does not complete its Milestone.*stop without presenting a completion-as-success claim/i);
    assert.match(gatekeeper, /Stop and ask the human before further dispatch when ambiguity cannot be resolved.*consequential architecture, scope, dependency, security, privacy, or persisted-data change/i);
    assert.match(gatekeeper, /Check failures unresolved after the worker's allowed focused fixes, stale identity, missing evidence, and other blockers also stop unattended work/i);
    assert.match(gatekeeper, /Missing checks or stale identity stop dispatch/i);
  });

  it('requires checked revision, fresh plan-only review, and conditional exact-version acceptance', () => {
    const failures = fixture('revision-and-blockers');
    for (const missing of ['without Task checks', 'without fresh independent plan-only architecture review', 'with a finding or unresolved risk but without explicit human acceptance']) {
      assert.match(failures, new RegExp(`${missing}.*no dispatch`, 'i'));
    }
    assert.match(failures, /complete clean review and unchanged identity: automatically accepted; dispatch next Task/i);
    ordered(gatekeeper, [
      'Human-requested changes become new or revised bounded planned Tasks',
      'Changed reviewable plan content invalidates the previous identity',
      'fresh independent plan-only architecture review',
      'accept automatically only if it has no findings or unresolved risks',
      'require explicit human acceptance before any executor resumes',
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
    assert.equal(manifest.templateVersion, '203');
    assert.equal(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.version, '59');
    assert.match(manifest.templates['skills/ai-implementation-plan-executor/SKILL.md']?.changes.join('') ?? '', /Automatically accepts clean, risk-free architecture-reviewed Story plans.*human decision/);
  });
});
