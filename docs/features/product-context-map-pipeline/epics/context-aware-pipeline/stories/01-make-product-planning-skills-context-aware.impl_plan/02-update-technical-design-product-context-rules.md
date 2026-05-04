# Step: Update technical design Product Context rules

## Goal

Make the technical design writer preserve Product Contexts selected by the feature brief and explain their interaction with architecture guidance only when it changes implementation direction.

## Scope

- Update `templates/skills/technical-design-writer/SKILL.md` grounding to read `docs/product-context-map.md` and the feature brief’s `## Product Context` section.
- Add a missing-map stop rule that routes the user to `product-context-map-writer` instead of allowing inferred contexts.
- Add concise guidance that Product Contexts answer “where does this work belong?” and architecture skills answer “how is that context structured internally?”
- Add output guidance to preserve selected Product Contexts and avoid inventing new ones.
- Explain Product Context and architecture interaction only when it materially affects implementation direction.
- Do not update architecture skill internals in this step.

## Files

- `templates/skills/technical-design-writer/SKILL.md`

## Done when

- Technical design creation reads the Product Context Map and the feature brief’s Product Context section.
- Technical designs preserve selected Product Contexts and do not introduce new ones.
- Product Context/architecture interaction guidance is conditional and concise, not a generic repeated section.
- The story acceptance criterion “Technical designs preserve the selected Product Contexts and avoid inventing new ones” is covered.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:00:59Z
