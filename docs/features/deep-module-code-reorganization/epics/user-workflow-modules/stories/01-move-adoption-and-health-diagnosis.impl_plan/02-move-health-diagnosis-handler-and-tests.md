# Step: Move health diagnosis handler and tests

## Goal

Move `sibu doctor` command behavior and tests into the Workflow Health Diagnosis module while preserving read-only health-check behavior.

## Scope

- Move `src/features/doctor-project/handler.ts`, `src/features/doctor-project/command.ts`, and `src/features/doctor-project/handler.test.ts` into `src/modules/workflow-health-diagnosis/`.
- Update `src/modules/workflow-health-diagnosis/index.ts` to export the doctor handler, command type, and any tested helper functions that need to remain reachable.
- Update relative imports inside moved implementation and test files to use Workflow State Registry, Template Catalog and Rendering, Workflow Target Planning, Version Advisory, and shared primitives from their approved locations.
- Preserve diagnosis rules, unsupported-selection warnings, missing-file behavior, template update checks, npm advisory line formatting, sync next-step lines, output meaning, and exit-code behavior.
- Do not change doctor into a mutating command, apply sync repairs, or weaken moved test assertions.

## Files

- `src/features/doctor-project/handler.ts`
- `src/features/doctor-project/command.ts`
- `src/features/doctor-project/handler.test.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/workflow-health-diagnosis/command.ts`
- `src/modules/workflow-health-diagnosis/handler.test.ts`
- `src/modules/workflow-health-diagnosis/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/version-advisory/index.ts`
- `src/shared/hash.ts`
- `src/shared/types.ts`

## Done when

- Workflow Health Diagnosis owns `handleDoctorProject`, `DoctorProjectCommand`, diagnosis helpers, and doctor handler tests.
- Moved doctor tests retain equivalent assertions.
- Doctor remains read-only: tests and implementation do not write workflow files during diagnosis.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/workflow-health-diagnosis/handler.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:51:42-06:00
