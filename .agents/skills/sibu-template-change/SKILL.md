---
name: sibu-template-change
description: Use when changing Sibu templates under templates/ or updating template manifest metadata. Ensures template edits update templates/manifest.json, include user-facing sync notes, and are validated with Sibu lifecycle checks.
---

# Sibu Template Change

## When to use

Use this skill whenever changing files under `templates/`, including:

- `templates/AGENTS.md`
- `templates/.codex/config.toml`
- `templates/GEMINI.md`
- `templates/CLAUDE.md`
- `templates/manifest.json`

## Workflow

1. Identify which templates are changing.
2. Make the template edits.
3. Update `templates/manifest.json` in the same change.
4. Bump the global `templateVersion` if any template changed.
5. Bump each changed template's own `version`.
6. Replace each changed template's `changes` entries with user-facing notes for the current template version only.
7. Run `pnpm verify`.
8. When practical, test the lifecycle in a temporary project:
   - `sibu init`
   - `sibu doctor`
   - `sibu sync`

## Manifest rules

- Keep template paths stable. Do not rename template paths unless migration or backwards compatibility is handled.
- The global `templateVersion` represents the version of the full template set.
- Each template's `version` represents the version of that specific template file.
- The `changes` entries are shown by `sibu sync`, so write them for users.
- Treat `changes` as release notes for the template's current version, not as an accumulated changelog.
- When bumping a template version, remove older-version change notes from that template and keep only the changes introduced by the new version.

## Change note style

Good change notes:

- Added Sibu maintenance guidance for `sibu sync`.
- Clarified when agents should recommend `sibu doctor`.
- Added safety guidance for destructive commands.

Avoid change notes like:

- Changed lines 22-34.
- Refactored wording.
- Updated Markdown.

## Safety

- Do not silently overwrite user-customized workflow files in CLI behavior.
- Preserve the `sibu init` guarantee: create missing files, refresh metadata, and keep existing workflow files unchanged.
- Preserve the `sibu sync` guarantee: explain meaningful template changes and protect local edits from automatic overwrites.
