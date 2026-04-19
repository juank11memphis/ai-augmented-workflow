# Step: Run final story validation

## Goal
Validate the completed `ekko skills use <skill_name>` clean-state path against the story acceptance criteria and capture any remaining risk before marking the story complete.

## Scope

- Run the automated validation commands required by the story.
- Smoke test `ekko skills use typescript` in an existing clean Ekko-enabled repo or a temporary initialized repo that represents one.
- Smoke test the already-selected case and confirm it exits successfully without changing files.
- Inspect resulting `AGENTS.md` and `.ekko/state.json` only enough to confirm the new routing and managed metadata are present.
- Do not implement dirty-state refusal scenarios beyond any preflight needed by this story; the broader unsafe cases belong to the next user story.

## Files

- src/features/use-skill/command.ts
- src/features/use-skill/handler.ts
- src/entrypoints/cli/command.ts
- src/entrypoints/cli/create-program.ts
- src/entrypoints/cli/execute-command.ts
- src/shared/workflow-cleanliness.ts
- src/shared/workflow-targets.ts
- src/shared/templates.ts
- src/shared/state.ts
- src/features/use-skill/handler.test.ts
- src/shared/workflow-cleanliness.test.ts
- docs/features/ekko-mvp/epics/post-init-skill-selection/stories/02-add-a-selectable-skill-when-workflow-state-is-clean.md

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes if command coverage was added.
- A clean-repo smoke test of `ekko skills use typescript` creates and records the TypeScript skill.
- `AGENTS.md` includes the newly selected TypeScript routing instruction after the smoke test.
- `.ekko/state.json` reflects the new TypeScript selection and managed file metadata after the smoke test.
- Re-running `ekko skills use typescript` succeeds as a no-op and does not change files.
- Any remaining unsafe-state behavior is explicitly deferred to `03-refuse-unsafe-post-init-skill-selection.md` rather than hidden in this story.
