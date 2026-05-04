# Update Template Metadata and Validate Contract Coverage

## Epic
[Pipeline Template Contracts](../epic_brief.md)

## User Story
As a Sibu maintainer, I want template metadata and validation updated after the contract template changes, so that users can safely review the new workflow guidance through Sibu sync.

## Context

Sibu-managed templates require manifest version updates and user-facing change notes whenever template content changes. This story completes the template change by making the update visible to `sibu sync` and checking that the edited templates are healthy.

## Scope

- Update `templates/manifest.json` after the affected templates are changed.
- Bump the global `templateVersion`.
- Bump each changed pipeline template's own `version`.
- Replace each changed template's `changes` entries with current-version user-facing notes.
- Run validation from the technical design.
- Perform manual contract coverage checks across all affected pipeline templates.

## Out of Scope

- Additional template wording changes beyond metadata fixes found during validation.
- New automated evals or contract behavior tests.
- CLI behavior changes.

## Acceptance Criteria

- `templates/manifest.json` has an incremented global template version.
- Every changed pipeline template has an incremented per-template version.
- Every changed pipeline template has concise user-facing change notes describing the contract addition.
- `pnpm verify` passes, or any failure is documented with the cause.
- `sibu doctor` passes after the changes, or any drift is documented with the expected next action.
- Manual review confirms all affected templates include the shared contract heading structure.

## Validation

- `pnpm verify`
- `sibu doctor`
- Manual inspection of contract sections and manifest notes.

## Notes

- This story should run after the product/design and planning/execution template stories are complete.
