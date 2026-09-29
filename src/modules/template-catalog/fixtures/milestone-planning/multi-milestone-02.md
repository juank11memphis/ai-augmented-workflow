# Step: Route declared flags and distribute the planner contract

## Goal

Update the planner gatekeeper to reject undeclared flags and require checked declared-flag work, then version both changed planner templates.

## Scope

- Task ID: T-02; Milestone ID: M-02; Status: pending; Depends on: T-01.
- Story acceptance criteria: AC-05; source decisions: only Epic/Story-declared flags may be planned, with off/on and final no-reference checks; the gatekeeper must keep current Story-level review controls and versioned Sibu sync notes must distribute the changed skills; on-demand pointers: `docs/features/afk-story-planning-and-execution/sdd.md#failure-safety-and-flag-behavior`, `docs/features/afk-story-planning-and-execution/sdd.md#distribution-and-migration-boundary`; applicable skills: `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Files/area: `templates/skills/ai-implementation-planner/SKILL.md`, `templates/manifest.json`, `src/modules/template-catalog/templates-milestone-planning.test.ts`, and declared/undeclared-flag fixtures.

## Files

- templates/skills/ai-implementation-planner/SKILL.md
- templates/manifest.json
- src/modules/template-catalog/templates-milestone-planning.test.ts
- src/modules/template-catalog/fixtures/milestone-planning/

## Done when

- Task check: `node --test --test-name-pattern='uses declared flags with off/on and final-removal checks, rejecting inventions|versions both templates and leaves thin planner wrappers aligned' bin/modules/template-catalog/templates-milestone-planning.test.js`; pass: named flag-handoff and versioned-distribution assertions pass against gatekeeper guidance and manifest; expected evidence: TAP reports both named assertions passing.
