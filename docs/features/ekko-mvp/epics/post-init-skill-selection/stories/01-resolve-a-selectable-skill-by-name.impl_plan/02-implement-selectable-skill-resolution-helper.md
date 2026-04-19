# Step: Implement exact selectable skill lookup helper

## Goal
Add the shared catalog helper that resolves a user-provided skill id by exact match across selectable language, framework, and architecture catalog entries.

## Scope

- Add a helper such as `resolveSelectableSkillById(skillId: string)` in the shared catalog module.
- Search `SELECTABLE_LANGUAGE_SKILLS`, `SELECTABLE_FRAMEWORK_SKILLS`, and `SELECTABLE_ARCHITECTURE_SKILLS` only.
- Return the explicit result type from step 1, including the matching category and catalog entry when found.
- Return an unknown-skill failure for non-matches with a short message that suggests `ekko skills list`.
- Do not add fuzzy matching, aliases, search, or normalization beyond exact id matching.
- Do not traverse `MANDATORY_SKILLS` or allow required-only skills as selectable additions.

## Files

- src/shared/catalog.ts
- src/shared/types.ts

## Done when

- Known selectable ids such as `typescript`, `react`, `nextjs`, `ddd-hexagonal`, and `command-pattern` can resolve to their catalog entry and category.
- Unknown ids such as `nope` produce a failure result whose message suggests `ekko skills list`.
- Required-only catalog templates such as `clean-code` do not resolve as selectable additions.
- The helper contains the catalog traversal logic in one reusable place instead of requiring command handlers to duplicate it.
- `pnpm build` and `pnpm check` pass.
