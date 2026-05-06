# Step: Move workflow mutation readiness and tests

## Goal

Move clean-state mutation guardrails into Workflow Mutation Readiness while reusing Sync Review preview classification instead of duplicating it.

## Scope

- Move `src/shared/workflow-mutation-readiness.ts` and `src/shared/workflow-mutation-readiness.test.ts` into `src/modules/workflow-mutation-readiness/` with stable exported names.
- Update `src/modules/workflow-mutation-readiness/index.ts` to export `getWorkflowMutationReadiness` and its result type from the moved implementation, not from a shared compatibility wrapper.
- Update moved implementation imports so Workflow Mutation Readiness imports `getSyncPreviews`, `isActionableSyncPreview`, and `SyncPreview` from `src/modules/sync-review/`.
- Update moved tests to use Workflow Target Planning and shared primitives from approved locations.
- Update Skill Selection Management imports to continue using `src/modules/workflow-mutation-readiness/index.ts`.
- Preserve blocked/ready result semantics and keep broader workflow drift blocking skill-use mutations.

## Files

- `src/shared/workflow-mutation-readiness.ts`
- `src/shared/workflow-mutation-readiness.test.ts`
- `src/modules/workflow-mutation-readiness/workflow-mutation-readiness.ts`
- `src/modules/workflow-mutation-readiness/workflow-mutation-readiness.test.ts`
- `src/modules/workflow-mutation-readiness/index.ts`
- `src/modules/sync-review/index.ts`
- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/shared/types.ts`

## Done when

- Workflow Mutation Readiness owns `getWorkflowMutationReadiness` and its tests.
- Workflow Mutation Readiness imports guardrail information from Sync Review preview helpers without duplicating preview logic.
- Skill use remains blocked when broader workflow drift exists.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/workflow-mutation-readiness/workflow-mutation-readiness.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:05:53-06:00
