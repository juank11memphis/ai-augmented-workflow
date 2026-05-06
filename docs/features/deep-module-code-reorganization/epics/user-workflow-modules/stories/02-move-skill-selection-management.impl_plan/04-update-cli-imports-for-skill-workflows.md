# Step: Update CLI imports for skill workflows

## Goal

Point the CLI command surface at Skill Selection Management for all `sibu skills` workflows.

## Scope

- Update CLI command type imports for `ListSkillsCommand`, `UseSkillCommand`, and `StopManagingFileCommand` to use `src/modules/skill-selection-management/index.ts` instead of `src/features/*` paths.
- Update CLI command execution imports for `handleListSkills`, `handleUseSkill`, and `handleStopManagingFile` to use the Skill Selection Management module entrypoint.
- Leave sync imports unchanged; sync behavior is owned by the separate sync review and mutation readiness story.
- Remove empty legacy `src/features/list-skills/`, `src/features/use-skill/`, and `src/features/stop-managing-file/` source files after imports are updated.
- Do not rename `SibuCliCommand` discriminants, command names, command arguments, or command dispatch cases.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/skill-selection-management/index.ts`
- `src/features/list-skills/command.ts`
- `src/features/list-skills/handler.ts`
- `src/features/use-skill/command.ts`
- `src/features/use-skill/handler.ts`
- `src/features/use-skill/handler.test.ts`
- `src/features/stop-managing-file/command.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/features/stop-managing-file/handler.test.ts`

## Done when

- CLI command parsing and dispatch compile against module-owned skill contracts and handlers.
- No source file imports from `src/features/list-skills/*`, `src/features/use-skill/*`, or `src/features/stop-managing-file/*`.
- Remaining `src/features/*` imports are only for sync workflows that are out of scope for this story.
- `pnpm build` passes after import updates.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:56:55-06:00
