# Step: Cover sync preview lifecycle drift

## Goal

Prove existing sync preview mechanics handle the required skill when an initialized project is missing the new managed target, deletes it, or modifies it locally.

## Scope

- Add or update tests around `getSyncPreviews` for `.agents/skills/product-context-map-writer/SKILL.md`.
- Cover the `new-template` case for an older state that lacks the required skill after the manifest/catalog expects it.
- Cover the `missing` case when the skill is recorded in state but the installed skill file is deleted.
- Cover the `modified` case when the skill is recorded in state but its file contents are changed locally.
- Assert preview `changes` for the new-template/update path come from the manifest entry.
- Do not add custom sync logic for `product-context-map-writer`; the tests should prove normal managed-target behavior is enough.

## Files

- `src/shared/sync-preview.test.ts`
- `src/shared/sync-preview.ts`
- `package.json`
- `bin/shared/sync-preview.test.js`

## Done when

- Sync preview tests cover new required skill adoption, missing-file drift, and modified-file drift.
- The tests fail if the required skill stops flowing through normal workflow targets.
- `package.json` test script runs the new compiled sync preview test if a new test file is added.
- `pnpm build` and `pnpm test` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T13:37:15-06:00
