# Update Package Runtime Contents

## Epic
[Maintainer Runtime Validation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want package runtime contents to include the reorganized compiled modules, so that the installed CLI works after source files move.

## Context
The technical design notes that `tsc` mirrors `src` into `bin`. If runtime code moves under `src/modules`, `package.json` package `files` must include the matching compiled output.

## Scope
- Update `package.json` `files` entries to include `bin/modules/`.
- Keep `bin/shared/` packaged if any remaining runtime primitives are still imported.
- Remove obsolete `bin/features/` packaging only after no runtime imports depend on it.
- Preserve `bin/sibu.js`, `bin/entrypoints/`, templates, and README package contents.

## Out of Scope
- Changing package name, version, or publish policy.
- Publishing to npm.
- Changing CLI command behavior.

## Acceptance Criteria
- Packaged runtime includes all compiled files needed by the CLI and admin scripts.
- Obsolete package paths are removed only when safe.
- Package validation does not fail due to missing moved runtime code.

## Validation
- `pnpm build`
- `pnpm run validate:packed-runtime`
