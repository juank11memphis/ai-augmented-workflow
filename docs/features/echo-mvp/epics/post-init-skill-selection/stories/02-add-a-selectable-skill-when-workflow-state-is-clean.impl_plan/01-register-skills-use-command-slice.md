# Step: Register the skills use command slice

## Goal
Add the `echo skills use <skill_name>` command contract, CLI registration, and dispatch wiring so the command reaches a dedicated feature handler without putting business logic in the CLI entrypoint.

## Scope

- Add a new `UseSkillCommand` type with `type: 'skills:use'` and `skillName: string`.
- Add a `src/features/use-skill/` feature slice with `command.ts` and `handler.ts`.
- Register `echo skills use <skill_name>` under the existing `skills` command in the CLI program.
- Dispatch `skills:use` from `executeCliCommand` to the new handler.
- Keep the CLI entrypoint limited to argument parsing and command dispatch.
- Do not implement workflow cleanliness checks, file mutation, or state updates in this step.

## Files

- src/features/use-skill/command.ts
- src/features/use-skill/handler.ts
- src/entrypoints/cli/command.ts
- src/entrypoints/cli/create-program.ts
- src/entrypoints/cli/execute-command.ts

## Done when

- `echo skills use <skill_name>` is registered by Commander and dispatches a `skills:use` command object.
- The new handler exists as the owner of semantic behavior for skill selection.
- No command-specific business rules are implemented in `src/entrypoints/cli/*`.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T03:30:29Z
