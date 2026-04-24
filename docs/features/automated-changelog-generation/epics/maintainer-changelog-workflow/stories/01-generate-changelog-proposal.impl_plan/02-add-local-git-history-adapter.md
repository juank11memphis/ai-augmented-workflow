# Step: Add the local git history adapter

## Goal

Implement the local git-history boundary that validates repository context, resolves refs and ranges, finds the latest reachable tag, and reads commit data for proposal generation.

## Scope

- Add a small git adapter using `node:child_process` with explicit argument arrays rather than shell strings.
- Confirm the current working directory is inside a git repository.
- Resolve optional `fromRef` and `toRef` values and return clear failures for invalid refs.
- Default `toRef` to `HEAD`.
- Find the latest reachable tag when `fromRef` is omitted.
- When no tag exists, read all reachable commits up to `toRef` and return a missing-tag warning.
- Read commit hash, subject, and body from the selected range.
- Keep this adapter focused on local git only; do not call GitHub, npm, or remote services.
- Do not write files or prompt the user.

## Files

- `src/admin/generate-changelog/git-history.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests using a temporary git repository prove commits are read from an explicit `fromRef..toRef` range.
- Tests prove the latest reachable tag is used when `fromRef` is omitted.
- Tests prove a repository with no tags still returns commits and includes a missing-tag warning.
- Tests prove invalid refs return a blocked/error result with a clear message.
- Tests prove non-git directories return a blocked/error result with a clear message.
- No test writes or modifies the real repository history.
- `pnpm build` and the new focused test file pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-24T22:06:37.003733Z
