# Step: Move project adoption handler

## Goal

Move `sibu init` command behavior into the Project Adoption module while preserving current initialization semantics and CLI command contract.

## Scope

- Move `src/features/init-project/handler.ts` and `src/features/init-project/command.ts` into `src/modules/project-adoption/` with stable exported names.
- Update `src/modules/project-adoption/index.ts` to export the init handler and command type.
- Update relative imports inside the moved files to keep using the approved module boundaries for state registry, target planning, prompts, paths, and shared constants.
- Preserve existing first-run behavior, existing-state idempotency, malformed-state refusal, existing-file protection, prompt flow, output meaning, and exit-code behavior.
- Do not change prompt text, prompt order, generated file contents, state schema, or init command arguments.

## Files

- `src/features/init-project/handler.ts`
- `src/features/init-project/command.ts`
- `src/modules/project-adoption/handler.ts`
- `src/modules/project-adoption/command.ts`
- `src/modules/project-adoption/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/shared/catalog.ts`
- `src/shared/paths.ts`
- `src/shared/prompts.tsx`

## Done when

- Project Adoption owns `handleInitProject` and `InitProjectCommand`.
- The moved handler compiles with correct relative imports and no behavior changes.
- No production code imports init behavior from `src/features/init-project/*`.
- Existing-state and malformed-state branches still avoid overwriting `.sibu/state.json`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:51:42-06:00
