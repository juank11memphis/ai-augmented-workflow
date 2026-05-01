# Validate Managed Skill Lifecycle

## Epic

[Required Product Context Map Skill](../epic_brief.md)

## User Story

As a Sibu maintainer, I want the new required skill covered by the existing managed-template lifecycle, so that users can rely on `init`, `doctor`, and `sync` to keep the skill available and current.

## Context

The technical design relies on existing Sibu workflow target mechanics rather than custom doctor/sync logic. The new skill must behave like other mandatory managed skills.

## Scope

- Update `templates/manifest.json` for the new skill and changed templates.
- Bump template versions according to Sibu template-change rules.
- Add or update tests proving the new mandatory skill appears in workflow targets.
- Confirm existing doctor/sync behavior covers missing or modified skill files.
- Confirm `docs/product-context-map.md` is not created by `sibu init` as a managed file.

## Out of Scope

- Implementing custom doctor/sync logic for `docs/product-context-map.md`.
- Creating the generated Product Context Map content.

## Acceptance Criteria

- Manifest metadata includes the new skill template with user-facing change notes.
- Tests show the installed skill target is included for supported agents.
- Sibu state records the installed skill as a managed file when present.
- Removing or modifying the installed skill is handled through existing doctor/sync drift behavior.
- Lifecycle validation confirms `docs/product-context-map.md` remains user-owned and unmanaged by Sibu templates.

## Validation

- `pnpm build`
- `pnpm check`
- `pnpm test` or `pnpm verify`
- Manual temp-project lifecycle check when practical.
