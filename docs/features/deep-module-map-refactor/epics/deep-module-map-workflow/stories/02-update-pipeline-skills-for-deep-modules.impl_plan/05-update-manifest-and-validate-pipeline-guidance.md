# Step: Update manifest and validate pipeline guidance

## Goal

Record the downstream pipeline skill changes in the template manifest and validate that active pipeline guidance uses Deep Module terminology consistently.

## Scope

- Update `templates/manifest.json` by bumping the global template version.
- Bump every changed pipeline skill template version.
- Replace changed template `changes` entries with current-version user-facing notes about Deep Module guidance.
- Search changed pipeline templates and local copies for old Product Context Map terminology.
- Run `pnpm verify` and `sibu doctor` where practical.
- Do not fix architecture skills in this step; that story is already complete.
- Do not delete historical feature docs; cleanup belongs to the final cleanup story.

## Files

- `templates/manifest.json`
- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/product-vision-writer/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/ai-implementation-planner/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/ux-expert/SKILL.md`

## Done when

- Manifest versions and change notes are updated for all changed pipeline templates.
- A search confirms changed pipeline templates and local copies no longer use active Product Context Map terminology.
- `pnpm verify` is run, or any failure is documented with a clear follow-up reason.
- `sibu doctor` is run, or known workflow drift is documented for follow-up.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:57:45-06:00
