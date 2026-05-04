# Step: Update DDD Hexagonal Product Context rule

## Goal

Make the DDD + Hexagonal architecture skill respect approved Product Context boundaries while keeping Product Contexts architecture-agnostic.

## Scope

- Update `templates/skills/architecture/ddd-hexagonal/SKILL.md` with a compact Product Context compatibility rule.
- State that Product Contexts answer “where does this work belong?” and DDD + Hexagonal answers how that context is structured internally.
- Clarify that, when Product Contexts are present in `docs/product-context-map.md`, feature briefs, or technical designs, DDD + Hexagonal guidance should organize work inside or around those contexts.
- Clarify that a Product Context may contain `domain`, `application`, and `infra`/adapter concerns, but the map itself is not a DDD artifact or folder structure requirement.
- Route new-context decisions back to `product-context-map-writer` instead of inventing Product Contexts.
- Do not update any architecture skill other than DDD + Hexagonal in this step.

## Files

- `templates/skills/architecture/ddd-hexagonal/SKILL.md`

## Done when

- DDD + Hexagonal guidance respects Product Context boundaries when Product Contexts are present.
- The skill does not imply Product Contexts are mandatory DDD Bounded Contexts, folders, services, or layers.
- The skill routes new Product Context decisions back to the Product Context Map workflow.
- Added guidance is concise and avoids duplicating downstream planning instructions.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:10:37Z
