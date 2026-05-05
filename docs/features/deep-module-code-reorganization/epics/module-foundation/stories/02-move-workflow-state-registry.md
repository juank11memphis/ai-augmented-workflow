# Move Workflow State Registry Behavior

## Epic
[Module Foundation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want workflow state behavior to live in the Workflow State Registry module, so that state semantics are not hidden in a generic shared area.

## Context
State reading, validation, cloning, reviewed-version checks, and state writing currently live in `src/shared/state.ts`. The Deep Module Map assigns those responsibilities to Workflow State Registry.

## Scope
- Move state registry behavior into `src/modules/workflow-state-registry/`.
- Update imports from command handlers and other modules.
- Preserve `.sibu/state.json` schema, validation behavior, and status semantics.
- Move or update related tests with equivalent assertions.

## Out of Scope
- State migrations.
- Changing managed/customized/unmanaged behavior.
- Changing sync, doctor, init, or skill behavior beyond imports.

## Acceptance Criteria
- Workflow state reads and writes are owned by the Workflow State Registry module.
- Existing state behavior remains equivalent for valid, missing, and malformed state files.
- Callers use the module boundary instead of importing state behavior from generic shared code.

## Validation
- `pnpm build`
- Relevant moved state and workflow tests.
