# Step: Consolidate CLI module imports

## Goal

Make the CLI command surface import all user workflow contracts and handlers from module entrypoints in a clear, stable way.

## Scope

- Review `src/entrypoints/cli/command.ts` and `src/entrypoints/cli/execute-command.ts` after the workflow moves.
- Keep `InitProjectCommand`, `DoctorProjectCommand`, `SyncProjectCommand`, `ListSkillsCommand`, `StopManagingFileCommand`, and `UseSkillCommand` imported from their owning module entrypoints.
- Keep `handleInitProject`, `handleDoctorProject`, `handleSyncProject`, `handleListSkills`, `handleStopManagingFile`, and `handleUseSkill` imported from their owning module entrypoints.
- Optionally group same-module imports to improve readability without changing command discriminants or dispatch behavior.
- Do not change command names, descriptions, arguments, or Commander setup.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/project-adoption/index.ts`
- `src/modules/workflow-health-diagnosis/index.ts`
- `src/modules/sync-review/index.ts`
- `src/modules/skill-selection-management/index.ts`

## Done when

- CLI dispatch calls module-owned handlers for init, doctor, sync, and skills commands.
- Current `SibuCliCommand` discriminants and command contracts remain unchanged.
- `pnpm build` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:13:09-06:00
