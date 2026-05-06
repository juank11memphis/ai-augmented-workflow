# Step: Update admin entrypoint packaging

## Goal

Keep `pnpm` admin scripts runnable after admin internals move into Maintainer Release Support.

## Scope

- Preserve `package.json` admin script compatibility with `node ./bin/admin/changelog.js` and `node ./bin/admin/release.js`, unless deliberately updating script paths is simpler and fully validated.
- If keeping compatibility entrypoints, ensure `src/admin/changelog.ts` and `src/admin/release.ts` remain compiled and package-reachable.
- Remove empty legacy admin internal folders only after imports are updated and build output no longer depends on them.
- Update `src/modules/maintainer-release-support/index.ts` exports for changelog and release support as needed by compatibility entrypoints and tests.
- Do not move user-facing CLI commands or package runtime contents outside this story's admin scope.

## Files

- `package.json`
- `src/admin/changelog.ts`
- `src/admin/release.ts`
- `src/modules/maintainer-release-support/index.ts`
- `src/modules/maintainer-release-support/generate-changelog/*`
- `src/modules/maintainer-release-support/release-workflow/*`

## Done when

- `pnpm admin:changelog -- --help` or equivalent parse-path validation still resolves a compiled runnable file.
- `pnpm admin:release -- --help` or equivalent parse-path validation still resolves a compiled runnable file.
- `pnpm build` passes after old admin internal imports are removed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:35:15-06:00
