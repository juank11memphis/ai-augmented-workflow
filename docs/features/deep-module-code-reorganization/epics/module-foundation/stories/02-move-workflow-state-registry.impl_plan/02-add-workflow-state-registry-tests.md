# Step: Add workflow state registry tests

## Goal

Protect the moved registry behavior with focused tests that assert the same observable state semantics after the module move.

## Scope

- Add or move focused state tests under `src/modules/workflow-state-registry/`.
- Cover successful reads, missing state files, malformed JSON, invalid schema, state writes, deep cloning, and reviewed-template version checks.
- Keep assertions equivalent to the current behavior, including user-facing messages that mention `.sibu/state.json`.
- Do not weaken command handler tests to compensate for the module move.

## Files

- `src/modules/workflow-state-registry/state.test.ts`
- `src/modules/workflow-state-registry/state.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/features/doctor-project/handler.test.ts`
- `src/features/use-skill/handler.test.ts`

## Done when

- Workflow state registry tests prove behavior for valid, missing, malformed, and invalid state files.
- Tests prove `writeStateFile` creates the parent directory and writes stable pretty-printed JSON with a trailing newline.
- Tests prove `cloneState` returns an independent copy and `hasReviewedTemplateVersion` preserves its existing comparison behavior.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/workflow-state-registry/state.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:38:57.176Z
