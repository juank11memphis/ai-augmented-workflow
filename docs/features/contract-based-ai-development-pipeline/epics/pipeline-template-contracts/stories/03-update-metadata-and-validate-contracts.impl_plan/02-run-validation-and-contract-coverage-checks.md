# Step: Run validation and contract coverage checks

## Goal

Validate that the contract-based pipeline template set and manifest metadata are healthy after the template and manifest changes.

## Scope

- Run focused manual checks for contract coverage across all affected pipeline templates.
- Confirm each affected template has exactly one `## Pipeline Contract` section and the four required subsection headings.
- Confirm local `.agents/skills/` copies match corresponding changed templates where local copies exist.
- Confirm later-stage templates trust `technical_design.md` and do not require `docs/product-context-map.md` by default.
- Confirm `technical-design-writer` owns Product Context to implementation-boundary translation.
- Confirm `ux-expert` stops when there is no UI impact.
- Run `pnpm verify`.
- Run `sibu doctor`.
- Do not make additional template wording changes unless validation exposes a concrete defect; if that happens, keep the fix minimal and document it.

## Files

- `templates/manifest.json`
- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/product-vision-writer/SKILL.md`
- `.agents/skills/product-context-map-writer/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/ai-implementation-planner/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`

## Done when

- Contract coverage checks pass for all affected pipeline templates.
- Local `.agents/skills/` copies match corresponding changed templates where local copies exist.
- Manifest notes and version bumps pass manual inspection.
- `pnpm verify` passes, or the failure is documented with cause and next action.
- `sibu doctor` passes, or any drift is documented with the expected next action.

## Validation notes

- Manual contract coverage checks passed.
- Local `.agents/skills/` copies match corresponding changed templates where local copies exist.
- `pnpm verify` initially failed because `src/shared/workflow-targets.test.ts` expected the previous Product Context Map template version. The expectation was updated to match the manifest bump, then `pnpm verify` passed.
- `sibu doctor` completed with review-needed status because the repository now intentionally has template version 63 while local Sibu state records version 62 and changed managed skill files. Expected next action: run `sibu sync` to review or dismiss those local workflow changes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:54:53-06:00
