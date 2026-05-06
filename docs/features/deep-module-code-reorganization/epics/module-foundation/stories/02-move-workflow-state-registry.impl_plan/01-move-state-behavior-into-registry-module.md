# Step: Move state behavior into the registry module

## Goal

Put all workflow state registry behavior behind `src/modules/workflow-state-registry/` while preserving the existing state schema, validation rules, file I/O, cloning, and reviewed-template checks.

## Scope

- Move the behavior currently in `src/shared/state.ts` into a module-owned implementation file such as `src/modules/workflow-state-registry/state.ts`.
- Export the existing public functions and `StateReadResult` type from `src/modules/workflow-state-registry/index.ts` with stable names.
- Keep `STATE_RELATIVE_PATH` as a path/catalog constant only; do not change its value or `.sibu/state.json` schema semantics.
- Do not rename exported state functions unless every call site and test stays behaviorally equivalent.
- Do not add migrations or change managed/customized/unmanaged status semantics.

## Files

- `src/shared/state.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/workflow-state-registry/state.ts`
- `src/shared/catalog.ts`
- `src/shared/types.ts`

## Done when

- `readStateForDoctor`, `readExistingState`, `writeStateFile`, `cloneState`, and `hasReviewedTemplateVersion` are implemented under `src/modules/workflow-state-registry/`.
- The module index exposes the state registry API callers need.
- No state behavior remains hidden in a generic shared implementation file.
- Valid, missing, malformed, and invalid state handling remains equivalent to the previous implementation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:38:57.176Z
