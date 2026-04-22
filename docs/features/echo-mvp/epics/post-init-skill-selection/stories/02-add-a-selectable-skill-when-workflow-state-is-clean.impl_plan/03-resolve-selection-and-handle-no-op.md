# Step: Resolve the requested skill selection

## Goal
Teach the `skills use` handler to resolve one selectable skill, detect already-selected skills as a no-op success, and prepare the next in-memory skill selection without mutating files yet.

## Scope

- Use `resolveSelectableSkillById(skillName)` from the shared catalog helper for exact selectable-skill lookup.
- For unknown skills, exit without changes and show the helper message suggesting `echo skills list`.
- For an already selected language, framework, or architecture skill, exit successfully and clearly report that no files changed.
- For a new language or framework skill, append the skill id in memory while preserving existing selected skills.
- For a new architecture skill, set it only when no architecture skill is already selected; if a different architecture skill is already selected, stop safely without changes.
- Keep architecture replacement out of scope for this story.
- Do not create skill files, refresh `AGENTS.md`, or update `.echo/state.json` in this step.

## Files

- src/features/use-skill/handler.ts
- src/shared/catalog.ts
- src/shared/types.ts
- src/shared/workflow-targets.ts

## Done when

- `echo skills use typescript` can distinguish unavailable, already-selected, and newly selectable cases after a clean-state check.
- Running the command for an already selected skill exits successfully without changing files.
- Unknown skill handling remains exact-match only and suggests `echo skills list`.
- Conflicting architecture selection refuses to proceed without replacing the existing architecture skill.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T03:44:01Z
