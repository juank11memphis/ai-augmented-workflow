# Make Selected Architecture Skills Context-Compatible

## Epic

[Context-Aware Pipeline](../epic_brief.md)

## User Story

As a Sibu user, I want DDD + Hexagonal and Command Pattern guidance to respect Product Contexts, so that architecture choices organize work inside approved product responsibility boundaries.

## Context

Product Contexts decide where work belongs. Architecture skills decide how that context is structured internally. The first implementation updates only DDD + Hexagonal and Command Pattern.

## Scope

- Update `templates/skills/architecture/ddd-hexagonal/SKILL.md` with a compact Product Context compatibility rule.
- Update `templates/skills/architecture/command-pattern/SKILL.md` with a compact Product Context compatibility rule.
- Clarify that Product Contexts are architecture-agnostic and must not be invented during implementation.
- Clarify that DDD + Hexagonal may organize a Product Context internally around domain/application/infrastructure concerns.
- Clarify that Command Pattern vertical slices should live within or clearly belong to the relevant Product Context when contexts are present.

## Out of Scope

- Updating any architecture skills beyond DDD + Hexagonal and Command Pattern.
- Introducing a new architecture selection model.
- Generating folders or code from Product Contexts.

## Acceptance Criteria

- DDD + Hexagonal guidance respects Product Context boundaries when they are present.
- Command Pattern guidance places command-oriented slices within or clearly under Product Context ownership when present.
- Both skills route new-context decisions back to the Product Context Map workflow.
- The added guidance is concise and avoids duplicating downstream planning instructions.

## Validation

- Review updated architecture skill templates.
- `pnpm build`
- `pnpm check`
