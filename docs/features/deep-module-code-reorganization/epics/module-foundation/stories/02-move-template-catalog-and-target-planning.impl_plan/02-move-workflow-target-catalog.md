# Step: Move Workflow Target Catalog

## Goal

Move supported agent definitions, mandatory/selectable skill catalogs, and selectable skill resolution into Workflow Target Planning, leaving non-target catalog concerns for their later owning stories.

## Scope

- Create `src/modules/workflow-target-planning/catalog.ts` for `SUPPORTED_AGENTS`, mandatory/selectable skill definitions, and `resolveSelectableSkillById`.
- Update `src/modules/workflow-target-planning/index.ts` to export the workflow target catalog API.
- Remove target-planning catalog exports from `src/shared/catalog.ts` while leaving non-target constants that later stories still own, such as Sibu package/version and state path constants.
- Move target catalog tests from `src/shared/catalog.test.ts` to `src/modules/workflow-target-planning/catalog.test.ts`, preserving assertions for agents, skill resolution, and skill target paths.
- Leave the `SIBU_VERSION` package version assertion in `src/shared/catalog.test.ts` for the later Version Advisory story unless it has already moved.
- Do not add, remove, rename, or reorder supported agents or skills.

## Files

- `src/shared/catalog.ts`
- `src/shared/catalog.test.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/shared/workflow-targets.ts`
- `src/shared/prompts.tsx`
- `src/features/doctor-project/handler.ts`
- `src/features/list-skills/handler.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/features/use-skill/handler.ts`

## Done when

- Workflow Target Planning owns supported agent and skill catalog behavior.
- Existing agent and skill catalog assertions pass from the moved test location.
- `src/shared/catalog.ts` no longer exports workflow target catalog data or selectable skill resolution.
- `pnpm build` passes.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T16:54:58-06:00
