# Technical Design: Deep Module Code Reorganization

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/deep-module-code-reorganization/feature_brief.md`
- Delegated skills: `clean-code`, `typescript`, `command-pattern`

## Summary

Reorganize Sibu's TypeScript source around `src/modules/<deep-module-slug>/` while preserving current CLI, workflow, template, state, npm advisory, and admin/release behavior. This is a behavior-preserving move/split/refactor: commands and tests should continue to assert the same outcomes, and any behavior change is a defect unless explicitly approved later.

Create stable module entrypoints and preserve current contracts during the reorganization. Limited extractions are appropriate only where they reduce cross-module leakage without changing behavior.

## Existing Context

Current source organization is mostly technical-layer based:

- `src/entrypoints/cli/*` owns Commander setup and command dispatch.
- `src/features/*` owns user-facing command handlers for init, doctor, sync, and skills.
- `src/shared/*` mixes several Deep Module concerns: state, templates, target planning, prompts, npm advisory, paths, hashing, sync previews, and mutation readiness.
- `src/admin/*` owns changelog and release workflow behavior.
- `src/sibu.tsx` is the CLI binary entrypoint compiled to `bin/sibu.js`.
- `package.json` currently packages `bin/entrypoints/`, `bin/features/`, and `bin/shared/`; this must change if runtime code moves under `bin/modules/`.

Existing validation:

- `pnpm verify`
- command/handler tests under `src/features/**` and `src/admin/**`
- shared module tests under `src/shared/**`
- package/runtime validation scripts in `scripts/`

## Proposed Design

### Target source shape

Use Deep Modules as the primary source boundary:

```txt
src/
  entrypoints/
    cli/
      command.ts
      create-program.ts
      execute-command.ts
      main.ts
  modules/
    cli-command-surface/
    project-adoption/
    workflow-state-registry/
    template-catalog-rendering/
    workflow-target-planning/
    workflow-health-diagnosis/
    sync-review/
    skill-selection-management/
    workflow-mutation-readiness/
    version-advisory/
    interactive-guidance/
    maintainer-release-support/
  shared/
    hash.ts
    object.ts
    paths.ts
    types.ts
  sibu.tsx
```

Keep `src/entrypoints/cli` as the driving adapter. It should import handlers from `src/modules/*`, not from `src/features/*`.

Keep `src/shared` only for genuinely universal primitives that do not own a Sibu product capability. Initial allowed shared files:

- `hash.ts`
- `object.ts`
- `paths.ts`
- `types.ts`

If a “shared” file has product behavior from the Deep Module Map, move it into the owning module.

### Module mapping

| Deep Module | Current source | Target source |
| --- | --- | --- |
| CLI Command Surface | `src/entrypoints/cli/*` | keep in `src/entrypoints/cli/*`; update imports to module handlers |
| Project Adoption | `src/features/init-project/*` | `src/modules/project-adoption/*` |
| Workflow State Registry | `src/shared/state.ts` | `src/modules/workflow-state-registry/*` |
| Template Catalog and Rendering | `src/shared/templates.ts`, template-related catalog pieces | `src/modules/template-catalog-rendering/*` |
| Workflow Target Planning | `src/shared/catalog.ts` agent/skill catalogs, `src/shared/workflow-targets.ts` | `src/modules/workflow-target-planning/*` |
| Workflow Health Diagnosis | `src/features/doctor-project/*` | `src/modules/workflow-health-diagnosis/*` |
| Sync Review | `src/features/sync-project/*`, sync preview behavior | `src/modules/sync-review/*` |
| Skill Selection Management | `src/features/list-skills/*`, `src/features/use-skill/*`, `src/features/stop-managing-file/*` | `src/modules/skill-selection-management/*` |
| Workflow Mutation Readiness | `src/shared/workflow-mutation-readiness.ts` | `src/modules/workflow-mutation-readiness/*` |
| Version Advisory | `src/shared/npm-version.ts` plus package/version constants | `src/modules/version-advisory/*` |
| Interactive Guidance | `src/shared/prompts.tsx` and prompt-specific helpers | `src/modules/interactive-guidance/*` |
| Maintainer Release Support | `src/admin/*` | `src/modules/maintainer-release-support/*` with thin admin entry scripts if needed |

### Public contracts to preserve

Do not change:

- command names or arguments
- `SibuCliCommand` discriminants unless all call sites and tests preserve equivalent behavior
- `.sibu/state.json` schema or semantics
- template manifest semantics
- managed/customized/unmanaged behavior
- file hash behavior
- sync preview statuses and available user actions
- npm version advisory behavior, cache behavior, and override environment variables
- admin script behavior for changelog and release workflows

### Module entrypoints

Each moved module should expose one or more explicit entrypoint files, usually preserving current function names during the move:

- `project-adoption/handler.ts` exports `handleInitProject`
- `workflow-health-diagnosis/handler.ts` exports `handleDoctorProject`
- `sync-review/handler.ts` exports `handleSyncProject`
- `skill-selection-management/list-skills/handler.ts` exports `handleListSkills`
- `skill-selection-management/use-skill/handler.ts` exports `handleUseSkill`
- `skill-selection-management/stop-managing-file/handler.ts` exports `handleStopManagingFile`
- `maintainer-release-support/...` preserves current admin command entry behavior

Prefer keeping names stable in the first pass so diffs are reviewable. Rename functions only when a name is actively misleading after the move.

### Catalog split

`src/shared/catalog.ts` currently mixes unrelated ownership. Split it by capability:

- Workflow Target Planning owns supported agents and selectable skill catalogs.
- Version Advisory owns package name, current version, npm lookup environment constants, and supported lookup modes.
- Workflow State Registry or shared types owns `STATE_RELATIVE_PATH` only if multiple modules need the constant. If it stays shared, keep it as a path constant with no behavior.

Avoid creating a new generic `catalog` module.

### Sync preview placement

Move sync preview classification into Sync Review unless another module needs it as a guardrail. Workflow Mutation Readiness may import Sync Review's preview generator and actionable-status predicate, but it should not duplicate preview logic.

### Interactive prompts placement

Move prompt rendering and question functions into Interactive Guidance. Domain modules may call prompt functions, but product decisions based on answers stay in the owning domain module.

If this creates circular imports, split prompt files by context, for example:

- `interactive-guidance/intro.tsx`
- `interactive-guidance/adoption-prompts.ts`
- `interactive-guidance/sync-prompts.ts`
- `interactive-guidance/skill-prompts.ts`

### Tests

Move tests with the behavior they protect:

- `src/features/doctor-project/handler.test.ts` → `src/modules/workflow-health-diagnosis/handler.test.ts`
- `src/features/use-skill/handler.test.ts` → `src/modules/skill-selection-management/use-skill/handler.test.ts`
- `src/shared/workflow-targets.test.ts` → `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/shared/npm-version.test.ts` → `src/modules/version-advisory/npm-version.test.ts`
- admin tests → `src/modules/maintainer-release-support/**`

Do not weaken assertions. Update imports and fixture paths only.

### Package and runtime outputs

Because `tsc` mirrors `src` into `bin`, update `package.json` `files` if runtime code moves under `src/modules`:

```json
"files": [
  "bin/sibu.js",
  "bin/entrypoints/",
  "bin/modules/",
  "templates/",
  "README.md"
]
```

Remove old package entries for `bin/features/` and `bin/shared/` only after no runtime imports depend on them. If `src/shared` remains with runtime primitives, keep `bin/shared/` packaged.

Admin scripts in `package.json` must continue to point to compiled runnable files. If `src/admin/changelog.ts` and `src/admin/release.ts` are removed, either:

- update scripts to the new `bin/modules/maintainer-release-support/...` paths, or
- keep tiny compatibility entry files under `src/admin/` that delegate to the module.

Prefer tiny compatibility entry files for the first refactor to reduce script churn.

## Validation

Required after each meaningful slice:

- `pnpm build`
- focused moved tests, for example `node --test bin/modules/<module>/**/*.test.js` when practical

Required before completion:

- `pnpm verify`
- `sibu doctor` in this repo
- `pnpm run validate:packed-runtime`
- `pnpm run validate:doctor-version-advisory`
- `pnpm run validate:post-update-doctor-drift`

Recommended smoke checks in a temporary project:

- `sibu init`
- `sibu doctor`
- `sibu sync`
- `sibu skills list`
- `sibu skills use <available-skill>` on a clean initialized fixture
- `sibu skills stop <selected-skill>` on a fixture where deletion can be safely declined

## Risks / Open Questions

- Prompt UI code may create dependency cycles if it imports business rules from the modules that call it. Keep prompts mostly dumb: modules should pass prompt options/data in, and prompt files should return user choices.
- `package.json` package contents can regress installed CLI behavior if `bin/modules/` or remaining `bin/shared/` runtime files are omitted.
- Admin entrypoint paths need a deliberate compatibility decision during implementation.
- The refactor should not introduce path aliases unless separately approved; relative imports are sufficient for the current TypeScript setup.
