# Step: Add focused packaging validation

## Goal
Prove that the publishability changes actually produce a valid npm package by adding or updating the narrow validation needed for this story.

## Scope
- Add or refine validation steps that cover the story acceptance criteria around publishable metadata and shipped runtime files.
- Use tarball-based validation (`npm pack`) instead of repo-link validation as the release-readiness check for this story.
- Keep the validation focused on package metadata and package contents, not the full installed CLI runtime smoke flow from the next story.
- Do not implement the later `sibu doctor` npm version advisory or broader release documentation here.

## Files
- `package.json`
- `README.md`
- `docs/features/npm-install/npm-install/technical_design.md`
- any existing test or validation script files touched by the chosen approach

## Done when
- The story has a documented or scripted validation path that includes `pnpm verify` and `npm pack`.
- The validation explicitly prefers tarball-based checks over `pnpm link` for release readiness.
- A reviewer can confirm from the repo artifacts how to verify that the package metadata and packed contents satisfy this story.
- Any touched validation commands or tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-22T22:55:10Z
