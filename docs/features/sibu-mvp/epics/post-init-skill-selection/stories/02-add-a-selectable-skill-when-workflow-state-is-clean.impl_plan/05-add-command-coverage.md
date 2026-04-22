# Step: Add focused command behavior coverage

## Goal
Add automated coverage for the new command behavior so clean selection and already-selected no-op behavior are protected by repeatable tests.

## Scope

- Add focused tests around the pure helper behavior introduced for clean-state checks and next-selection calculation where possible.
- Add command-level coverage for successful TypeScript selection in a clean initialized fixture or temporary repo.
- Add command-level coverage for the already-selected TypeScript case and assert it exits successfully without changing file contents or state hashes.
- Keep tests small and deterministic by using temporary directories and local templates instead of depending on a developer's current working repo.
- Update package test wiring only if needed to run the new tests with the existing `node --test` setup.
- Do not expand this step into unsafe dirty-state refusal scenarios owned by the next story unless needed to protect no-partial-write behavior in the clean path.

## Files

- src/features/use-skill/handler.ts
- src/features/use-skill/handler.test.ts
- src/shared/workflow-mutation-readiness.ts
- src/shared/workflow-mutation-readiness.test.ts
- src/shared/catalog.test.ts
- package.json

## Done when

- Tests cover clean `typescript` selection and verify the skill file, `AGENTS.md`, and `.sibu/state.json` outcomes.
- Tests cover already-selected `typescript` as a successful no-op with no file changes.
- The test suite can be run through the repository's existing test command or an intentionally updated package script.
- `pnpm test`, `pnpm build`, and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T03:58:24Z
