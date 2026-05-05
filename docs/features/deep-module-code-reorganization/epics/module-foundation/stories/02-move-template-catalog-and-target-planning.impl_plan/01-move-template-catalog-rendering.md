# Step: Move Template Catalog Rendering

## Goal

Move template reading, manifest validation, template version lookup, project overview extraction, and skill-routing rendering into the Template Catalog and Rendering module without changing behavior.

## Scope

- Move `src/shared/templates.ts` behavior into `src/modules/template-catalog-rendering/templates.ts`.
- Update `src/modules/template-catalog-rendering/index.ts` to export the moved template API.
- Update imports that read or render templates to use the module path.
- Preserve template manifest validation, `{{PROJECT_OVERVIEW}}` replacement, optional skill routing rendering, and thrown error messages.
- Do not change template file contents, `templates/manifest.json`, target planning behavior, or state semantics.

## Files

- `src/shared/templates.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/template-catalog-rendering/templates.ts`
- `src/features/sync-project/apply-action.ts`
- `src/features/doctor-project/handler.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/features/use-skill/handler.ts`
- `src/shared/sync-preview.ts`
- `src/shared/workflow-mutation-readiness.ts`
- `src/shared/workflow-targets.ts`
- `src/shared/workflow-targets.test.ts`

## Done when

- Template Catalog and Rendering owns the template read/render/manifest functions.
- No production code imports template behavior from `src/shared/templates.ts`.
- Template rendering behavior remains unchanged.
- `pnpm build` passes.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T16:47:48-06:00
