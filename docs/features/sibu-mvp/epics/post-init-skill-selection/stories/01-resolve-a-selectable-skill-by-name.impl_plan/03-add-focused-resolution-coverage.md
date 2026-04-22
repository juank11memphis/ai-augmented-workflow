# Step: Add focused selectable skill resolution unit tests

## Goal
Add focused unit tests for the shared resolution helper so the story’s acceptance criteria are protected by repeatable automated coverage.

## Scope

- Add unit test coverage for known selectable ids, unknown ids, and required-only ids.
- If the repository does not already have a unit test pattern, introduce the smallest practical test setup needed for this helper.
- Add or update the package script needed to run the unit tests.
- Cover the helper contract rather than CLI command behavior.
- Do not implement or register `sibu skills use` in this story.

## Files

- src/shared/catalog.ts
- src/shared/types.ts
- src/shared/catalog.test.ts
- package.json

## Done when

- Known selectable skill ids are tested to resolve with the correct category.
- An unknown skill id is tested to fail with a message that suggests `sibu skills list`.
- A required-only skill id is tested not to resolve as selectable.
- A repeatable unit test command exists and passes.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T01:49:47Z
