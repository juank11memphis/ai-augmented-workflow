# Step: Run story validation

## Goal

Validate that unsafe post-init skill selection refuses changes in automated checks and with the requested dirty-repo smoke test.

## Scope

- Run the required automated validation commands for this story.
- Run the focused test suite that covers `skills use` unsafe paths.
- Manually smoke test a dirty Ekko repo by modifying a managed file, running `ekko skills use typescript`, and confirming no files change and the output points to `ekko sync`.
- Record any validation failures with the exact command and failing output before fixing them in the relevant prior step.
- Do not add new feature behavior during validation except minimal fixes needed to satisfy the story acceptance criteria.

## Files

- package.json
- bin/ekko.js
- src/features/use-skill/handler.test.ts
- src/shared/workflow-mutation-readiness.test.ts
- AGENTS.md
- .ekko/state.json

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes or the focused equivalent is documented if the full suite is unavailable.
- The dirty-repo smoke test confirms `ekko skills use typescript` exits without file or state changes and clearly points to `ekko sync`.
- Any remaining risk or manual limitation is documented before marking the story complete.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:21:04Z
