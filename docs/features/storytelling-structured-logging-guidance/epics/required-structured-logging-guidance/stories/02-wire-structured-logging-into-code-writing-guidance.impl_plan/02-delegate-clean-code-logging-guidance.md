# Step: Delegate clean-code logging guidance to structured logging

## Goal

Add a compact observability principle to clean-code guidance so general code-quality reviews notice logging concerns but rely on `structured-logging` for detailed policy.

## Scope

- Update `templates/skills/clean-code/SKILL.md` with a short principle covering meaningful operational behavior, concise useful logs, and delegation to `structured-logging`.
- Update `.agents/skills/clean-code/SKILL.md` with the same dogfood guidance.
- Do not expand clean-code into a second structured logging policy source.

## Files

- `templates/skills/clean-code/SKILL.md`
- `.agents/skills/clean-code/SKILL.md`

## Done when

- Clean-code guidance references `structured-logging` explicitly for detailed logging rules.
- Clean-code remains focused on broad code quality and readability.
- The added text is brief enough to avoid policy duplication or future drift.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
