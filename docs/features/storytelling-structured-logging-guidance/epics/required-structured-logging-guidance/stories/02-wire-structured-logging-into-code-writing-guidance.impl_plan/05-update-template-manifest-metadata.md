# Step: Update template manifest metadata for routing changes

## Goal

Keep Sibu template metadata coherent by versioning every changed template and providing sync-facing change notes for the structured logging routing updates.

## Scope

- Bump the global `templateVersion` in `templates/manifest.json`.
- Bump only the per-template versions for templates changed by this story.
- Replace each changed template's `changes` entries with current-version, user-facing notes that explain structured logging routing or delegation outcomes.
- Do not bump unrelated template entries or modify `.sibu/state.json`.

## Files

- `templates/manifest.json`

## Done when

- Every template changed in this story has a corresponding manifest version bump and current change note.
- No unrelated template versions are bumped.
- Change notes are user-facing and avoid implementation-detail wording such as line numbers.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
