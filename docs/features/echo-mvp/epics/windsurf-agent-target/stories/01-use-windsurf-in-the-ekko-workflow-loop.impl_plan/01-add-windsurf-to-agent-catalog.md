# Step: Add Windsurf to the agent catalog

## Goal

Model Windsurf as a supported Echo agent target in the shared TypeScript types and catalog without introducing any Windsurf-specific workflow file or template.

## Scope

- Add `windsurf` to the `AgentId` union.
- Change `SupportedAgent` so `targetRelativePath` and `templateRelativePath` are optional for agents that do not need an agent-specific support file.
- Add a `windsurf` entry to `SUPPORTED_AGENTS` with a description that explains Windsurf uses root `AGENTS.md` and shared `.agents/skills/` discovery.
- Add catalog tests proving Windsurf is listed as a supported agent and has no agent-specific target/template path.
- Do not create `.windsurf/skills` templates, Windsurf editor automation, or a Windsurf-specific generated file.

## Files

- src/shared/types.ts
- src/shared/catalog.ts
- src/shared/catalog.test.ts

## Done when

- TypeScript accepts `windsurf` as an `AgentId`.
- `SUPPORTED_AGENTS` includes `windsurf` alongside `codex`, `gemini`, and `claude`.
- Existing agents still declare target/template paths, while Windsurf intentionally omits them.
- Catalog tests cover the new Windsurf catalog entry.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:30:35Z
