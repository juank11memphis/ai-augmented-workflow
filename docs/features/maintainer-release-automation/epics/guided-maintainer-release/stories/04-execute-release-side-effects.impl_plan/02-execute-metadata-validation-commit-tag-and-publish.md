# Step: Execute metadata writes, validation, commit, tag, and npm publish

## Goal

Implement the first confirmed release execution sequence through injected ports: write planned metadata, validate, create the release commit, create the release tag, and publish to npm with stop-on-failure behavior.

## Scope

- Add a confirmed execution function that accepts a `ReleasePlan` and release workflow execution ports.
- Write the planned `CHANGELOG.md` and `package.json` contents before validation.
- Run `pnpm run validate:release` after metadata writes and before public release side effects.
- Create the release commit with `git add CHANGELOG.md package.json` followed by `git commit -m "chore(release): <version>"`.
- Create the release tag `v<version>`.
- Run `npm publish` after validation, commit, and tag succeed.
- Stop immediately when validation, commit, tag, or npm publish fails and report completed steps plus recovery guidance.
- Do not push commits/tags or create GitHub Releases in this step.
- Do not add package scripts, public CLI commands, or docs updates in this step.

## Files

- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- Tests prove successful execution writes metadata, validates, commits, tags, and publishes in order.
- Tests prove validation failure stops before commit, tag, npm publish, push, or GitHub Release creation.
- Tests prove npm publish failure stops before push and GitHub Release creation.
- Tests prove each completed step is reported.
- Existing planning, preview, and confirmation tests still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T21:54:46-06:00
