# Step: Tighten runtime package contents

## Goal
Ensure the published package contains exactly the runtime files Sibu needs, with special attention to bundled templates and other assets required after npm install.

## Scope
- Review and adjust the package file-inclusion list so runtime-required assets are shipped.
- Preserve template availability for installed-package execution.
- Keep the package contents aligned with the current runtime path assumptions in `src/shared/paths.ts`.
- Do not add new runtime lookup mechanisms or broader release-process documentation in this step.

## Files
- `package.json`
- `src/shared/paths.ts`
- `src/shared/templates.ts`

## Done when
- The package file list includes the runtime-required assets and excludes unnecessary publish-time baggage where appropriate.
- The packaging decision remains compatible with the current installed-package template lookup path.
- `npm pack` produces a tarball whose contents can be inspected to confirm required runtime assets are present.
- `pnpm check` passes if any source files changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-22T22:52:37Z
