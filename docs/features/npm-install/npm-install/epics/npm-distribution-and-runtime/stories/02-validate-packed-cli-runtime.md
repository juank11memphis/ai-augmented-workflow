# Validate the installed CLI runtime from a packed artifact

## Epic
[npm Distribution and Runtime](../epic_brief.md)

## User Story
As a user installing Sibu from npm, I want the globally installed CLI to run correctly from the packaged artifact, so that installation does not depend on a linked checkout.

## Context
The technical design requires tarball-based validation instead of `pnpm link` so the release path matches how end users will actually install Sibu from the published package artifact.

## Scope
- Define or implement the tarball-based runtime validation path using the `.tgz` package produced by `npm pack`.
- Confirm the installed CLI binary runs and can read bundled templates.
- Cover the smoke-test commands needed for release readiness.

## Out of Scope
- npm registry version advisories.
- Release notes/changelog and maintainer release documentation.

## Acceptance Criteria
- A global install from the packed `.tgz` artifact exposes `sibu` on PATH.
- `sibu --help` succeeds after installation from the tarball.
- At least one read-only CLI smoke test proves the installed command can access bundled runtime files.
- The validation path does not rely on `pnpm link` or execution from the source checkout.

## Validation
- `npm pack`
- Global install from the produced `.tgz` tarball
- `sibu --help`
- One additional non-destructive CLI smoke test from the technical design
