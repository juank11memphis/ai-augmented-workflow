# Version and Validate Notion Export Templates

## Epic
[Notion Feature Doc Export Guidance](../epic_brief.md)

## User Story
As a Sibu maintainer, I want changed templates and workflow files versioned and validated, so that Notion export guidance reaches users through normal Sibu sync flows.

## Context

Template changes require manifest metadata updates and validation. This feature changes skill templates, may change MCP config rendering behavior, and may update local workflow copies for this repository.

## Scope

- Bump `templates/manifest.json` global template version.
- Bump each changed template's version and replace its change notes with current user-facing notes.
- Include changed pipeline skill templates and any changed MCP config templates if applicable.
- Ensure local `.agents/skills` copies are aligned for changed skills installed in this repo.
- Run validation after template changes.
- Run `sibu doctor` after validation to confirm workflow health.

## Out of Scope

- Publishing a release.
- Creating implementation plans.
- Changing feature brief or technical design content after planning is approved.

## Acceptance Criteria

- Every changed template has a manifest version bump and current change note.
- The global manifest template version is bumped once for the full template set change.
- Local installed skill copies that should mirror changed templates are updated.
- `pnpm verify` passes.
- `sibu doctor` reports a healthy workflow or any remaining drift is intentionally explained.

## Validation

- `pnpm verify`
- `sibu doctor`
- Manual manifest review for changed templates and clear sync-facing notes.
