# Step: Model selectable skill resolution results

## Goal
Add explicit shared TypeScript types for resolving one selectable skill id while preserving whether the resolved catalog entry is a language, framework, or architecture skill.

## Scope

- Define a `ResolvedSelectableSkill` discriminated union for language, framework, and architecture selectable skills.
- Define a resolution result type that can represent either a resolved selectable skill or an unknown skill failure with a short user-facing message.
- Keep the result shape simple and reusable by the future `ekko skills use` command handler.
- Do not model selected/already-selected/conflicting architecture behavior in this step.
- Do not include mandatory skills in the resolved-selectable type.

## Files

- src/shared/types.ts

## Done when

- The shared type preserves the category for known language, framework, and architecture skills.
- Unknown skill resolution can carry a concise message that suggests `ekko skills list`.
- Required-only skills are not represented as selectable resolution successes.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: user
- Approved at: 2026-04-19T01:41:13Z
