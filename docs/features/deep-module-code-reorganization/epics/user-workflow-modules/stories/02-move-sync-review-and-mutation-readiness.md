# Move Sync Review and Mutation Readiness Workflows

## Epic
[User Workflow Modules](../epic_brief.md)

## User Story
As a Sibu maintainer, I want sync review and mutation readiness behavior to live in their owning Deep Modules, so that drift review and clean-state guardrails remain explicit and reusable.

## Context
The technical design places sync preview classification and sync actions in Sync Review. Workflow Mutation Readiness may depend on Sync Review's preview generator but should not duplicate preview logic.

## Scope
- Move sync handler, preview classification, action prompts, action application, and preview logging into Sync Review.
- Move mutation readiness checks into Workflow Mutation Readiness.
- Preserve sync preview statuses, actionable-status behavior, side-template behavior, mark-reviewed semantics, and stop-managing semantics.
- Update related tests with equivalent assertions.

## Out of Scope
- Changing available sync actions.
- Changing local edit protection rules.
- Adding new drift statuses.

## Acceptance Criteria
- Sync Review owns `sibu sync` behavior and preview classification.
- Workflow Mutation Readiness imports guardrail information without duplicating sync preview logic.
- Existing sync and readiness tests pass.
- Local edits are still protected from automatic overwrite.

## Validation
- `pnpm build`
- Moved sync preview tests.
- Moved workflow mutation readiness tests.
