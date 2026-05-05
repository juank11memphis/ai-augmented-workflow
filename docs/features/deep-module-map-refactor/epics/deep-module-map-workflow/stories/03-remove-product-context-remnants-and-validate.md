# Remove Product Context Remnants and Validate Templates

## Epic
[Deep Module Map Workflow](../epic_brief.md)

## User Story
As a Sibu maintainer, I want obsolete Product Context Map artifacts removed and the template set validated, so that the workflow presents Deep Module Map as the only active concept.

## Context
The feature intentionally removes the old Product Context Map concept from the universe instead of preserving compatibility. Cleanup should happen after the new skill and downstream guidance are in place.

## Scope
- Delete `docs/features/product-context-map-pipeline/`.
- Delete repository-local `.agents/skills/product-context-map-writer/SKILL.md` and add `.agents/skills/deep-module-map-writer/SKILL.md` where local workflow files are maintained.
- Update `AGENTS.md` to match Deep Module Map routing and pipeline language.
- Confirm `templates/manifest.json` has correct version bumps and current-version sync notes.
- Run searches, `pnpm verify`, and `sibu doctor` as validation.
- Run temporary Sibu lifecycle checks when practical.

## Out of Scope
- Automated backwards compatibility for old Product Context Map users.
- Manual `.sibu/state.json` migration unless implementation discovers it is required and the user explicitly approves.
- Rewriting unrelated historical docs outside the obsolete feature folder.

## Acceptance Criteria
- The obsolete `docs/features/product-context-map-pipeline/` folder is removed.
- Active templates, local workflow files, and manifest entries no longer present Product Context Map as a supported concept.
- Template version and changed-template notes are updated according to Sibu template-change rules.
- Validation commands complete or any failures are captured with clear follow-up notes.

## Validation
- Run a repository search for old Product Context Map terms and classify any remaining hits as intentional historical references or issues to fix.
- Run `pnpm verify`.
- Run `sibu doctor`.
- Run temporary `sibu init`, `sibu doctor`, and `sibu sync` lifecycle checks when practical.
