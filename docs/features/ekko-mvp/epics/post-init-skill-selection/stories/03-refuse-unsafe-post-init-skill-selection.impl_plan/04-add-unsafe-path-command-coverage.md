# Step: Add unsafe path command coverage

## Goal

Cover the full refusal behavior of `ekko skills use` from the command handler level so every acceptance criterion is protected against regressions.

## Scope

- Add reusable test helpers for creating clean initialized repositories, dirtying managed files, creating unrecorded skill files, corrupting state, and snapshotting relevant workflow files.
- Cover missing or invalid state, modified managed files, unrecorded selected skill target, changed `AGENTS.md`, and architecture skill conflict at the handler level.
- Assert each unsafe case exits without file or state changes.
- Assert refused dirty-state output includes enough information to direct the user to `ekko sync`; capture logs only if existing test patterns support it cleanly, otherwise assert through returned state and exit code.
- Do not expand tests into unrelated `init`, `sync`, or `skills list` behavior.

## Files

- src/features/use-skill/handler.test.ts
- src/shared/workflow-mutation-readiness.test.ts
- src/features/use-skill/handler.ts
- package.json

## Done when

- Tests prove dirty workflow state blocks `ekko skills use typescript` before writes.
- Tests prove an unrecorded existing `.agents/skills/typescript/SKILL.md` is not overwritten or adopted silently.
- Tests prove `AGENTS.md` local edits block selection and preserve `.ekko/state.json`.
- Tests prove a different selected architecture skill blocks selection and preserves all files.
- The test suite remains deterministic and cleans up temporary repositories after each case.
- `pnpm build`, `pnpm check`, and `pnpm test` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:19:34Z
