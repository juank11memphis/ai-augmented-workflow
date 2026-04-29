# Step: Add preview, dry-run, and confirmation orchestration

## Goal

Add a testable release workflow orchestration function that plans the release, prints the preview, and gates all later execution behind dry-run or confirmation behavior.

## Scope

- Define release workflow ports in `src/admin/release-workflow/command.ts` for printing previews and confirming releases through injected dependencies.
- Add an orchestration function in `handler.ts` that calls `planMaintainerRelease`, renders and prints the preview, handles `--dry-run`, handles declined confirmation, and handles `--yes`.
- Ensure the preview is printed before any execution placeholder or later side-effect hook can run.
- Return typed results for blocked, dry-run, declined, and confirmed states so later stories can attach execution side effects after confirmation.
- Keep confirmation in the ports/entrypoint layer, not inside pure planning or preview rendering.
- Do not write `CHANGELOG.md`, update `package.json`, run validation, create commits, create tags, publish, push, create GitHub Releases, add package scripts, or wire public CLI commands in this step.

## Files

- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/release-plan.ts`

## Done when

- Tests prove dry-run mode prints the full plan and returns without writes or side effects.
- Tests prove declined confirmation prints the full plan and returns without writes or side effects.
- Tests prove `--yes` skips the prompt only after the preview is printed.
- Tests prove confirmation behavior is fully testable through fake ports.
- Existing planning and metadata tests still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T20:12:16-06:00
