# Make Sibu publishable to npm

## Epic
[npm Distribution and Runtime](../epic_brief.md)

## User Story
As a maintainer, I want the Sibu package metadata to be publishable to npm, so that the CLI can be distributed through the standard npm install path.

## Context
The feature brief requires npm to become the only official install and update mechanism. The technical design identifies `package.json` and the existing build/prepack flow as the smallest implementation path.

## Scope
- Remove package metadata that blocks publishing.
- Add required npm publishing metadata and runtime packaging constraints, including `engines.node: >=20`.
- Keep the existing CLI binary shape unless the package-name decision forces a command change.

## Out of Scope
- Advisory version checks in `sibu doctor`.
- User-facing README and maintainer release-process documentation.

## Acceptance Criteria
- `package.json` is publishable to npm.
- The package declares the intended CLI binary and includes the runtime-required files.
- The package metadata is sufficient for standard npm publication hygiene, including the Node 20+ support declaration.

## Validation
- `pnpm verify`
- `npm pack`
- Inspect the packed artifact contents only enough to confirm required runtime files are included.
- Prefer tarball-based validation over repo-link validation for release readiness.

## Notes
- Follow the technical design for npm metadata and file-inclusion boundaries.
