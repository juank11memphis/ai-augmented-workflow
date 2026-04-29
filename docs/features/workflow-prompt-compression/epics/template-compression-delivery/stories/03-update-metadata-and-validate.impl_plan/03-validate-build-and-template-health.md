# Step: Validate build and template health

## Goal

Run practical repository checks to ensure the compressed templates, routing text, and manifest metadata remain valid and do not update generated managed files directly.

## Scope

- Run `pnpm verify` when practical.
- Run `sibu doctor` to verify workflow health without applying generated updates.
- If `sibu doctor` reports expected drift because source templates changed but generated files were intentionally not synced, report that clearly instead of running `sibu sync`.
- Confirm generated managed workspace files were not edited directly.
- Confirm `templates/manifest.json` is valid JSON and includes the updated versions and change notes.
- Do not apply generated updates through sync.

## Files

- `templates/manifest.json`
- `templates/AGENTS.md`
- `templates/skills/**/SKILL.md`
- `src/shared/catalog.ts`
- `AGENTS.md`
- `.agents/**`

## Done when

- `pnpm verify` passes, or any failure is reported with cause and next action.
- `sibu doctor` is run and the result is reported accurately.
- `git diff -- AGENTS.md .agents` shows generated managed workspace files were not edited, or any drift is clearly explained as generated-output drift not direct edits.
- Manifest JSON parses successfully.

## Validation notes

- `templates/manifest.json` parsed successfully with `templateVersion` 48.
- `git diff -- AGENTS.md .agents` had no output; generated managed workspace files were not edited directly.
- `sibu doctor` ran and reported expected review-needed drift because source templates are now version 48 while generated workflow files were intentionally not synced. Per story scope, `sibu sync` was not run.
- `pnpm verify` did not pass. Build and typecheck passed, but `bin/shared/workflow-mutation-readiness.test.js` failed because the test still expects manifest template version `47` while the manifest is now `48`. Next action: update the version expectation in the relevant test as part of validation cleanup, then rerun `pnpm verify`.


## Validation cleanup notes

- Updated `src/shared/workflow-mutation-readiness.test.ts` to expect template version `48`, matching `templates/manifest.json`.
- Reran `pnpm verify`; it passed.
- Reran `sibu doctor`; it still reports expected review-needed drift because generated workflow files remain at previous managed template versions and were intentionally not synced.
- Confirmed `git diff -- AGENTS.md .agents` had no output after validation cleanup.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:08:49-06:00
