# Step: Execute push and GitHub Release creation

## Goal

Complete the confirmed release execution sequence by pushing the release commit and tag, extracting the finalized changelog section, and creating the matching GitHub Release through `gh`.

## Scope

- Push the release commit with `git push origin HEAD` after npm publish succeeds.
- Push the release tag with `git push origin <tagName>` after the commit push succeeds.
- Extract the finalized changelog section for the target version from the planned or written changelog content.
- Create the GitHub Release with `gh release create <tagName> --title <tagName> --notes <finalized changelog section>` or an equivalent argument-array approach that avoids shell composition.
- Stop before GitHub Release creation when either push fails.
- If GitHub Release creation fails, report completed steps and manual recovery guidance for creating the release manually.
- Do not implement automatic rollback of npm publish, pushed commits, pushed tags, or GitHub Releases.
- Do not add package scripts, public CLI commands, or docs updates in this step.

## Files

- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- Tests prove push failure stops before GitHub Release creation.
- Tests prove GitHub Release creation uses the finalized `CHANGELOG.md` version section as the release body.
- Tests prove GitHub Release failure reports completed steps and manual recovery guidance.
- Tests prove successful execution reports all completed steps through GitHub Release creation.
- Existing planning, metadata, preview, and earlier execution tests still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T21:57:41-06:00
