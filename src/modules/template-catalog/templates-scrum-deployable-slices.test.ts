import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const skill = readTemplate('skills/scrum-master-planner/SKILL.md');
const fixtureRoot = join(process.cwd(), 'src/modules/template-catalog/fixtures/scrum-deployable-slices');
const fixture = (name: string): string => readFileSync(join(fixtureRoot, name), 'utf8');
const brd = fixture('sample-brd.md');

const storyHeadings = [
  'Epic', 'User Story', 'Context and Source Traceability', 'In Scope', 'Out of Scope',
  'Acceptance Criteria', 'Verification Expectations', 'Validation', 'Domain Context',
  'Technical Context', 'UX References', 'Non-Functional Criteria',
  'Deployability and Feature Flag', 'Dependencies', 'Open Questions and Assumptions',
];

function assertHeadingsInOrder(content: string, headings: string[]): void {
  const actual = [...content.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(actual, headings);
}

describe('deployable Scrum authoring contract', () => {
  it('requires one outcome per Epic with identity, sources, ordered links, and completion', () => {
    assert.match(skill, /Split unrelated outcomes/);
    assert.match(skill, /\*\*Epic ID:\*\* <stable ID>/);
    assert.match(skill, /Domain and capabilities:.*served capabilities/);
    assert.match(skill, /UX:.*applicable UX document sections when this Epic includes UI changes.*`not applicable`/);
    assert.match(skill, /## User Stories and Sequence/);
    assert.match(skill, /meaningful cross-Story dependencies and an explicit completion condition/);
    const epic = fixture('valid-epic.md');
    assert.match(epic, /\*\*Epic ID:\*\* SAMPLE-E01/);
    assert.match(epic, /Capabilities served:/);
    assert.match(epic, /UX: not applicable/);
    assert.match(epic, /depends on none and blocks none/);
    assert.match(epic, /Completion condition:/);
  });

  it('uses the fixed Story order and verifiable, source-grounded criteria', () => {
    assertHeadingsInOrder(skill.match(/Each new User Story[\s\S]*?```md\n([\s\S]*?)\n```/)?.[1] ?? '', storyHeadings);
    const story = fixture('valid-story.md');
    assertHeadingsInOrder(story, storyHeadings);
    assert.match(story, /\*\*Story ID:\*\* SAMPLE-S01/);
    assert.match(story, /\*\*Status:\*\* ready-for-planning/);
    assert.match(story, /Verification: test/);
    assert.match(story, /Verification: needs human\/LLM-judge review/);
    assert.match(skill, /observable pass\/fail outcome/);
    assert.match(skill, /Acceptance Criteria stay behavior-focused/);
    assert.match(skill, /Verification Expectations stay evidence-focused/);
    assert.match(skill, /Validation stays command\/check-focused/);
  });

  it('requires deployable sizing, honest readiness, and explicit non-applicability', () => {
    assert.match(skill, /one working vertical increment/);
    assert.match(skill, /Split unrelated behaviors or a horizontal-only layer/);
    assert.match(skill, /without unmerged sibling Stories/);
    assert.match(skill, /roughly three to six acceptance criteria is a review heuristic, not a hard cap/);
    assert.match(skill, /material open questions keep a Story in `draft`/);
    assert.match(skill, /Mark irrelevant details `not applicable` or `none`/);
    const story = fixture('valid-story.md');
    assert.match(story, /Behind flag:\*\* no/);
    assert.match(story, /no unmerged sibling Story/);
    assert.match(story, /UX: not applicable/);
    assert.match(story, /Open questions: none\. Accepted assumptions:/);
  });

  it('shows counterexamples without treating them as approved Stories', () => {
    const invalid = fixture('invalid-cases.md');
    for (const heading of [
      'Unrelated behaviors', 'Horizontal-only scope', 'Unresolved question',
      'Missing or invalid BRD ID', 'Unverifiable criterion', 'UI-relevant omission',
    ]) {
      assert.match(invalid, new RegExp(`^## ${heading}$`, 'm'));
    }
    assert.match(invalid, /\*\*Status:\*\* draft/);
    assert.match(invalid, /REQ-99.*does not occur/);
    assert.doesNotMatch(brd, /\*\*REQ-99\b/);
    assert.match(invalid, /ux\.md.*mockups/);
  });

  it('uses resolvable authoring BRD IDs without treating them as checkout authority', () => {
    for (const name of [
      'valid-epic.md', 'valid-story.md', 'flag-decision-cases.md',
      'flagged-epic.md', 'flagged-story.md', 'flag-removal-story.md',
    ]) {
      const content = fixture(name);
      assert.match(content, /src\/modules\/template-catalog\/fixtures\/scrum-deployable-slices\/sample-brd\.md/);
      const ids = [...new Set(content.match(/\bREQ-\d{2}\b/g) ?? [])];
      assert.ok(ids.length > 0);
      for (const id of ids) assert.match(brd, new RegExp(`\\*\\*${id}\\b`));
    }
    for (const name of ['flagged-epic.md', 'flagged-story.md', 'flag-removal-story.md']) {
      const content = fixture(name);
      assert.match(content, /Authoring rules only:.*These sources do not define checkout behavior/);
      assert.match(content, /Checkout authority missing:.*checkout feature BRD.*revised checkout SDD.*project SAD flag mechanism/);
      assert.match(content, /\*\*Status:\*\* draft/);
      assert.doesNotMatch(content, /\*\*Status:\*\* ready-for-planning/);
    }
    for (const name of ['flagged-story.md', 'flag-removal-story.md']) {
      const content = fixture(name);
      assert.match(content, /Open questions: What checkout BRD\/SDD behavior/);
      assert.match(content, /Accepted assumptions: none\. Remain `draft` until resolved/);
      assert.match(content, /Checkout UX applicability unresolved/);
    }
  });

  it('asks for a reasoned flag choice only when unfinished behavior would be exposed', () => {
    const cases = fixture('flag-decision-cases.md');
    assert.match(skill, /Do not ask about flags speculatively for internal-only or backward-compatible increments/);
    assert.match(skill, /Explain the concrete exposure risk and ask whether the user wants to use flags/);
    assert.match(skill, /do not ask the user to determine whether a flag is needed/);
    for (const heading of [
      'No flag needed', 'Explained need and user decision', 'Refusal with viable slice',
      'Refusal without viable slice', 'First accepted flag: missing mechanism',
      'Later feature: established mechanism', 'Resume after source handoffs',
    ]) assert.match(cases, new RegExp(`^## ${heading}$`, 'm'));
    assert.match(cases, /do not ask a speculative flag question/);
    assert.match(cases, /checkout flow.*concrete exposure risk/);
    assert.match(cases, /independently deployable and reviewable Story/);
    assert.match(cases, /conflict and stop for a human decision/);
  });

  it('pauses for project SAD and feature SDD handoffs without inventing or repeating a mechanism', () => {
    assert.match(skill, /read the target project's `docs\/architecture\.md`/);
    assert.match(skill, /Reuse an established mechanism without asking how flags work again/);
    assert.match(skill, /ask once how the project should support flags/);
    assert.match(skill, /obtain an explicit choice/);
    assert.match(skill, /user-directed `software-architecture-writer` update to the project SAD/);
    assert.match(skill, /user-directed `software-design-writer` revision of this feature's SDD/);
    assert.match(skill, /Resume planning only after both sources are available and consistent/);
    const cases = fixture('flag-decision-cases.md');
    assert.match(cases, /project SAD has no clear flag mechanism.*Ask once/s);
    assert.match(cases, /project SAD already records a mechanism; reuse it without another mechanism question/);
    assert.match(cases, /reread the revised SDD/);
  });

  it('specifies flagged Epic inventory, off/on Stories, and scoped final removal', () => {
    const epic = fixture('flagged-epic.md');
    const story = fixture('flagged-story.md');
    const removal = fixture('flag-removal-story.md');
    assertHeadingsInOrder(story, storyHeadings);
    assertHeadingsInOrder(removal, storyHeadings);
    assert.match(skill, /Create and link a final Story dedicated to removing all flag code/);
    assert.match(skill, /flag-off preservation of existing behavior and flag-on new behavior/);
    assert.match(skill, /repository search scoped to executable code and configuration plus human diff review/);
    assert.match(epic, /checkout_enabled.*used by SAMPLE-S02 and removed by SAMPLE-S03/);
    assert.match(epic, /cannot be done until SAMPLE-S03 removes all introduced flag code references/);
    assert.ok(epic.indexOf('flagged-story.md') < epic.indexOf('flag-removal-story.md'));
    assert.match(story, /AC-01 — Flag off \(illustrative\):[^\n]*existing checkout behavior is preserved as defined by the missing checkout BRD\/SDD/);
    assert.match(story, /AC-02 — Flag on \(illustrative\):[^\n]*new checkout path completes an order as defined by the missing checkout BRD\/SDD/);
    assert.match(story, /Safe default and migration conditions: pending the project SAD and revised checkout SDD/);
    assert.match(removal, /search scoped to executable code and configuration.*human diff review/);
    assert.match(removal, /\*\*Behind flag:\*\* no/);
    assert.doesNotMatch(removal, /production.deployment evidence/i);
  });

  it('preserves upstream gates, output paths, user control, and new-artifact-only scope', () => {
    assert.match(skill, /BRD or software design is missing/);
    assert.match(skill, /feature has UI impact and `ux\.md` is missing/);
    assert.match(skill, /epics\/<epic-slug>\/epic_brief\.md/);
    assert.match(skill, /stories\/<order>-<user-story-slug>\.md/);
    assert.match(skill, /newly created Epics and Stories only/);
    assert.match(skill, /do not retrofit existing planning artifacts/);
    assert.match(skill, /A user request selects the next stage/);
    assert.match(skill, /ask whether the user wants to use flags/);
    const manifest = readTemplateManifest();
    assert.match(manifest.templates['skills/scrum-master-planner/SKILL.md']?.changes.join(' ') ?? '', /conditional flag decisions.*SAD.*SDD.*removal/i);
  });
});

// Manual review of the fixture pair: SAMPLE-S01 changes one prompt-owned contract plus
// its distribution metadata, has no runtime dependency on a sibling, and can be reviewed
// in one sitting. AC-03 explicitly needs human judgment; text assertions do not certify
// future model output or guarantee every proposed slice is independently deployable.
