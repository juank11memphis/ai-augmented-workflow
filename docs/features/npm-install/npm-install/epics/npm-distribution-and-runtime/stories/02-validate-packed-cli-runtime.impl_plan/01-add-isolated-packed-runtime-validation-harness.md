# Step: Add isolated packed-runtime validation harness

## Goal
Create one repeatable validation entrypoint that exercises the npm-packed CLI the way users install it, without depending on `pnpm link`, the source checkout being on `PATH`, or the developer's real global npm prefix.

## Scope
- Add a dedicated validation script that creates isolated temporary working directories for the packed artifact and npm global prefix.
- Have the script produce a `.tgz` with `npm pack` and install that tarball with npm in the isolated prefix.
- Ensure the validation path exposes the installed `sibu` binary on `PATH` from that isolated prefix instead of from the repo checkout.
- Wire the validation into `package.json` with a clearly named script such as `validate:packed-runtime`.
- Do not implement the project-level smoke commands or release documentation in this step.

## Files
- `package.json`
- `scripts/validate-packed-cli-runtime.mjs`

## Done when
- The repo has one scripted validation path for packed-runtime smoke testing.
- The validation script installs the tarball into an isolated npm prefix rather than mutating the user's normal global install state.
- Running the new package script proves the installed `sibu` binary is the one coming from the tarball install.
- `pnpm check` passes if any checked source or config files changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T00:47:22Z
