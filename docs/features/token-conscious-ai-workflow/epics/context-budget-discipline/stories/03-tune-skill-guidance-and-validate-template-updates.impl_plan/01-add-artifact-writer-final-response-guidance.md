# Step: Add artifact-writer final response guidance

## Goal

Add targeted, non-repetitive final-response guidance to skill templates that create large Markdown artifacts but do not already say how to report the result without dumping the whole artifact back into chat.

## Scope

- Update only artifact-writing skill templates that need local behavior beyond the global context-budget rule.
- Add concise final-response guidance to `templates/skills/technical-design-writer/SKILL.md` so it reports the path and key decisions briefly instead of pasting the full technical design by default.
- Add concise final-response guidance to `templates/skills/ux-expert/SKILL.md` so it reports the path and notable UX authority/risks briefly instead of pasting the full UX spec by default.
- Preserve required inputs, output paths, quality expectations, stop conditions, and UX mockup authority.
- Do not repeat the full `templates/AGENTS.md` context-budget section in either skill.
- Do not change production TypeScript or unrelated skill templates in this step.

## Files

- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/03-tune-skill-guidance-and-validate-template-updates.md`
- `docs/features/token-conscious-ai-workflow/technical_design.md`

## Done when

- `technical-design-writer` has local guidance to summarize the created/updated artifact in the final response and avoid pasting the full technical design unless requested.
- `ux-expert` has local guidance to summarize the created/updated artifact in the final response and avoid pasting the full UX spec unless requested.
- Both additions are short, targeted, and quality-preserving.
- No skill repeats the full global context-budget guidance.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:43:09-06:00
