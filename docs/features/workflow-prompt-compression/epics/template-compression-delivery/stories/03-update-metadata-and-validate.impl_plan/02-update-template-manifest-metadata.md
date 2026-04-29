# Step: Update template manifest metadata

## Goal

Update `templates/manifest.json` so template versions and user-facing change notes accurately describe the audit-backed prompt compression changes.

## Scope

- Bump `templates/manifest.json.templateVersion` once for this batch of template changes.
- For each changed managed template identified in step 01:
  - bump that template's `version` by one numeric version
  - replace its `changes` list with user-facing notes for the new version
- Keep change notes clear that the update tightens wording while preserving safeguards, routing, required inputs, stop conditions, output locations, approval gates, and binding UX rules as applicable.
- Do not add manifest entries for `src/shared/catalog.ts`; it is not a template manifest entry.
- Do not edit generated managed workspace files.

## Files

- `templates/manifest.json`

## Done when

- `templateVersion` is incremented.
- Every changed managed template from step 01 has an incremented version and fresh user-facing change notes.
- Unchanged managed templates keep their existing version and change notes.
- Manifest JSON remains valid and readable.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:05:48-06:00
