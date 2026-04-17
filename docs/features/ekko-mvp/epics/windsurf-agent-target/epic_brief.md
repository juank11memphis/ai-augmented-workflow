# Windsurf Agent Target Epic Brief

## Summary
Add Windsurf as a first-class Ekko agent target while preserving Ekko's cross-agent workflow model and avoiding deep editor automation.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Add `windsurf` to the supported agent model and catalog.
- Treat agent-specific support files as optional so Windsurf can rely on root `AGENTS.md` and shared `.agents/skills/` discovery.
- Ensure skills can target Windsurf through the shared `.agents/skills/<skill>/SKILL.md` layout.
- Ensure `init`, `doctor`, and `sync` accept and report Windsurf as a supported selected agent.

## Out of Scope
- Deep Windsurf editor automation.
- Creating `.windsurf/skills` templates unless cross-agent discovery proves insufficient.
- Supporting every possible editor or agent in the MVP.

## User Stories
- [Use Windsurf in the Ekko workflow loop](./use-windsurf-in-the-ekko-workflow-loop.md)

## Acceptance Criteria
- Windsurf is available as a supported agent target alongside Codex, Claude, and Gemini.
- A Windsurf-selected repo uses the same common `AGENTS.md` and shared skill files expected by Ekko.
- `ekko doctor` and `ekko sync` treat Windsurf state as supported.
- The implementation avoids expanding into Windsurf-specific editor automation.

## Dependencies / Risks
- The MVP assumes Windsurf's documented `AGENTS.md` plus `.agents/skills/` discovery is sufficient.
- If real-world testing shows `.windsurf/skills` is required, that should become a later template-target change.
