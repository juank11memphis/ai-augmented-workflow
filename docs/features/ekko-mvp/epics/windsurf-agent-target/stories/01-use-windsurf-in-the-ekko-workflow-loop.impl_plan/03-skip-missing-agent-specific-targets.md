# Step: Skip missing agent-specific targets

## Goal

Update workflow target calculation so agents with no agent-specific target/template paths still participate in the workflow through common `AGENTS.md` and shared skill targets.

## Scope

- Update `getWorkflowTargets` to include an agent-specific target only when both `targetRelativePath` and `templateRelativePath` are present.
- Preserve the common `AGENTS.md` target for every selected-agent combination, including Windsurf-only selections.
- Preserve skill target de-duplication when Windsurf is selected with Codex, Claude, or Gemini.
- Add focused workflow-target tests for Windsurf-only and all-agents selections.
- Do not add placeholder templates or synthetic managed files for Windsurf.

## Files

- src/shared/workflow-targets.ts
- src/shared/types.ts
- src/shared/workflow-targets.test.ts
- package.json

## Done when

- `getWorkflowTargets` for Windsurf-only returns `AGENTS.md` plus shared skill files, with no undefined or Windsurf-specific support-file target.
- `getWorkflowTargets` for Codex, Claude, Gemini, and Windsurf includes Codex/Claude/Gemini support files but no Windsurf-specific support file.
- Shared `.agents/skills/.../SKILL.md` targets remain de-duplicated when multiple agents are selected.
- The new workflow-target test file is included in the test script if needed.
- `pnpm build`, `pnpm check`, and the focused workflow-target tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:36:21Z
