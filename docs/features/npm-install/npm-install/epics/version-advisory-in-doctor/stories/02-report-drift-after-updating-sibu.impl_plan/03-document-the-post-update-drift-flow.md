# Step: Document the post-update drift flow

## Goal
Document the explicit user and maintainer flow so it is obvious that updating Sibu changes what doctor can detect, not the project files themselves.

## Scope
- Update user-facing docs to describe: run `sibu doctor`, update if prompted, rerun `sibu doctor`, then choose `sibu sync` if drift is reported.
- Document the new packaged validation command for the post-update drift scenario.
- Keep the docs focused on the explicit reviewable update flow; do not expand into broader release-process policy beyond what this story needs.

## Files
- `README.md`
- `docs/features/npm-install/npm-install/technical_design.md`
- `package.json`

## Done when
- The docs clearly explain that updating Sibu alone does not change project files.
- The docs clearly explain that rerunning `sibu doctor` after updating can surface new drift and that `sibu sync` is the explicit next step.
- The packaged post-update validation command is documented and aligned with the implementation.
- Any touched docs match the implemented command names and flow wording.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:51:40Z
