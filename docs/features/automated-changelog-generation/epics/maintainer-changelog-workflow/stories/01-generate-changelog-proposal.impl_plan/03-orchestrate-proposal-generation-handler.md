# Step: Orchestrate proposal generation in the handler

## Goal

Connect the command, git-history adapter, and classification logic into a handler that returns a complete structured changelog proposal without writing files.

## Scope

- Implement `handleGenerateChangelogProposal` or an equivalently clear handler function in the maintainer slice.
- Accept a command with optional `fromRef` and `toRef` values.
- Use the git-history adapter to validate context, resolve the source range, and read commits.
- Convert commits into categorized proposal entries using the classification logic.
- Include proposal metadata such as source range, commit count, target section intent for later stories, and warnings.
- Return an explicit success or blocked result instead of throwing for expected validation failures.
- Ensure invalid git refs and non-git directories produce no file changes.
- Do not add package scripts, terminal prompts, `CHANGELOG.md` writing, SemVer validation, or public CLI wiring in this story.

## Files

- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/handler.test.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/git-history.ts`

## Done when

- A handler test proves Conventional Commit messages become a categorized proposal.
- A handler test proves breaking-change commits add a maintainer-review warning or concern.
- A handler test proves non-Conventional Commit messages remain in the proposal and are marked review-needed.
- A handler test proves no-tag repositories produce a usable proposal with a missing-tag warning.
- A handler test proves invalid refs return a clear blocked result and do not write files.
- The story acceptance criteria are covered by tests.
- `pnpm build`, `pnpm check`, and the new focused test file pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-24T22:10:06.507335Z
