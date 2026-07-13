# Step: Add focused template and manifest tests

## Goal

Add high-level test coverage that proves the new required skill template exists, is registered, has the expected guidance boundaries, and is included in generated workflow targets without brittle full-prose assertions.

## Scope

- Add or update template-catalog tests for manifest registration, `name: structured-logging`, and key guidance themes: project conventions first, safe structured logs, operational storytelling metadata, sensitive-data exclusions, helper/wrapper guidance, and noisy-log avoidance.
- Add or update catalog/expected-target tests proving `structured-logging` is mandatory, not selectable, and targets `.agents/skills/structured-logging/SKILL.md` for supported agents.
- If this repository requires committed compiled test artifacts, update the corresponding `bin/` files by running the normal build rather than hand-maintaining divergent test copies.
- Keep assertions high-level and do not assert the full skill prose.

## Files

- `src/modules/template-catalog/templates.test.ts`
- `src/modules/template-catalog/catalog.test.ts`
- `src/support/expected-workflow-targets.test.ts`
- `bin/modules/template-catalog/templates.test.js`
- `bin/modules/template-catalog/catalog.test.js`
- `bin/support/expected-workflow-targets.test.js`

## Done when

- Focused tests fail if the structured logging template, manifest entry, mandatory catalog registration, or required target path is missing.
- Tests verify the required high-level guidance without coupling to exact paragraphs.
- Source and generated/compiled test files are consistent with the repository's normal build output expectations.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T18:52:49Z
