# Move Project Adoption and Health Diagnosis Workflows

## Epic
[User Workflow Modules](../epic_brief.md)

## User Story
As a Sibu maintainer, I want init and doctor behavior to live in their owning Deep Modules, so that first-time adoption and read-only health checks are easier to change independently.

## Context
The Deep Module Map assigns `sibu init` behavior to Project Adoption and `sibu doctor` behavior to Workflow Health Diagnosis. Current handlers live under `src/features`.

## Scope
- Move init command handler and command contract into Project Adoption as appropriate.
- Move doctor command handler, diagnosis behavior, and tests into Workflow Health Diagnosis.
- Preserve first-run idempotency, existing-file protection, malformed-state handling, and read-only doctor behavior.
- Update imports to foundational modules.

## Out of Scope
- Changing init prompts.
- Changing doctor output meaning or exit-code behavior.
- Applying sync repairs from doctor.

## Acceptance Criteria
- Project Adoption owns init behavior.
- Workflow Health Diagnosis owns doctor behavior.
- Existing init and doctor scenarios behave as before.
- Doctor remains read-only.

## Validation
- `pnpm build`
- Moved doctor handler tests.
- `sibu doctor`
