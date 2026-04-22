# Version Advisory in Doctor Epic Brief

## Summary
Teach `sibu doctor` to advisory-check for newer npm-published versions and guide users through the standard npm update flow without mutating project files.

## Source Context
- Feature brief: `docs/features/npm-install/npm-install/feature_brief.md`
- Technical design: `docs/features/npm-install/npm-install/technical_design.md`

## Scope
- npm version lookup from `sibu doctor`.
- Non-blocking advisory messaging and caching.
- Post-update expectation that users rerun `sibu doctor` and then choose `sibu sync` if drift exists.

## Out of Scope
- Publishing the package itself.
- End-user README and maintainer release document content, except where wording must align with doctor output.
- Any self-updating behavior.

## User Stories
- [Add a non-blocking npm version advisory to sibu doctor](./stories/01-add-non-blocking-npm-version-advisory.md)
- [Report template drift after a user updates Sibu](./stories/02-report-drift-after-updating-sibu.md)

## Acceptance Criteria
- `sibu doctor` can tell users when a newer npm version exists.
- The advisory points to `npm install -g sibu` and does not mark the workflow unhealthy on its own.
- After an update, rerunning `sibu doctor` surfaces any resulting template drift through the existing doctor/sync model.

## Dependencies / Risks
- Depends on a chosen npm package name and a standard registry lookup path.
