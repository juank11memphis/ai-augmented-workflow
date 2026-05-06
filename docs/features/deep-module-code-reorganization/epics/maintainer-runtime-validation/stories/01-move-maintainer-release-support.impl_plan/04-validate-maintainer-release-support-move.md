# Step: Validate maintainer release support move

## Goal

Prove the maintainer release support move is behavior-preserving and ready for review.

## Scope

- Run focused moved changelog and release workflow tests.
- Run admin compatibility entrypoint tests.
- Run broad tests after stale compiled files from deleted `src/admin/generate-changelog/*` and `src/admin/release-workflow/*` sources are not discoverable by the test runner.
- Run `pnpm build` and at least `pnpm test`; run `pnpm verify` if practical before review.
- Do not mark the story complete if any admin test is skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/admin/changelog.ts`
- `src/admin/release.ts`
- `src/admin/release.test.ts`
- `src/modules/maintainer-release-support/generate-changelog/handler.test.ts`
- `src/modules/maintainer-release-support/release-workflow/handler.test.ts`
- `src/modules/maintainer-release-support/release-workflow/package-json.test.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/maintainer-release-support/generate-changelog/handler.test.js` passes.
- `node --test bin/modules/maintainer-release-support/release-workflow/handler.test.js bin/modules/maintainer-release-support/release-workflow/package-json.test.js bin/admin/release.test.js` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.
- `pnpm` admin scripts still resolve to runnable compiled files.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:35:15-06:00
