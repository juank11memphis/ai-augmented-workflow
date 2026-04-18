# Implementation Plan: Resolve a Selectable Skill by Name

## Source Story
[Resolve a Selectable Skill by Name](./01-resolve-a-selectable-skill-by-name.md)

## Goal
Add one reusable exact-match resolver for post-init selectable skills so `ekko skills use <skill_name>` can identify language, framework, and architecture skills without duplicating catalog traversal logic or accidentally treating required skills as selectable additions.

## Context
- Epic: [Post-Init Skill Selection](../epic_brief.md)
- Feature brief: [feature_brief.md](../../../feature_brief.md)
- Technical design: [technical_design.md](../../../technical_design.md)
- Relevant skills: clean-code, typescript, command-pattern

## Implementation Checklist

- [ ] Add a selectable-skill resolver contract in `src/shared/catalog.ts`.
  - Implement a discriminated union type such as `ResolvedSelectableSkill` with `kind: 'language' | 'framework' | 'architecture'` and the matching selectable skill type.
  - Keep the type colocated with the selectable catalog arrays so future command handlers can import one shared contract.
  - Done when TypeScript callers can distinguish the selected skill category without casts or stringly typed catalog traversal.

- [ ] Add an exact-id resolver function in `src/shared/catalog.ts`.
  - Implement `resolveSelectableSkillById(skillId: string): ResolvedSelectableSkill | undefined` by checking `SELECTABLE_LANGUAGE_SKILLS`, `SELECTABLE_FRAMEWORK_SKILLS`, and `SELECTABLE_ARCHITECTURE_SKILLS` in a simple, explicit order.
  - Match only against each skill's exact `id`; do not add fuzzy matching, aliases, normalization, or required-skill lookup.
  - Done when known selectable ids such as `typescript`, `react`, and `command-pattern` return their catalog entry with the correct `kind`, while required-only ids such as `clean-code` return `undefined`.

- [ ] Add a focused command slice placeholder for `ekko skills use <skill_name>` under `src/features/use-skill/`.
  - Create `command.ts` with `UseSkillCommand` shaped as `{ type: 'skills:use'; skillName: string }` so the CLI can model the new command without embedding behavior in the entrypoint.
  - Create `handler.ts` that calls `resolveSelectableSkillById`, logs a concise unknown-skill message suggesting `ekko skills list`, and returns without mutations for this story's MVP slice.
  - Keep the handler intentionally narrow; clean-state checks, file creation, already-selected behavior, and architecture conflicts belong to later stories in this Epic.
  - Done when the resolver is reused by the handler and no catalog traversal is duplicated in the feature slice.

- [ ] Wire `skills use <skill_name>` through the CLI entrypoint files.
  - Update `src/entrypoints/cli/command.ts` to include `UseSkillCommand` in `EkkoCliCommand`.
  - Update `src/entrypoints/cli/create-program.ts` to register `skills.command('use <skillName>')` and dispatch `{ type: 'skills:use', skillName }`.
  - Update `src/entrypoints/cli/execute-command.ts` to route `skills:use` to `handleUseSkill`.
  - Done when `ekko skills use <skill_name>` reaches the new handler through the same command-pattern flow as existing CLI commands.

- [ ] Add unknown-skill output that points users to the available skill list.
  - In `src/features/use-skill/handler.ts`, use existing CLI output conventions from nearby handlers, including `renderIntro`, `intro`, `log`, `outro`, and `chalk`.
  - For an unknown id, emit a short actionable message that includes `ekko skills list`; avoid verbose suggestions or fuzzy alternatives.
  - Done when `ekko skills use nope` tells the user the skill is unknown and suggests `ekko skills list`.

- [ ] Add a temporary known-skill success path that proves category-preserving resolution.
  - In `handleUseSkill`, when resolution succeeds, log a concise message containing the resolved skill name/id and category, then exit without changing files or state.
  - Make the message clearly temporary/non-mutating only if needed to avoid implying the full skill-selection flow is complete.
  - Done when running `ekko skills use typescript` demonstrates that a known selectable skill resolves to the expected category without mutating workflow files.

- [ ] Validate TypeScript and command behavior.
  - Run `pnpm build` and `pnpm check`.
  - Smoke test `node ./bin/ekko.js skills use nope` and confirm it suggests `ekko skills list`.
  - Smoke test `node ./bin/ekko.js skills use clean-code` and confirm required-only skills are not treated as selectable.
  - Smoke test `node ./bin/ekko.js skills use typescript` and confirm it resolves as a language skill without writing files or state.
  - Done when all validation commands pass and the smoke tests match the story acceptance criteria.

## Acceptance Criteria Mapping
- `A known selectable skill id resolves to its catalog entry and category.` → resolver contract/function, known-skill handler path, `typescript` smoke test.
- `An unknown skill id fails with a short message that suggests ekko skills list.` → unknown-skill handler path, `nope` smoke test.
- `Required-only skills are not treated as selectable additions through this command.` → resolver excludes `MANDATORY_SKILLS`, `clean-code` smoke test.
- `The helper can be reused by the command handler without duplicating catalog traversal logic.` → shared `resolveSelectableSkillById` function imported by `use-skill` handler.

## Risks / Stop Conditions
- Stop and revise the technical design if this story is expected to mutate selected skills, workflow files, or `.ekko/state.json`; those behaviors belong to later stories in this Epic.
- Stop if adding the resolver requires changing catalog shape beyond a small helper and type export.
- Do not add fuzzy matching, aliases, required-skill resolution, clean-state checks, or architecture replacement behavior in this story.
