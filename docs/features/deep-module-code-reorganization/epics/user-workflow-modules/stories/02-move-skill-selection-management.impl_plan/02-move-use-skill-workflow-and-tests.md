# Step: Move use skill workflow and tests

## Goal

Move `sibu skills use` command behavior and tests into the Skill Selection Management module while preserving selected-skill lifecycle behavior.

## Scope

- Move `src/features/use-skill/command.ts`, `src/features/use-skill/handler.ts`, and `src/features/use-skill/handler.test.ts` into `src/modules/skill-selection-management/use-skill/` with stable exported names.
- Update `src/modules/skill-selection-management/index.ts` to export `handleUseSkill`, `UseSkillCommand`, and tested helpers that need to remain reachable from moved tests.
- Update relative imports inside moved implementation and test files to use Workflow Target Planning, Template Catalog and Rendering, Workflow State Registry, Workflow Mutation Readiness, and shared primitives from their approved locations.
- Preserve selected-skill resolution, duplicate-selection no-ops, architecture-skill exclusivity, clean-workflow preflight, `AGENTS.md` routing refresh, generated file rendering, state writing, output meaning, and exit-code behavior.
- Do not weaken moved test assertions or add new selectable skills.

## Files

- `src/features/use-skill/command.ts`
- `src/features/use-skill/handler.ts`
- `src/features/use-skill/handler.test.ts`
- `src/modules/skill-selection-management/use-skill/command.ts`
- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.test.ts`
- `src/modules/skill-selection-management/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/workflow-mutation-readiness/index.ts`
- `src/shared/catalog.ts`
- `src/shared/hash.ts`
- `src/shared/paths.ts`
- `src/shared/types.ts`

## Done when

- Skill Selection Management owns `handleUseSkill`, `UseSkillCommand`, `getNextSkillSelection`, and use-skill handler tests.
- Moved use-skill tests retain equivalent assertions for duplicate selection, architecture exclusivity, clean-workflow preflight, file rendering, and state updates.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/skill-selection-management/use-skill/handler.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:56:55-06:00
