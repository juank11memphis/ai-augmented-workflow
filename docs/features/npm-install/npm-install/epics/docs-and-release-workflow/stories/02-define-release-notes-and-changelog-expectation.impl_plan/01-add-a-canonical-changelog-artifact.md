# Step: Add a canonical changelog artifact

## Goal
Create the repo artifact that will serve as the canonical release-notes source so maintainers have one obvious in-repo place to record user-visible changes for each release.

## Scope
- Add `CHANGELOG.md` at the repo root using a simple, maintainable structure suitable for manual updates.
- Explain in the changelog heading or opening notes that it is the canonical source for Sibu release notes.
- Keep the initial contents lightweight; do not backfill a long historical changelog in this step unless the chosen structure requires a small starter entry.
- Do not add changelog automation or release generation tooling.

## Files
- `CHANGELOG.md`

## Done when
- The repo contains a clear `CHANGELOG.md` file intended for Sibu release notes.
- The file makes it obvious that maintainers should update it for every release.
- The structure is simple enough to support the later maintainer release workflow without extra tooling.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T02:11:42Z
