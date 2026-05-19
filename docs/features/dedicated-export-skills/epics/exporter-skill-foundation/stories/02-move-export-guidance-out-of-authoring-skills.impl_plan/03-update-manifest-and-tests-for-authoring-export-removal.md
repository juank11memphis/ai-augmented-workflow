# Step: Update manifest and tests for authoring export removal

## Goal

Record the authoring-template changes in `templates/manifest.json` and add tests that prevent export workflows from returning to authoring skills.

## Scope

- Bump the global template version and each changed authoring skill template version.
- Replace changed template `changes` entries with user-facing notes for this template version.
- Add tests that authoring templates no longer include Notion export sections or the GitHub export gate.
- Validate that dedicated exporter templates still contain the export workflow guidance.

## Files

- `templates/manifest.json`
- `src/modules/template-catalog-rendering/templates.test.ts`

## Done when

- Manifest metadata is updated for all changed templates.
- Tests prove authoring templates no longer own Notion or GitHub export workflows.
- Template catalog tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:32:30-06:00
