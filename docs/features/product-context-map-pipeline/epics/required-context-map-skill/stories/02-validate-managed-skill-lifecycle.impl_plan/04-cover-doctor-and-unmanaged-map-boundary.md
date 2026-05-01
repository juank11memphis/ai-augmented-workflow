# Step: Cover doctor and unmanaged map boundary

## Goal

Validate that doctor-style health checks report Product Context Map writer skill drift through existing managed-file behavior while leaving the generated map user-owned.

## Scope

- Add focused doctor coverage only if existing exported helpers or low-risk test seams can validate the behavior without redesigning the doctor command.
- Prefer asserting the underlying shared lifecycle behavior through `getWorkflowTargets`, `writeSibuState`, and `getSyncPreviews` if doctor internals are not already testable.
- Confirm no test setup writes, records, or expects `docs/product-context-map.md` as a managed file.
- Add explicit assertions that `docs/product-context-map.md` is absent from state `managedFiles` after rendering workflow targets and writing state.
- Do not implement custom doctor or sync branches for `docs/product-context-map.md`.

## Files

- `src/features/doctor-project/handler.test.ts`
- `src/features/doctor-project/handler.ts`
- `src/shared/workflow-targets.test.ts`
- `src/shared/sync-preview.test.ts`
- `bin/features/doctor-project/handler.test.js`
- `bin/features/doctor-project/handler.js`
- `bin/shared/workflow-targets.test.js`
- `bin/shared/sync-preview.test.js`

## Done when

- Lifecycle validation demonstrates missing or modified `.agents/skills/product-context-map-writer/SKILL.md` is surfaced through existing drift behavior.
- Lifecycle validation demonstrates `docs/product-context-map.md` is not created, targeted, or recorded as a managed Sibu file.
- No production doctor/sync custom logic is added for the generated Product Context Map artifact.
- `pnpm check` and `pnpm test` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T13:41:14-06:00
