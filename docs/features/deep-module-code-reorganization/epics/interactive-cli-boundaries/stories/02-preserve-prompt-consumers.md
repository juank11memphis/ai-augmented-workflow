# Preserve Prompt Consumers Without Dependency Cycles

## Epic
[Interactive CLI Boundaries](../epic_brief.md)

## User Story
As a Sibu maintainer, I want workflow modules to call prompt helpers without creating dependency cycles, so that interactive behavior remains stable after the move.

## Context
The technical design warns that prompt UI code can create dependency cycles if it imports business rules from modules that call it. Prompt files should receive options/data and return user choices.

## Scope
- Update adoption, sync, skills, and health workflows to import prompt helpers from Interactive Guidance.
- Split prompt files by context if needed to avoid cycles.
- Keep business decisions inside Project Adoption, Sync Review, Skill Selection Management, and Workflow Health Diagnosis.

## Out of Scope
- Adding new prompt flows.
- Moving business rules into Interactive Guidance.
- Changing output semantics.

## Acceptance Criteria
- Workflow modules can call prompt helpers without circular ownership.
- Prompt files do not import business rules from the modules that call them.
- Existing user workflow tests and prompt tests pass.

## Validation
- `pnpm build`
- `pnpm verify`
