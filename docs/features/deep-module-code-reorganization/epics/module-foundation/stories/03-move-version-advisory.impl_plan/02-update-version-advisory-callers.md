# Step: Update version advisory callers

## Goal

Make Doctor, CLI version reporting, and workflow state writing consume package/version and advisory behavior through the Version Advisory module boundary.

## Scope

- Update Doctor to import `checkForLatestSibuVersion` from `src/modules/version-advisory/index.ts`.
- Update CLI program setup and workflow target planning to import `SIBU_VERSION` from the Version Advisory module.
- Update any cache-path or package-version imports affected by moving advisory constants out of `src/shared/catalog.ts`.
- Remove `src/shared/npm-version.ts` once no caller imports it, or stop and ask before keeping any compatibility re-export.
- Do not move command handlers, target planning behavior, or release publishing behavior in this story.

## Files

- `src/features/doctor-project/handler.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/shared/catalog.ts`
- `src/shared/npm-version.ts`
- `src/shared/paths.ts`
- `src/modules/version-advisory/index.ts`

## Done when

- Doctor can ask Version Advisory for update information through the module boundary.
- CLI version reporting and generated state still use the current package version value.
- No production or test file imports npm advisory behavior from `src/shared/npm-version.ts` or package/version constants from generic shared catalog.
- `src/shared` no longer owns npm lookup, cache, override, package-name, or package-version behavior.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:56:54.478Z
