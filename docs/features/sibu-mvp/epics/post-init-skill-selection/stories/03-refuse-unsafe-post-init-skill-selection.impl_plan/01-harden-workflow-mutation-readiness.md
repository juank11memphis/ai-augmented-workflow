# Step: Harden workflow mutation readiness refusal

## Goal

Ensure the reusable workflow mutation readiness check refuses missing, invalid, or dirty Sibu workflow state before `sibu skills use` can plan or write any selected skill changes.

## Scope

- Extend or adjust `getWorkflowMutationReadiness` so missing `.sibu/state.json`, unparsable JSON, structurally invalid state, and actionable sync previews return `ok: false` with an actionable hint.
- Keep readiness logic shared and side-effect free; it must only read state, templates, and current workflow files.
- Add focused tests for invalid state JSON and actionable drift cases that require `sibu sync` before mutation.
- Do not repair state, adopt files, prompt interactively, or duplicate broader `sibu sync` behavior inside readiness.

## Files

- src/shared/workflow-mutation-readiness.ts
- src/shared/workflow-mutation-readiness.test.ts
- src/shared/state.ts
- src/shared/sync-preview.ts

## Done when

- Missing `.sibu/state.json` refuses with guidance to run `sibu init` before selecting skills.
- Invalid or unparsable `.sibu/state.json` refuses without throwing and without mutating files.
- A modified managed workflow file produces `ok: false`, includes actionable preview details, and points the caller to `sibu sync`.
- Readiness tests prove the helper has no write side effects by comparing a file snapshot before and after refused checks.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T01:56:00Z
