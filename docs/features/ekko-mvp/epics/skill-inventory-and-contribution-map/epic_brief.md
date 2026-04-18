# Skill Inventory and Contribution Map Epic Brief

## Summary
Make required skills, selectable skills, and human-identified missing skill opportunities visible enough for the team to use Ekko while assigning concrete follow-up work.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Maintain an engineer-defined baseline set of required skills.
- Maintain an engineer-defined set of selectable skills.
- Document human-identified missing required and selectable skills in `docs/features/ekko-mvp/missing_skills.md`.
- Present missing skills clearly enough for contributors to claim and implement later.

## Out of Scope
- Guaranteeing that every selectable skill is implemented by the MVP.
- Turning missing skills into a remote registry, marketplace, or project-management system.
- Making the missing-skill artifact drive CLI behavior in the MVP.

## User Stories
- [Present required and selectable skill sets](./stories/01-present-required-and-selectable-skill-sets.md)
- [Document missing skill opportunities](./stories/02-document-missing-skill-opportunities.md)

## Acceptance Criteria
- The team can name the required skills for the MVP baseline.
- The team can distinguish selectable skills from required skills.
- Human-identified missing required and selectable skills are documented in a contributor-oriented format.
- At least one missing skill task or workflow gap is clear enough for a teammate to take ownership.

## Dependencies / Risks
- Missing skills must be described concretely; vague entries will not become useful contribution opportunities.
- The MVP should avoid turning the inventory into a heavier task-management system.
