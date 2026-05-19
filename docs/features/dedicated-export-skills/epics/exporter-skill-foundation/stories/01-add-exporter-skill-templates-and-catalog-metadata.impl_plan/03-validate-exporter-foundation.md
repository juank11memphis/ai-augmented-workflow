# Step: Validate exporter skill foundation

## Goal

Run focused and full validation for the exporter skill catalog and template foundation.

## Scope

- Run targeted workflow target planning tests.
- Run targeted template catalog rendering tests.
- Run the full test suite when practical.
- Fix failures that are directly caused by this story's changes.
- Stop and report if validation fails for unrelated or ambiguous reasons.

## Files

- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/modules/template-catalog-rendering/templates.test.ts`

## Done when

- Targeted tests for catalog and template behavior pass.
- Full test suite passes, or any failure is clearly reported with scope impact.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:28:59-06:00
