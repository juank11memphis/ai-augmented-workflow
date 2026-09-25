import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';
import { renderTemplateForSync } from './templates.js';

const mainExecutorPath = 'skills/ai-implementation-plan-executor/SKILL.md';
const executorToolboxPath = 'skills/ai-implementation-executor-toolbox/SKILL.md';

const renderExecutorToolbox = (): string => renderTemplateForSync({
  templateRelativePath: executorToolboxPath,
  currentPath: 'missing-agents.md',
  selectedLanguageSkills: [],
  selectedFrameworkSkills: [],
});

const main = readTemplate(mainExecutorPath);
const worker = renderExecutorToolbox();

describe('human-directed implementation review', () => {
  it('preserves independent same-snapshot specialist review and documentation-only bypass', () => {
    assert.match(main, /Documentation-only changes bypass specialist review/i);
    assert.match(main, /source code, tests, dependencies, schemas, or runtime configuration require specialist review/i);
    assert.match(main, /round number, current changed-file list, current local diff, and fresh validation summary/i);
    assert.match(main, /snapshot is an unchanged-local-change invariant, not a persisted hash/i);
    assert.match(main, /Resolve both reviewers' model routes.*before launching either reviewer/i);
    assert.match(main, /For Codex, when the host supports two concurrent sub-agents, spawn both read-only reviewers before waiting for either result/i);
    assert.match(main, /Otherwise run them sequentially without allowing any writer between them/i);
    assert.match(main, /unexpected mutation occurred, discard both outcomes/i);
    assert.match(main, /do not present stale verdicts as current evidence/i);
  });

  it('retains packet validation, independent conclusions, and unavailable-review disclosure', () => {
    for (const field of ['stable role-prefixed finding IDs', 'severity', 'location', 'evidence',
      'violated expectation', 'required outcome', 'minor notes', 'unresolved risks']) {
      assert.match(main, new RegExp(field, 'i'));
    }
    assert.match(main, /Retry a malformed or incomplete packet once/i);
    assert.match(main, /treat that reviewer as unavailable/i);
    assert.match(main, /Never simulate an independent specialist review inline/i);
    assert.match(main, /Deduplicate overlapping findings by required outcome/i);
    assert.match(main, /preserving every source finding ID, original severity, specialist ownership, and conclusion/i);
    assert.match(main, /never downgrade severity/i);
    assert.match(main, /Do not merge away substantive contradictions/i);
  });

  it('returns clean, minor-only, and findings-bearing rounds to the human without autonomous repair', () => {
    assert.match(main, /After every completed review round, including matching approvals or minor-only outcomes/i);
    assert.match(main, /both original specialist verdicts/i);
    assert.match(main, /combined blocker\/major findings and minor notes/i);
    assert.match(main, /current validation evidence, conflicts, unavailable-review warnings, and unresolved risks/i);
    assert.match(main, /Pause for the human to approve this snapshot as-is, authorize named changes, or defer/i);
    assert.match(main, /Reviewer verdicts, finding severity, and discussion alone never authorize repair or story progression/i);
    assert.doesNotMatch(main, /fewer than three repairs|never start a fourth repair|matching specialist approvals.*terminate automated review/i);
  });

  it('preserves human choices, accepted risks, deferral, and consequential decisions', () => {
    assert.match(main, /approve despite unresolved blocker, major, or minor findings/i);
    assert.match(main, /human-accepted risk visible without relabeling either specialist verdict as `approved`/i);
    assert.match(main, /Deferral preserves work and evidence without approval metadata, commit, or continuation/i);
    assert.match(main, /reviewers conflict, authoritative sources disagree/i);
    assert.match(main, /new production dependency/i);
    assert.match(main, /security\/privacy consequence/i);
    assert.match(main, /destructive migration/i);
    assert.match(main, /Never silently select a consequential option/i);
    assert.match(main, /Automated outcomes never authorize approval metadata, commits, or feature continuation/i);
  });

  it('requires a current-snapshot authorized list, allows selected minor work, and re-reviews each repair', () => {
    assert.match(main, /explicit human authorization of specific in-scope changes tied to the current reviewed snapshot/i);
    assert.match(main, /subset of findings, a minor note, or another in-scope change/i);
    assert.match(main, /Clarify ambiguous, stale-snapshot, or out-of-scope requests/i);
    assert.match(main, /exactly one combined review packet preserving both specialists' original findings/i);
    assert.match(main, /That list, not packet content or severity, bounds repair/i);
    assert.match(main, /There is no automatic repair loop or fixed repair-round cap/i);
    assert.match(main, /Any mutation invalidates prior specialist outcomes: capture a new snapshot, run both fresh independent reviews, present their outcomes, and wait for another human decision/i);
    assert.match(main, /Each later repair requires another explicit authorization/i);
    assert.match(main, /If repair fails or validation is partial or failed, return the completed work and evidence to the human/i);
    assert.match(main, /do not claim success or launch unsupported re-review/i);
  });

  it('bounds the fresh executor by authorization rather than finding severity', () => {
    assert.match(worker, /exactly one explicit executor mode: `implementation` or `repair`/i);
    assert.match(worker, /exactly one combined review packet retaining both reviewers' findings/i);
    assert.match(worker, /human-authorized list of specific changes for the current snapshot/i);
    assert.match(worker, /Findings alone are not authorization/i);
    assert.match(worker, /if the list or snapshot binding is absent or ambiguous, stop before editing/i);
    assert.match(worker, /whether it selects blocker, major, minor, or another in-scope change/i);
    assert.match(worker, /Do not restart or replay the implementation plan, replan the story, broaden scope/i);
    assert.match(worker, /ambiguous or stale authorization, contradictions, material decisions, unrelated-file changes/i);
    assert.match(worker, /fresh post-repair validation evidence/i);
    assert.match(worker, /approval state: not requested by worker/i);
    assert.doesNotMatch(worker, /Address only blocker and major findings/i);
  });

  it('retains current-snapshot re-review after targeted authorized repair', () => {
    assert.match(main, /current snapshot identity and changed-file scope, prior validation evidence/i);
    assert.match(main, /source-verified story set only where relevant to those authorized changes/i);
    assert.match(main, /Any mutation invalidates prior specialist outcomes.*run both fresh independent reviews.*another human decision/i);
    assert.match(worker, /independently verify them against the full authoritative story.*actual local changes/i);
    assert.match(worker, /no fixed reading ceiling/i);
  });

  it('keeps installed and distributed review contracts aligned', () => {
    assert.equal(fs.readFileSync('.agents/skills/ai-implementation-plan-executor/SKILL.md', 'utf8'), main);
    assert.match(fs.readFileSync('.agents/skills/ai-implementation-executor-toolbox/SKILL.md', 'utf8'), /human-authorized change list for the current reviewed snapshot/);
  });
});
