# Report template drift after updating Sibu

## Epic
[Version Advisory in Doctor](../epic_brief.md)

## User Story
As a user who has updated Sibu through npm, I want rerunning `sibu doctor` to show any resulting template drift, so that I can explicitly choose whether to run `sibu sync`.

## Context
The product philosophy requires explicit reviewable steps. Updating the CLI should not change project files automatically; it should only change what `sibu doctor` can detect against the newer installed template set.

## Scope
- Preserve the explicit post-update flow: update, rerun doctor, then optionally sync.
- Ensure doctor output makes the next step understandable when newer templates cause drift.
- Confirm the advisory/update path and the existing sync path work together cleanly.

## Out of Scope
- Automatic sync after updating.
- New template-application behaviors beyond the current doctor/sync model.

## Acceptance Criteria
- After updating Sibu, rerunning `sibu doctor` reports any resulting template drift.
- Doctor output does not mutate project files as part of update detection.
- Users are clearly directed to `sibu sync` when review/apply work is needed.

## Validation
- Simulate or smoke test the flow from packaged installs: old version tarball install → doctor advisory → npm update to a newer package/tarball → rerun doctor → see drift.
- Confirm no files change until `sibu sync` is explicitly run.
