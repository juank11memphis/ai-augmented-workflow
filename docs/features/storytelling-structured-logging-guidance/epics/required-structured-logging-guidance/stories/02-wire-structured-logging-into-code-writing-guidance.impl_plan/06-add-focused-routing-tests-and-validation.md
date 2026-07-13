# Step: Add focused routing tests and run validation

## Goal

Protect the new routing and delegation hooks with focused tests and validate the template catalog without brittle full-prose assertions.

## Scope

- Add or update template-catalog tests for structured logging routing in `templates/AGENTS.md`, clean-code delegation, executor packet guidance, and TypeScript/Golang/command-pattern references.
- Add or update manifest version/change-note expectations for the changed templates.
- Update generated `bin/` test artifacts only through the repository's normal build flow if this project expects compiled test files to be committed.
- Run focused template tests first, then `pnpm run test` or `pnpm run build` if focused coverage or generated artifacts are uncertain.
- Run `sibu doctor` as a read-only health check and report expected drift without running `sibu sync`.

## Files

- `src/modules/template-catalog/templates.test.ts`
- `src/modules/template-catalog/catalog.test.ts`
- `src/support/expected-workflow-targets.test.ts`
- `bin/modules/template-catalog/templates.test.js`
- `bin/modules/template-catalog/catalog.test.js`
- `bin/support/expected-workflow-targets.test.js`

## Done when

- Focused tests fail if key structured logging routing/delegation hooks are removed from changed templates.
- Manifest version expectations match the updated template metadata.
- Relevant focused tests pass, broader validation is run when needed, and `sibu doctor` output is captured as a maintenance signal only.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
