# npm Distribution and Runtime Epic Brief

## Summary
Make Sibu publishable to npm and ensure the installed package works as a normal global CLI on supported platforms.

## Source Context
- Feature brief: `docs/features/npm-install/npm-install/feature_brief.md`
- Technical design: `docs/features/npm-install/npm-install/technical_design.md`

## Scope
- Publishable package metadata in `package.json`.
- Tarball contents and runtime file availability.
- tarball-based validation via `npm pack` and install testing for the CLI binary and bundled templates.

## Out of Scope
- Version advisories in `sibu doctor`.
- Maintainer release notes/changelog policy beyond what is needed to prove the packaged CLI works.
- Alternate distribution channels.

## User Stories
- [Make Sibu publishable to npm](./stories/01-make-sibu-publishable-to-npm.md)
- [Validate the installed CLI runtime from a packed artifact](./stories/02-validate-packed-cli-runtime.md)

## Acceptance Criteria
- Sibu can be packed and published as an npm package.
- A global install from the packed artifact exposes the CLI binary on PATH.
- The installed CLI can access its required runtime assets, including templates.

## Dependencies / Risks
- The final npm package name must be chosen during implementation; the minimum supported Node version is 20+.
