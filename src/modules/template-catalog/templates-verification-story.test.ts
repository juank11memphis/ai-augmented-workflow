import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const templatePath = 'skills/scrum-master-planner/SKILL.md';

// Representative, hand-written multi-Story fixture. This tests the expected
// artifact contract, not whether an agent will produce the artifact.
const verificationStrategy = {
  importStory: {
    method: 'acceptance/integration check',
    coverage: 'duplicate import and rollback',
    evidence: 'passing fixture output and inspected rollback record',
    humanLimit: 'a reviewer judges whether the rollback record is understandable',
    exclusion: 'no live bank connection in unit tests',
  },
  dashboardStory: {
    method: 'visual comparison',
    coverage: 'dashboard empty state at mobile breakpoint',
  },
};

const importStory = `
## Acceptance Criteria
- AC-01 (REQ-04): Duplicate import and rollback remain correct. Verification: acceptance/integration check.
## Verification Expectations
- Preserve ${verificationStrategy.importStory.coverage}; expect ${verificationStrategy.importStory.evidence}.
- Human limit: ${verificationStrategy.importStory.humanLimit}.
- Exclusion: ${verificationStrategy.importStory.exclusion}.
## Validation
- Run the ${verificationStrategy.importStory.method} for this slice; select the exact repository command during implementation planning.
`;

describe('Scrum verification handoff contract (not model behavior)', () => {
  it('requires a source-faithful, Story-scoped SDD handoff without an approval gate', () => {
    const source = readTemplate(templatePath);
    assert.ok(readTemplateManifest().templates[templatePath]);
    const handoff = source.split('For each Story slice, map the applicable SDD quality-strategy direction')[1]
      ?.split('Verification expectations should name')[0];
    assert.ok(handoff, 'Story-scoped verification handoff is present');
    for (const required of [
      'acceptance criteria', 'Verification Expectations', 'Validation',
      'verification methods', 'scenarios', 'surfaces', 'states', 'UX breakpoints',
      'reviewer evidence', 'human-only judgments', 'automation limits',
      'material exclusions', 'source BRD requirement IDs', 'governing SDD section',
    ]) {
      assert.ok(handoff.includes(required), required);
    }
    assert.match(handoff, /Include only what applies to this Story; do not copy the whole feature strategy/);
    assert.match(handoff, /do not.*silently replace a required method with a non-equivalent check/);
    assert.match(handoff, /missing or contradictory, stop.*rather than guessing/);
    assert.match(handoff, /not an approval record; do not add SDD sign-off or routine Story approval/);
  });

  it('keeps a relevant method, coverage, evidence, human limit, and exclusion in a representative Story', () => {
    for (const requirement of Object.values(verificationStrategy.importStory)) {
      assert.ok(importStory.includes(requirement), requirement);
    }
    assert.match(importStory, /AC-01 \(REQ-04\)/);
    assert.doesNotMatch(importStory, /visual comparison|dashboard empty state|mobile breakpoint/);
    assert.ok(!importStory.includes(verificationStrategy.dashboardStory.method));
    assert.ok(!importStory.includes(verificationStrategy.dashboardStory.coverage));
  });
});
