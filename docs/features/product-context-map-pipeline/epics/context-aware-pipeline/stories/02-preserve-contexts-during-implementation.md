# Preserve Contexts During Implementation Planning and Execution

## Epic

[Context-Aware Pipeline](../epic_brief.md)

## User Story

As a Sibu user, I want implementation plans and executors to preserve Product Context boundaries, so that code work follows the approved product structure instead of scattering across unrelated areas.

## Context

The feature brief and technical design establish Product Context ownership before implementation. Planning and execution must treat that guidance as part of the contract.

## Scope

- Update `ai-implementation-planner` to treat Product Context guidance from feature brief and technical design as required source context.
- Make implementation step files preserve context boundaries and call out cross-context work explicitly.
- Update `ai-implementation-plan-executor` to treat Product Context guidance as part of execution.
- Make the executor avoid moving work into unrelated contexts unless justified by the approved step or technical design.

## Out of Scope

- Creating implementation step files for this feature.
- Enforcing folder structures automatically.
- Updating feature brief or technical design skills.

## Acceptance Criteria

- Implementation planner instructions require reading and applying Product Context guidance when present.
- Generated step guidance should keep work inside the approved Product Context unless cross-context work is explicit.
- Executor instructions prevent silent movement of work into unrelated contexts.
- Context guidance remains concise and does not duplicate the full Product Context Map concept.

## Validation

- Review updated skill templates for context-boundary preservation.
- `pnpm build`
- `pnpm check`
