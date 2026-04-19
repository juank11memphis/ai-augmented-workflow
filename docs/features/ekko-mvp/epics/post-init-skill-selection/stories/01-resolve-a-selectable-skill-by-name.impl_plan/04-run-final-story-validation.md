# Step: Run final story validation

## Goal
Validate the completed helper against the story acceptance criteria and capture any blocked command-level smoke test without expanding this story beyond its helper scope.

## Scope

- Run the automated validation commands from the story.
- Confirm the helper is reusable by the future command handler without duplicating catalog traversal logic.
- Check that exact id matching is the only implemented matching behavior.
- If `ekko skills use` is not implemented yet, record that the `ekko skills use nope` smoke test is blocked by the later command-handler story rather than implementing the command here.
- Do not add CLI registration, clean-state checks, file mutation, or state updates in this story.

## Files

- src/shared/catalog.ts
- src/shared/types.ts
- docs/features/ekko-mvp/epics/post-init-skill-selection/stories/01-resolve-a-selectable-skill-by-name.md

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- All acceptance criteria for shared selectable skill resolution are satisfied.
- Any inability to run `ekko skills use nope` is explicitly noted as blocked by the not-yet-implemented command handler, not silently ignored.
- No scope from the later post-init skill selection stories has been implemented.
