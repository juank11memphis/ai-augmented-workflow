# Step: Update template manifest notes

## Goal

Record the changed planning skill templates in the Sibu manifest so `sibu sync` can explain the Product Context-aware updates to users.

## Scope

- Update `templates/manifest.json` after the feature brief and technical design template edits.
- Bump the global `templateVersion` because managed templates changed.
- Bump only the versions for changed templates, expected at minimum `skills/feature-brief-writer/SKILL.md` and `skills/technical-design-writer/SKILL.md`.
- Replace each bumped template’s `changes` entries with concise user-facing notes for this version.
- Do not edit generated `bin/**` by hand.

## Files

- `templates/manifest.json`

## Done when

- The manifest remains valid JSON.
- Global and per-template versions reflect the changed templates.
- Change notes explain the Product Context-aware behavior in user-facing language.
- Manifest updates follow `sibu-template-change` rules.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:01:45Z
