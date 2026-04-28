# Step: Add release execution model and ports

## Goal

Extend the release workflow with explicit execution result types and side-effect ports so confirmed release execution can be tested without touching git, npm, or GitHub for real.

## Scope

- Add command-result, completed-step, failed-step, and execution-result types for the confirmed release phase.
- Extend or add release workflow ports for writing files and running commands with explicit argument arrays.
- Keep execution ports transport-agnostic and fakeable in tests.
- Model completed steps and failure recovery guidance in the result shape.
- Do not execute metadata writes, validation, commits, tags, publish, push, or GitHub Releases in this step.
- Do not add package scripts, public CLI commands, or docs updates in this step.

## Files

- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- Types can represent successful execution, failed execution, completed steps, failed step, command output, and recovery guidance.
- Release workflow ports can write files and run commands using `command` plus `args`, not shell-composed strings.
- Tests can instantiate fake execution ports and assert command ordering without invoking real git, npm, pnpm, or gh.
- Existing planning, preview, and confirmation tests still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T21:52:34-06:00
