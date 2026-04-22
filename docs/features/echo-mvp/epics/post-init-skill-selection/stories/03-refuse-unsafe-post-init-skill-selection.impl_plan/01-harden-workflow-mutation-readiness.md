# Step: Harden workflow mutation readiness refusal

## Goal

Ensure the reusable workflow mutation readiness check refuses missing, invalid, or dirty Echo workflow state before `echo skills use` can plan or write any selected skill changes.

## Scope

- Extend or adjust `getWorkflowMutationReadiness` so missing `.echo/state.json`, unparsable JSON, structurally invalid state, and actionable sync previews return `ok: false` with an actionable hint.
- Keep readiness logic shared and side-effect free; it must only read state, templates, and current workflow files.
- Add focused tests for invalid state JSON and actionable drift cases that require `echo sync` before mutation.
- Do not repair state, adopt files, prompt interactively, or duplicate broader `echo sync` behavior inside readiness.

## Files

- src/shared/workflow-mutation-readiness.ts
- src/shared/workflow-mutation-readiness.test.ts
- src/shared/state.ts
- src/shared/sync-preview.ts

## Done when

- Missing `.echo/state.json` refuses with guidance to run `echo init` before selecting skills.
- Invalid or unparsable `.echo/state.json` refuses without throwing and without mutating files.
- A modified managed workflow file produces `ok: false`, includes actionable preview details, and points the caller to `echo sync`.
- Readiness tests prove the helper has no write side effects by comparing a file snapshot before and after refused checks.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T01:56:00Z
