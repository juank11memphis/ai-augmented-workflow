# Step: Validate prompt consumers

## Goal

Prove prompt consumers use Interactive Guidance without dependency cycles or behavior regressions.

## Scope

- Run targeted source checks for `shared/prompts` imports and obvious Interactive Guidance back-imports from consumer modules.
- Run `pnpm build` and `pnpm verify` as required by the story.
- Run `sibu doctor` in this repository to confirm command intro rendering still works in a real command.
- Run packed-runtime validation if removing the shared wrapper changes package runtime reachability.
- Do not mark the story complete if validation is skipped or only manually inspected without a clear reason.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/prompts.test.ts`
- `src/modules/project-adoption/handler.ts`
- `src/modules/sync-review/handler.ts`
- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`
- `package.json`

## Done when

- No source imports reference `src/shared/prompts.tsx` or `shared/prompts`.
- Interactive Guidance prompt files do not import Project Adoption, Sync Review, Skill Selection Management, or Workflow Health Diagnosis.
- `pnpm build` passes.
- `pnpm verify` passes.
- `sibu doctor` passes.
- Any packed-runtime validation needed for this move passes or has an exact documented reason for deferral.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:28:10-06:00
