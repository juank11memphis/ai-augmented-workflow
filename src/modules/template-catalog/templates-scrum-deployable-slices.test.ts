import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const skill = readTemplate('skills/scrum-master-planner/SKILL.md');
const fixtureRoot = join(process.cwd(), 'src/modules/template-catalog/fixtures/scrum-deployable-slices');
const fixture = (name: string): string => readFileSync(join(fixtureRoot, name), 'utf8');
const brd = readFileSync(join(process.cwd(), 'docs/features/deployable-epic-story-authoring/brd.md'), 'utf8');

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

  it('uses resolvable BRD IDs in the reviewed example pair', () => {
    for (const name of ['valid-epic.md', 'valid-story.md']) {
      const content = fixture(name);
      assert.match(content, /docs\/features\/deployable-epic-story-authoring\/brd\.md/);
      const ids = [...new Set(content.match(/\bREQ-\d{2}\b/g) ?? [])];
      assert.ok(ids.length > 0);
      for (const id of ids) assert.match(brd, new RegExp(`\\*\\*${id}\\b`));
    }
  });

  it('preserves upstream gates, output paths, user control, and new-artifact-only scope', () => {
    assert.match(skill, /BRD or software design is missing/);
    assert.match(skill, /feature has UI impact and `ux\.md` is missing/);
    assert.match(skill, /epics\/<epic-slug>\/epic_brief\.md/);
    assert.match(skill, /stories\/<order>-<user-story-slug>\.md/);
    assert.match(skill, /newly created Epics and Stories only/);
    assert.match(skill, /do not retrofit existing planning artifacts/);
    assert.match(skill, /A user request selects the next stage/);
    assert.doesNotMatch(skill, /ask whether they want to use flags|route.*SAD update|final flag-removal Story/i);
    const manifest = readTemplateManifest();
    assert.match(manifest.templates['skills/scrum-master-planner/SKILL.md']?.changes.join(' ') ?? '', /deployable.*traceable/i);
  });
});

// Manual review of the fixture pair: SAMPLE-S01 changes one prompt-owned contract plus
// its distribution metadata, has no runtime dependency on a sibling, and can be reviewed
// in one sitting. AC-03 explicitly needs human judgment; text assertions do not certify
// future model output or guarantee every proposed slice is independently deployable.
