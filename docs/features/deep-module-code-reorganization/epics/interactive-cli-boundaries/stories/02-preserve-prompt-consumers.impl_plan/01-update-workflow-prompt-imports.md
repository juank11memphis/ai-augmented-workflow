# Step: Update workflow prompt imports

## Goal

Update workflow modules to call prompt helpers through the Interactive Guidance module entrypoint instead of the temporary shared compatibility wrapper.

## Scope

- Update Project Adoption prompt imports to use `src/modules/interactive-guidance/index.ts`.
- Update Sync Review prompt imports to use `src/modules/interactive-guidance/index.ts`.
- Update Skill Selection Management prompt imports to use `src/modules/interactive-guidance/index.ts`.
- Update Workflow Health Diagnosis prompt imports to use `src/modules/interactive-guidance/index.ts`.
- Preserve prompt helper names, call sites, prompt order, prompt text, cancel handling, output semantics, and business decisions made from prompt answers.
- Do not move business rules into Interactive Guidance.

## Files

- `src/modules/project-adoption/handler.ts`
- `src/modules/sync-review/handler.ts`
- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/interactive-guidance/index.ts`

## Done when

- No workflow module imports prompt helpers from `src/shared/prompts.tsx`.
- Workflow modules import prompt helpers from Interactive Guidance without changing behavior.
- `pnpm build` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:28:10-06:00
