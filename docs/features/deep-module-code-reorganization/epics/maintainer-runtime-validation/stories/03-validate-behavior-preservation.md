# Validate Behavior Preservation End to End

## Epic
[Maintainer Runtime Validation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want full validation after the reorganization, so that we can trust the refactor did not change user-facing or maintainer-facing behavior.

## Context
The feature brief defines this as a no-functionality-change refactor. The technical design requires verification, Sibu health checks, package runtime validation, and version/drift validation flows.

## Scope
- Run full project verification.
- Run Sibu workflow health checks in this repo.
- Run package/runtime validation flows from the technical design.
- Perform recommended smoke checks in a temporary project when practical.
- Fix behavior-preservation regressions found by validation without weakening tests.

## Out of Scope
- Adding new functionality to satisfy validation.
- Removing tests to make validation pass.
- Publishing a release.

## Acceptance Criteria
- `pnpm verify` passes.
- `sibu doctor` passes in this repo.
- Packed runtime validation passes.
- Doctor version advisory validation passes.
- Post-update drift validation passes.
- Any smoke-test deviations are resolved or documented as explicit follow-up risks.

## Validation
- `pnpm verify`
- `sibu doctor`
- `pnpm run validate:packed-runtime`
- `pnpm run validate:doctor-version-advisory`
- `pnpm run validate:post-update-doctor-drift`
