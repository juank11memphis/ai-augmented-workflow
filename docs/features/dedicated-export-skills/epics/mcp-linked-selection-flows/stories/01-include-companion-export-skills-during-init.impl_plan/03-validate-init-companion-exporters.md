# Step: Validate init companion exporters

## Goal

Run focused and full validation for MCP-implied exporter skills during init.

## Scope

- Run project adoption tests.
- Run interactive guidance tests if affected by prompt filtering.
- Run the full test suite when practical.
- Fix failures directly caused by this story's changes.
- Stop and report unrelated or ambiguous failures.

## Files

- `src/modules/project-adoption/handler.test.ts`
- `src/modules/interactive-guidance/prompts.test.ts`

## Done when

- Focused tests pass.
- Full test suite passes, or any failure is clearly reported with scope impact.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:40:42-06:00
