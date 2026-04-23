# Step: Align README language with the technical design

## Goal
Make the README and the npm-install technical design say the same thing about the canonical user install/update flow and its explicit post-update review steps.

## Scope
- Update the technical design only where needed so it matches the final README wording and flow ordering.
- Check that the README reflects the current implemented doctor advisory and post-update drift behavior.
- Validate that the docs consistently say npm is the only supported user install/update path.
- Do not add maintainer release-process content in this step; that belongs to the later docs-and-release stories.

## Files
- `README.md`
- `docs/features/npm-install/npm-install/technical_design.md`

## Done when
- README and technical design describe the same canonical user install/update flow.
- The docs consistently explain: install with npm, run `sibu doctor`, update with npm if prompted, rerun `sibu doctor`, and then choose `sibu sync` if drift is reported.
- A reviewer can confirm the story acceptance criteria by reading the final docs without needing implementation context.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T02:03:54Z
