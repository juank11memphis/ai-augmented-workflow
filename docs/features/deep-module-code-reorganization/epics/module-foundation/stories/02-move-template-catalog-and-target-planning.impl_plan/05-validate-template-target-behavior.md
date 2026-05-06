# Step: Validate Template and Target Planning Behavior

## Goal

Run focused validation proving the move preserved template rendering, target planning, skill catalog behavior, and build health.

## Scope

- Run the moved workflow target planning tests.
- Run the moved workflow target catalog tests.
- Run any remaining shared catalog test for non-target constants if it still exists.
- Run the project build.
- Inspect the diff to confirm this story only moved template catalog and workflow target planning behavior plus related tests/imports.
- Do not broaden into full package/runtime validation; later stories own package output changes.

## Files

- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/shared/catalog.test.ts`
- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`

## Done when

- `pnpm build` passes.
- Focused moved tests pass, such as `node --test bin/modules/workflow-target-planning/*.test.js` after build.
- Any remaining `src/shared/catalog.test.ts` passes if it still exists.
- Generated workflow targets and rendered skill routing remain behaviorally unchanged by test coverage.
- No unexpected behavior, template, manifest, state schema, or package configuration changes are present.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T20:56:36-06:00
