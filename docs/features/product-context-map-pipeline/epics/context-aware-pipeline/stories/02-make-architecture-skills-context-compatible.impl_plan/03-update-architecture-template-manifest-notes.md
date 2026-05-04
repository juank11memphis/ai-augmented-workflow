# Step: Update architecture template manifest notes

## Goal

Record the changed architecture skill templates in the Sibu manifest so `sibu sync` can explain the Product Context-compatible updates to users.

## Scope

- Update `templates/manifest.json` after the DDD + Hexagonal and Command Pattern template edits.
- Bump the global `templateVersion` because managed templates changed.
- Bump only the versions for changed architecture skill templates: `skills/architecture/ddd-hexagonal/SKILL.md` and `skills/architecture/command-pattern/SKILL.md`.
- Replace each bumped template’s `changes` entries with concise user-facing notes for this version.
- Do not edit generated `bin/**` by hand.

## Files

- `templates/manifest.json`

## Done when

- The manifest remains valid JSON.
- Global and per-template versions reflect the changed architecture templates.
- Change notes explain Product Context-compatible architecture guidance in user-facing language.
- Manifest updates follow `sibu-template-change` rules.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:14:25Z
