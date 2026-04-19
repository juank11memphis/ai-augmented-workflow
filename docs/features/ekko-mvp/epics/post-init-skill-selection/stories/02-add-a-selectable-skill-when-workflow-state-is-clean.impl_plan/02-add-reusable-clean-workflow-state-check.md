# Step: Add a reusable clean workflow state check

## Goal
Create a reusable preflight helper that lets `ekko skills use` verify the current Ekko workflow is clean before any file or state mutation happens.

## Scope

- Add a shared workflow-cleanliness helper that reads or receives the current state and determines whether mutation is safe.
- Reuse existing state validation, workflow target, manifest, and sync preview logic instead of duplicating drift rules in the new handler.
- Treat missing or invalid `.ekko/state.json`, actionable sync previews, missing managed files, local edits, unreviewed template updates, unknown templates, and unrecorded expected files as not clean.
- Return a small explicit result that the handler can convert into concise user-facing output that points to `ekko sync` when cleanup is needed.
- Preserve `ekko doctor` and `ekko sync` behavior while extracting only the reusable logic needed by this command.
- Do not write files, update `.ekko/state.json`, or select a skill in this step.

## Files

- src/shared/workflow-cleanliness.ts
- src/shared/state.ts
- src/features/sync-project/preview.ts
- src/features/use-skill/handler.ts

## Done when

- The handler can call one helper before mutation to determine whether the workflow state is clean.
- The helper relies on `readStateForDoctor`, `readTemplateManifest`, `getSyncPreviews`, and `isActionableSyncPreview` or equivalent shared logic.
- Dirty or invalid workflow states produce a failure result with enough context to tell the user to run `ekko sync` first.
- Clean workflow states return the parsed state and manifest needed by later implementation steps.
- `pnpm check` passes.
