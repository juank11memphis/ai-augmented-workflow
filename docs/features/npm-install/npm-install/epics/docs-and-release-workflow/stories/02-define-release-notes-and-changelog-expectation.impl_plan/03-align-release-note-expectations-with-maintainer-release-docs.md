# Step: Align release-note expectations with maintainer release docs

## Goal
Ensure the changelog and release-note expectation reads consistently across the story artifacts and the maintainer release workflow so future releases follow one pattern.

## Scope
- Check the story-facing docs, technical design, and any maintainer release documentation for consistent release-note wording.
- Update the maintainer release documentation only where needed so it references both `CHANGELOG.md` and GitHub Releases correctly.
- Validate that the final wording matches the feature brief decision without introducing extra scope such as changelog automation or release templates.

## Files
- `docs/features/npm-install/npm-install/technical_design.md`
- maintainer release documentation file if present
- `CHANGELOG.md`

## Done when
- The release-note expectation is consistent across the changelog, design docs, and maintainer release docs.
- A reviewer can confirm the repo now has one clear release communication rule for future Sibu versions.
- The story acceptance criteria can be verified by reading the updated docs together.

## Review status
- Approved by: `juanca`
- Approved at: `2026-04-23T02:17:39Z`
