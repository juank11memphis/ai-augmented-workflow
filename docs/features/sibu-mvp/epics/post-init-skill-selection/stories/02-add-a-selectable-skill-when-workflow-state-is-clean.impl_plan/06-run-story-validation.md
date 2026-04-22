# Step: Run final story validation

## Goal
Validate the completed `sibu skills use <skill_name>` clean-state path against the story acceptance criteria and capture any remaining risk before marking the story complete.

## Scope

- Run the automated validation commands required by the story.
- Smoke test `sibu skills use typescript` in an existing clean Sibu-enabled repo or a temporary initialized repo that represents one.
- Smoke test the already-selected case and confirm it exits successfully without changing files.
- Inspect resulting `AGENTS.md` and `.sibu/state.json` only enough to confirm the new routing and managed metadata are present.
- Do not implement dirty-state refusal scenarios beyond any preflight needed by this story; the broader unsafe cases belong to the next user story.

## Files

- src/features/use-skill/command.ts
- src/features/use-skill/handler.ts
- src/entrypoints/cli/command.ts
- src/entrypoints/cli/create-program.ts
- src/entrypoints/cli/execute-command.ts
- src/shared/workflow-mutation-readiness.ts
- src/shared/workflow-targets.ts
- src/shared/templates.ts
- src/shared/state.ts
- src/features/use-skill/handler.test.ts
- src/shared/workflow-mutation-readiness.test.ts
- docs/features/sibu-mvp/epics/post-init-skill-selection/stories/02-add-a-selectable-skill-when-workflow-state-is-clean.md

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes if command coverage was added.
- A clean-repo smoke test of `sibu skills use typescript` creates and records the TypeScript skill.
- `AGENTS.md` includes the newly selected TypeScript routing instruction after the smoke test.
- `.sibu/state.json` reflects the new TypeScript selection and managed file metadata after the smoke test.
- Re-running `sibu skills use typescript` succeeds as a no-op and does not change files.
- Any remaining unsafe-state behavior is explicitly deferred to `03-refuse-unsafe-post-init-skill-selection.md` rather than hidden in this story.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T04:02:26Z
