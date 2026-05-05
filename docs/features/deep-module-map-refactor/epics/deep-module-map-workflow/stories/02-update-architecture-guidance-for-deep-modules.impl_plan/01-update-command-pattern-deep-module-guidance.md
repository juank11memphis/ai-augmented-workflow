# Step: Update command-pattern Deep Module guidance

## Goal

Revise the command-pattern architecture template so command-oriented vertical slices are organized inside selected Deep Modules using the approved module-first path shape.

## Scope

- Update `templates/skills/architecture/command-pattern/SKILL.md` to replace Product Context compatibility with Deep Module compatibility.
- State that Deep Modules answer where implementation work belongs, while Command Pattern guidance answers how a use case is structured inside the selected module.
- Change the default vertical-slice structure from `/src/features/<feature-name>/...` to `/src/modules/<module-slug>/<feature-slice>/...`.
- Include `command`, `handler`, `ports`, and `result` under the feature slice.
- Warn against inventing Deep Modules during design or implementation; route unclear module boundaries back to `deep-module-map-writer`.
- Warn against shallow technical buckets as Deep Modules.
- Do not update DDD + Hexagonal guidance in this step.

## Files

- `templates/skills/architecture/command-pattern/SKILL.md`

## Done when

- The command-pattern template says vertical slices live inside the selected Deep Module.
- The recommended paths use `/src/modules/<module-slug>/<feature-slice>/command`, `/handler`, `/ports`, and `/result`.
- The template no longer uses active Product Context Map terminology.
- The template preserves the existing Command, Handler, Port, Adapter, and Result responsibilities.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:36:22-06:00
