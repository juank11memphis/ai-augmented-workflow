# Step: Update template manifest metadata

## Goal

Update Sibu template metadata so the contract-based pipeline template changes are versioned and visible to users through sync notes.

## Scope

- Update `templates/manifest.json` only.
- Increment the global `templateVersion` by one.
- Increment each changed pipeline template's `version` by one:
  - `skills/product-vision-writer/SKILL.md`
  - `skills/product-context-map-writer/SKILL.md`
  - `skills/feature-brief-writer/SKILL.md`
  - `skills/technical-design-writer/SKILL.md`
  - `skills/ux-expert/SKILL.md`
  - `skills/scrum-master-planner/SKILL.md`
  - `skills/ai-implementation-planner/SKILL.md`
  - `skills/ai-implementation-plan-executor/SKILL.md`
- Replace each changed template's `changes` array with concise current-version user-facing notes describing the new pipeline contract behavior.
- Keep template paths and descriptions stable unless a description is clearly wrong.
- Do not edit `SKILL.md` template wording in this step unless required to fix a manifest-related inconsistency.

## Files

- `templates/manifest.json`

## Done when

- `templateVersion` is incremented from the previous value.
- Every changed pipeline template listed in scope has an incremented per-template version.
- Every changed pipeline template listed in scope has sync-facing change notes about required inputs, owned outputs, stop conditions, or stage boundaries.
- No unaffected template versions or paths are changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:52:59-06:00
