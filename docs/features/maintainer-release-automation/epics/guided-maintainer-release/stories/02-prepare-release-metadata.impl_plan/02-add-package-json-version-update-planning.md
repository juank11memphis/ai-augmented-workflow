# Step: Add package JSON version update planning

## Goal

Add a focused helper that safely plans a root `package.json` version update while preserving unrelated metadata and formatting as much as practical.

## Scope

- Add `src/admin/release-workflow/package-json.ts`.
- Read package JSON content through inputs supplied by the handler or tests; keep the helper pure and easy to test.
- Validate that the content parses as JSON and contains a string `version` field.
- Return a typed blocked result with a clear message for malformed JSON, missing version, or non-string version values.
- Produce next package JSON content that changes only the root `version` value when possible.
- Preserve unrelated package fields and the existing newline/indentation style as much as practical.
- Do not update lockfiles, npm dist-tags, package manager metadata, changelog content, release commits, tags, publishing, or pushes in this step.

## Files

- `src/admin/release-workflow/package-json.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`
- `package.json`

## Done when

- Tests prove planning a package update changes only the root `package.json` version value.
- Tests prove unrelated package metadata is preserved.
- Tests prove malformed JSON blocks with a clear message.
- Tests prove missing or non-string `version` blocks with a clear message.
- No lockfile or package manager metadata updates are introduced.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T19:19:39-06:00
