# Step: Document the two-location release notes rule

## Goal
Make the repo’s release communication expectation explicit: every Sibu release updates both the canonical changelog and the matching GitHub Release.

## Scope
- Update the relevant docs to state that `CHANGELOG.md` is the canonical source and GitHub Releases are the public release surface.
- Explain when maintainers are expected to update both locations during a release.
- Keep the wording focused on the rule and its purpose, not on the full maintainer release checklist.
- Do not add GitHub automation or release tooling in this step.

## Files
- `docs/features/npm-install/npm-install/technical_design.md`
- `README.md`
- any maintainer-facing release doc already present if this story depends on it

## Done when
- The docs clearly state that every release updates both `CHANGELOG.md` and the matching GitHub Release.
- The docs clearly distinguish the canonical source from the public release surface.
- A maintainer reading the docs can understand when and why both locations must be updated.

## Review status
- Approved by: `juanca`
- Approved at: `2026-04-23T02:14:40Z`
