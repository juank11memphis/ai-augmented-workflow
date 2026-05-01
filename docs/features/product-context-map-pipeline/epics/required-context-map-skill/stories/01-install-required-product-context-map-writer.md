# Install Required Product Context Map Writer Skill

## Epic

[Required Product Context Map Skill](../epic_brief.md)

## User Story

As a Sibu user, I want `product-context-map-writer` installed as a required skill, so that I can create and maintain a Product Context Map before writing feature briefs.

## Context

The feature introduces Product Context Maps as a first-class pipeline step, but the generated `docs/product-context-map.md` should be user-owned content created by the skill, not a managed Sibu template.

## Scope

- Add `templates/skills/product-context-map-writer/SKILL.md`.
- Register the skill in Sibu’s mandatory skill catalog for all supported agents.
- Ensure the skill writes or updates `docs/product-context-map.md`.
- Ensure the skill requires `docs/product-vision.md` before creating or updating the map.
- Include one-question-at-a-time interviewing until practical understanding and explicit user alignment are reached.
- Include concise guidance for architecture-agnostic Product Contexts, deep modules, boundaries, responsibilities, scenarios, and relationships.

## Out of Scope

- Creating the actual Product Context Map for Sibu.
- Adding `docs/product-context-map.md` as a managed template.
- Updating downstream skills to consume the map.

## Acceptance Criteria

- The mandatory skill catalog includes `product-context-map-writer` for Codex, Gemini, Claude, and Windsurf targets.
- New Sibu workflow targets include `.agents/skills/product-context-map-writer/SKILL.md`.
- The skill instructions tell the agent to stop if `docs/product-vision.md` is missing.
- The skill asks one focused question at a time and waits for user alignment before writing or revising the map.
- The skill final response reports only `docs/product-context-map.md` after saving, unless inline review is explicitly requested.
- No managed template is added for `docs/product-context-map.md`.

## Validation

- `pnpm build`
- `pnpm check`
- Workflow target tests covering mandatory skill inclusion.

## Notes

- Use `clean-code`, `typescript`, `sibu-template-change`, and `ai-prompt-engineer-master` during implementation.
