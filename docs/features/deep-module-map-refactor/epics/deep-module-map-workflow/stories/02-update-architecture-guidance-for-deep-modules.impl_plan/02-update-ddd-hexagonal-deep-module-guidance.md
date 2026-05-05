# Step: Update DDD + Hexagonal Deep Module guidance

## Goal

Revise the DDD + Hexagonal architecture template so Deep Modules are the default top-level module boundary before internal domain/application/infra organization.

## Scope

- Update `templates/skills/architecture/ddd-hexagonal/SKILL.md` to replace Product Context compatibility with Deep Module compatibility.
- State that Deep Modules are product-aligned implementation modules and default top-level module boundaries.
- Show the default shape `/src/modules/<module-slug>/domain`, `/application`, and `/infra`.
- Clarify that Deep Modules are not automatically DDD Bounded Contexts, services, packages, or database boundaries.
- Clarify that projects already using DDD Bounded Contexts may align a Bounded Context one-to-one with a Deep Module when appropriate.
- Warn against shallow technical buckets as Deep Modules.
- Do not update command-pattern guidance in this step.

## Files

- `templates/skills/architecture/ddd-hexagonal/SKILL.md`

## Done when

- The DDD + Hexagonal template says each Deep Module is the default top-level module boundary.
- The practical mapping uses `/src/modules/<module-slug>/domain`, `/application`, and `/infra` examples.
- The template explains that Deep Modules are not automatically DDD Bounded Contexts.
- The template no longer uses active Product Context Map terminology.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:40:07-06:00
