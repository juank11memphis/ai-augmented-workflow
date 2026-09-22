import assert from 'node:assert/strict';
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

describe('automated implementation review orchestration', () => {
  it('routes only applicable local changes through synchronized specialist review', () => {
    const contents = readTemplate(mainExecutorPath);

    assert.match(contents, /Documentation-only changes bypass specialist review/i);
    assert.match(contents, /source code, tests, dependencies, schemas, or runtime configuration require specialist review/i);
    assert.match(contents, /round number, current changed-file list, current local diff, and fresh validation summary/i);
    assert.match(contents, /snapshot is an unchanged-local-change invariant, not a persisted hash/i);
    assert.match(contents, /same story and plan paths, authoritative artifacts and skills/i);
    assert.match(contents, /Spawn both read-only reviewers concurrently when supported/i);
    assert.match(contents, /Otherwise run them sequentially without allowing any writer between them/i);
    assert.match(contents, /unexpected mutation occurred, discard both outcomes/i);
  });

  it('validates reviewer packets and preserves specialist conclusions while deduplicating', () => {
    const contents = readTemplate(mainExecutorPath);

    for (const packetField of [
      'stable role-prefixed finding IDs',
      'severity',
      'location',
      'evidence',
      'violated expectation',
      'required outcome',
      'minor notes',
      'unresolved risks',
    ]) {
      assert.match(contents, new RegExp(packetField, 'i'));
    }

    assert.match(contents, /Associate the specialist role and review round from the spawn packet and orchestration context/i);
    assert.match(contents, /rather than requiring reviewers to echo them/i);
    assert.doesNotMatch(contents, /snapshot\/review-round identity, specialist role/i);
    assert.doesNotMatch(contents, /violated expectation, impact, required outcome, and disposition/i);
    assert.match(contents, /Retry a malformed or incomplete packet once/i);
    assert.match(contents, /Deduplicate overlapping findings by required outcome/i);
    assert.match(contents, /preserving every source finding ID, original severity, specialist ownership, and conclusion/i);
    assert.match(contents, /never downgrade severity/i);
    assert.match(contents, /Minor notes remain visible but do not trigger repair/i);
    assert.match(contents, /Do not merge away substantive contradictions/i);
  });

  it('escalates unavailable review, conflicts, material decisions, and exhausted repair', () => {
    const contents = readTemplate(mainExecutorPath);

    assert.match(contents, /reviewer spawning is unavailable.*independent automated approval is unavailable/is);
    assert.match(contents, /Never simulate an independent specialist review inline/i);
    assert.match(contents, /reviewers conflict, authoritative sources disagree/i);
    assert.match(contents, /new production dependency/i);
    assert.match(contents, /security\/privacy consequence/i);
    assert.match(contents, /destructive migration/i);
    assert.match(contents, /After the third repair, run one final synchronized review/i);
    assert.match(contents, /never start a fourth repair/i);
  });

  it('uses fresh existing executors for no more than three shared repairs', () => {
    const contents = readTemplate(mainExecutorPath);

    assert.match(contents, /Initial review is repair count zero/i);
    assert.match(contents, /Count a repair only after a fresh repair executor mutates/i);
    assert.match(contents, /fewer than three repairs have completed/i);
    assert.match(contents, /fresh existing `sibu-implementation-executor` in `repair` mode/i);
    assert.match(contents, /exactly one combined packet/i);
    assert.match(contents, /must not replan, replay implementation steps, broaden scope/i);
    assert.match(contents, /Any repair mutation invalidates all prior automated approvals/i);
    assert.match(contents, /run both fresh specialist reviews again/i);
  });

  it('keeps automated outcomes subordinate to one final human gate', () => {
    const contents = readTemplate(mainExecutorPath);

    assert.match(contents, /Matching specialist approvals, or minor-only outcomes.*human story review gate/is);
    assert.match(contents, /Automated outcomes never authorize approval metadata, commits, or feature continuation/i);
    assert.match(contents, /specialist-review applicability and repair rounds used/i);
    assert.match(contents, /architecture and technical-lead verdicts/i);
    assert.match(contents, /unavailable-review warning/i);
    assert.match(contents, /unresolved blocker\/major findings and escalation evidence/i);
    assert.match(contents, /Reviewer packets remain workflow messages/i);
  });
});

describe('implementation executor modes and validation efficiency', () => {
  it('defines distinct implementation and one-packet repair modes', () => {
    const contents = renderExecutorToolbox();

    assert.match(contents, /exactly one explicit executor mode: `implementation` or `repair`/i);
    assert.match(contents, /An `implementation` packet includes the ordered plan steps/i);
    assert.match(contents, /A `repair` packet additionally includes exactly one combined review packet/i);
    assert.match(contents, /Execute all unapproved step files.*once/i);
    assert.match(contents, /Return completion evidence to the main agent before human review/i);
    assert.match(contents, /Address only blocker and major findings/i);
    assert.match(contents, /Do not restart or replay the implementation plan, replan the story, broaden scope/i);
    assert.match(contents, /edit plan\/upstream artifacts/i);
    assert.match(contents, /approval state: not requested by worker/i);
    assert.doesNotMatch(contents, /Interactive Review Gate/);
  });

  it('requires efficient aggregate validation and fresh repair evidence in both contracts', () => {
    for (const contents of [readTemplate(mainExecutorPath), renderExecutorToolbox()]) {
      assert.match(contents, /focused checks/i);
      assert.match(contents, /one aggregate `pnpm verify`/i);
      assert.match(contents, /Do not.*standalone build, check, or full-test commands/is);
      assert.match(contents, /packed-runtime validation once at the end only when/i);
      assert.match(contents, /Rerun expensive.*only after.*changes.*stale.*or.*diagnos/is);
      assert.match(contents, /fresh post-repair validation evidence/i);
    }
  });
});
