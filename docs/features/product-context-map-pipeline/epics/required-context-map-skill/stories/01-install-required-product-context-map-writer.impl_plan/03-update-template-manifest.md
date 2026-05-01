# Step: Update template manifest metadata

## Goal

Make the new skill template valid in Sibu’s template manifest so rendering, state writing, doctor, and sync can use the normal managed-template lifecycle.

## Scope

- Add `skills/product-context-map-writer/SKILL.md` to `templates/manifest.json`.
- Bump the global `templateVersion`.
- Add a user-facing change note explaining that Sibu now installs the required Product Context Map writer skill.
- Follow `sibu-template-change` rules for version and change-note wording.
- Do not add a manifest entry for `docs/product-context-map.md`.

## Files

- `templates/manifest.json`

## Done when

- `templates/manifest.json` contains an entry for `skills/product-context-map-writer/SKILL.md`.
- The new manifest entry describes the required skill and uses a current-version change note.
- The global template version is bumped.
- No `docs/product-context-map.md` template entry exists.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T12:57:14-06:00
