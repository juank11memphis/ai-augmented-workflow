# Step: Update CLI imports for moved workflows

## Goal

Point the CLI command surface at Project Adoption and Workflow Health Diagnosis for the moved init and doctor workflows.

## Scope

- Update CLI command type imports for `InitProjectCommand` and `DoctorProjectCommand` to use module entrypoints instead of `src/features/*` paths.
- Update CLI command execution imports for `handleInitProject` and `handleDoctorProject` to use module entrypoints.
- Leave sync and skill command imports unchanged for now; they are owned by later User Workflow Modules stories.
- Remove empty legacy `src/features/init-project/` and `src/features/doctor-project/` source files after imports are updated.
- Do not rename `SibuCliCommand` discriminants, command names, or command arguments.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/project-adoption/index.ts`
- `src/modules/workflow-health-diagnosis/index.ts`
- `src/features/init-project/command.ts`
- `src/features/init-project/handler.ts`
- `src/features/doctor-project/command.ts`
- `src/features/doctor-project/handler.ts`
- `src/features/doctor-project/handler.test.ts`

## Done when

- CLI command parsing and dispatch compile against module-owned init and doctor contracts.
- No source file imports from `src/features/init-project/*` or `src/features/doctor-project/*`.
- Remaining `src/features/*` imports are only for sync and skills workflows that are out of scope for this story.
- `pnpm build` passes after import updates.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:51:42-06:00
