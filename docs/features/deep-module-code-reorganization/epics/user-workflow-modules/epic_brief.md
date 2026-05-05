# User Workflow Modules Epic Brief

## Summary

Move Sibu's user-facing workflow handlers into the Deep Modules that own their behavior. This Epic preserves the existing CLI experience for init, doctor, sync, and skills while replacing technical-layer `src/features/*` ownership with module-centered ownership.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Move Project Adoption behavior.
- Move Workflow Health Diagnosis behavior.
- Move Sync Review behavior.
- Move Skill Selection Management behavior.
- Move Workflow Mutation Readiness behavior where needed by skill flows.
- Update tests and CLI imports without changing command behavior.

## Out of Scope
- Changing command names, arguments, or user-facing semantics.
- Redesigning prompts or terminal styling.
- Moving maintainer/admin release tooling.

## User Stories
- [Move project adoption and health diagnosis workflows](./stories/01-move-adoption-and-health-diagnosis.md)
- [Move sync review and mutation readiness workflows](./stories/02-move-sync-review-and-mutation-readiness.md)
- [Move skill selection management workflows](./stories/02-move-skill-selection-management.md)
- [Wire CLI command dispatch to module handlers](./stories/03-wire-cli-dispatch-to-module-handlers.md)

## Acceptance Criteria
- `sibu init`, `sibu doctor`, `sibu sync`, `sibu skills list`, `sibu skills use`, and `sibu skills stop` preserve current behavior.
- User workflow handlers live under the owning Deep Module folders.
- `src/features` is no longer the primary owner of user workflow behavior.
- Existing handler tests pass with equivalent assertions.

## Dependencies / Risks
- This Epic depends on foundational module locations from the Module Foundation Epic.
- Sync and skill flows share guardrail behavior; avoid duplicating sync preview or mutation readiness logic.
