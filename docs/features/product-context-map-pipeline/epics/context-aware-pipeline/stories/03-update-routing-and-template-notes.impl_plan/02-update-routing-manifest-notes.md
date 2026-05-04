# Step: Update routing manifest notes

## Goal

Record the AGENTS routing template update and Product Context Map pipeline notes in the Sibu manifest for clear `sibu sync` messaging.

## Scope

- Update `templates/manifest.json` after the `templates/AGENTS.md` routing edit.
- Bump the global `templateVersion` because managed templates changed.
- Bump `AGENTS.md` template version and replace its `changes` entry with a concise user-facing note for this version.
- Review the existing `skills/product-context-map-writer/SKILL.md` manifest note and update only if needed to make the new required managed skill clear to existing projects.
- Do not bump unchanged skill templates.

## Files

- `templates/manifest.json`

## Done when

- Manifest versions and change notes follow `sibu-template-change` rules.
- Existing projects receive clear sync notes about Product Context Map routing and the required managed skill.
- The manifest remains valid JSON.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:53:52Z
