# Step: Refuse architecture skill conflicts

## Goal

Ensure `ekko skills use <skill_name>` fails safely when a different architecture skill is already selected, preserving the existing architecture choice and workflow files.

## Scope

- Keep selectable skill resolution exact and reuse the existing catalog helper.
- In `getNextSkillSelection`, treat selecting the same architecture skill as a no-op success and selecting a different architecture skill as a blocked result.
- Make the blocked architecture-conflict message explain that replacement is not supported in the MVP and requires an explicit user-controlled action first.
- Add handler-level coverage proving architecture conflicts do not create files, refresh `AGENTS.md`, or update `.ekko/state.json`.
- Do not implement architecture replacement, automatic stop-managing behavior, or interactive conflict resolution.

## Files

- src/features/use-skill/handler.ts
- src/features/use-skill/handler.test.ts
- src/shared/catalog.ts
- src/shared/types.ts
- .ekko/state.json
- AGENTS.md

## Done when

- `getNextSkillSelection` returns no-op success for an already selected architecture skill.
- `getNextSkillSelection` returns blocked for selecting `command-pattern` when `ddd-hexagonal` is already selected, and vice versa where applicable.
- Handler tests show an architecture conflict sets a failing exit code and leaves the repo snapshot unchanged.
- The output avoids implying that Ekko silently replaced or removed the existing architecture skill.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:18:10Z
