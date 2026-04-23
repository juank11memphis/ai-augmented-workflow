# Step: Smoke-test help and template-backed runtime from the installed tarball

## Goal
Extend the packed-runtime harness so it proves the installed CLI both starts correctly and can read bundled runtime assets from the npm-installed package, not from files in the source checkout.

## Scope
- Make the validation harness run `sibu --help` from the installed tarball-backed binary.
- Add one additional non-destructive smoke test that reads bundled runtime assets through the installed CLI, preferably `sibu doctor` against a dedicated temporary fixture project that includes valid Sibu state and managed files.
- Add any minimal fixture files needed so the smoke test can run outside the source checkout and still force template/runtime reads from the installed package.
- Keep the smoke test read-only once the fixture is prepared; do not depend on `pnpm link` or on running the CLI directly from this repo.
- Do not add npm registry advisory logic or broader release-process automation in this step.

## Files
- `scripts/validate-packed-cli-runtime.mjs`
- `package.json`
- `test/fixtures/packed-runtime/`
- any existing runtime/state helper files touched to support the fixture format

## Done when
- The packed-runtime validation runs `sibu --help` successfully after tarball installation.
- The validation runs at least one additional non-destructive CLI smoke test that proves the installed command can access bundled runtime assets.
- The smoke test executes against an isolated temporary project or fixture rather than the source checkout.
- The validation fails clearly if the installed CLI cannot find its bundled templates or other required runtime files.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T00:55:30Z
