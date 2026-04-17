# Resolve a Selectable Skill by Name

## Epic
[Post-Init Skill Selection](./epic_brief.md)

## User Story
As a developer adding workflow guidance after adoption, I want Ekko to resolve a selectable skill by its exact id, so that I can intentionally add the skill I asked for.

## Context
The technical design calls for a shared helper that resolves user-provided skill ids across selectable language, framework, and architecture skills. Exact id match is the MVP behavior.

## Scope
- Resolve selectable language, framework, and architecture skills from the shared catalog.
- Support exact id matching only.
- Return an explicit result that preserves the skill category.
- Tell the user to run `ekko skills list` when the skill is unknown.

## Out of Scope
- Fuzzy matching, aliases, or search.
- Resolving required skills as selectable post-init additions.
- Reading missing-skill documentation as a command source.

## Acceptance Criteria
- A known selectable skill id resolves to its catalog entry and category.
- An unknown skill id fails with a short message that suggests `ekko skills list`.
- Required-only skills are not treated as selectable additions through this command.
- The helper can be reused by the command handler without duplicating catalog traversal logic.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test `ekko skills use nope` and confirm it suggests `ekko skills list`.
