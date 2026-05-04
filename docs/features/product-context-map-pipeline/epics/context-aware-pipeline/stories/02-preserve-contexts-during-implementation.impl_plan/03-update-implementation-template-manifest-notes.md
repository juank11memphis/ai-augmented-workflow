# Step: Update implementation template manifest notes

## Goal

Record the changed implementation planning and execution skill templates in the Sibu manifest so `sibu sync` can explain the Product Context preservation updates to users.

## Scope

- Update `templates/manifest.json` after the implementation planner and executor template edits.
- Bump the global `templateVersion` because managed templates changed.
- Bump only the versions for changed templates: `skills/ai-implementation-planner/SKILL.md` and `skills/ai-implementation-plan-executor/SKILL.md`.
- Replace each bumped template’s `changes` entries with concise user-facing notes for this version.
- Do not edit generated `bin/**` by hand.

## Files

- `templates/manifest.json`

## Done when

- The manifest remains valid JSON.
- Global and per-template versions reflect the changed implementation templates.
- Change notes explain Product Context boundary preservation in user-facing language.
- Manifest updates follow `sibu-template-change` rules.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:32:43Z
