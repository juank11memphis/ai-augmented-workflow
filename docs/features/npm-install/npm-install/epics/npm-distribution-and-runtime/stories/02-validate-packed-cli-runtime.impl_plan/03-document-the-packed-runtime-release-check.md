# Step: Document the packed-runtime release check

## Goal
Make the new tarball-install smoke path easy for maintainers to run and trust as the release-readiness check for this story.

## Scope
- Document the packed-runtime validation command and what it proves.
- Clarify how this check differs from `pnpm dev:link` and earlier tarball-content inspection.
- Explain which smoke commands are expected to pass and what kind of failure indicates an installed-package runtime problem.
- Keep the docs focused on this story's validation flow; do not add the broader changelog or release-notes workflow here.

## Files
- `README.md`
- `docs/features/npm-install/npm-install/technical_design.md`
- `package.json`

## Done when
- A maintainer can find one documented command for packed-runtime validation from the repo.
- The docs explain that tarball install smoke testing is the runtime validation complement to tarball content inspection.
- The documented validation flow explicitly avoids `pnpm link` and source-checkout execution as release-readiness proof.
- Any touched docs stay aligned with the current package script name and smoke-test behavior.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:01:41Z
