# Step: Target Windsurf through shared skills

## Goal

Ensure all required and selectable skill templates can target Windsurf through Ekko's existing shared `.agents/skills/<skill>/SKILL.md` layout.

## Scope

- Add `windsurf` mappings to every mandatory skill template in `MANDATORY_SKILLS`.
- Add `windsurf` mappings to every selectable language, framework, and architecture skill template.
- Keep all Windsurf skill target paths under `.agents/skills/`; do not add `.windsurf/skills` paths.
- Add or extend tests that assert Windsurf skill paths match the shared skill paths used by Codex, Gemini, and Claude.
- Do not change skill routing instructions or template contents unless required by type changes.

## Files

- src/shared/catalog.ts
- src/shared/catalog.test.ts
- src/shared/types.ts

## Done when

- Mandatory skills include Windsurf target mappings to `.agents/skills/.../SKILL.md`.
- Selectable TypeScript, React, Next.js, DDD + Hexagonal Architecture, and Command Pattern skills include Windsurf target mappings to `.agents/skills/.../SKILL.md`.
- Tests prove no Windsurf skill target uses `.windsurf/skills`.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:33:24Z
