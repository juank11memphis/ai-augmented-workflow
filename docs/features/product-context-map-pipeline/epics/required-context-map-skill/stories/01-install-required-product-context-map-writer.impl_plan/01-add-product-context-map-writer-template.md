# Step: Add product context map writer skill template

## Goal

Create the new mandatory skill template that teaches agents how to create and update the user-owned Product Context Map artifact.

## Scope

- Add `templates/skills/product-context-map-writer/SKILL.md`.
- Keep the skill prompt concise while preserving the required quality rules.
- Require `docs/product-vision.md` before map creation or revision.
- Instruct the skill to create or update `docs/product-context-map.md` as user-owned product content.
- Include one-question-at-a-time interviewing until practical understanding and explicit user alignment are reached.
- Include concise guidance for architecture-agnostic Product Contexts, deep-module boundaries, responsibilities, scenarios, and relationships.
- Do not create Sibu’s actual Product Context Map content.
- Do not add a managed template for `docs/product-context-map.md`.

## Files

- `templates/skills/product-context-map-writer/SKILL.md`

## Done when

- The skill template exists at `templates/skills/product-context-map-writer/SKILL.md`.
- The skill stops if `docs/product-vision.md` is missing.
- The skill asks one focused question at a time and waits for user alignment before writing or revising the map.
- The skill final response reports only `docs/product-context-map.md` after saving, unless inline review is explicitly requested.
- The skill clearly says `docs/product-context-map.md` is created/updated by the skill and is not a Sibu-managed template.
