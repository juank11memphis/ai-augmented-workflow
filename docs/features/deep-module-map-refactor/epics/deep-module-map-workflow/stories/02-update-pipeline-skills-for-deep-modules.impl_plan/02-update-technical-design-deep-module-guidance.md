# Step: Update technical design Deep Module guidance

## Goal

Revise the technical-design writer template so it requires selected Deep Modules from the feature brief and translates them into concrete implementation boundaries.

## Scope

- Update `templates/skills/technical-design-writer/SKILL.md` to require `docs/deep-module-map.md` and the feature brief's `## Deep Module` section.
- Replace Product Context stop conditions with Deep Module stop conditions.
- Make selected Deep Modules the source for implementation boundary decisions.
- Update technical design output examples from Product Context Map to Deep Module Map.
- Update the matching local copy `.agents/skills/technical-design-writer/SKILL.md`.
- Do not update feature-brief or implementation-planner guidance in this step.

## Files

- `templates/skills/technical-design-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`

## Done when

- Technical design guidance requires `docs/deep-module-map.md` and a feature brief `## Deep Module` section.
- The skill tells agents to translate selected Deep Modules into implementation boundaries.
- The changed template and local copy no longer contain active Product Context Map terminology.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:52:32-06:00
