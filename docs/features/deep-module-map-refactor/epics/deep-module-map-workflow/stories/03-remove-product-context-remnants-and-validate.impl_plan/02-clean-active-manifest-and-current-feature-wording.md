# Step: Clean active manifest and current feature wording

## Goal

Remove old Product Context wording from active manifest sync notes and current Deep Module Map refactor planning artifacts, while preserving the intended meaning of the refactor.

## Scope

- Update `templates/manifest.json` change notes that still mention Product Context Map as old/renamed wording, using clean Deep Module Map wording instead.
- Update current Deep Module Map refactor docs and implementation plans where Product Context references are no longer needed for active guidance.
- Keep references only when they are explicitly explaining the removed concept inside the current refactor feature and cannot be made clearer without losing meaning.
- Do not rewrite unrelated historical docs outside the obsolete Product Context feature folder unless they actively break current validation expectations.

## Files

- `templates/manifest.json`
- `docs/features/deep-module-map-refactor/feature_brief.md`
- `docs/features/deep-module-map-refactor/technical_design.md`
- `docs/features/deep-module-map-refactor/epics/deep-module-map-workflow/epic_brief.md`
- `docs/features/deep-module-map-refactor/epics/deep-module-map-workflow/stories/**/*.md`

## Done when

- Active manifest sync notes no longer present Product Context Map as supported or migration-related wording.
- Current Deep Module Map refactor docs use Deep Module terminology wherever practical.
- Any remaining old-term references are intentional explanation of removed scope, not active workflow guidance.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T15:01:56-06:00
