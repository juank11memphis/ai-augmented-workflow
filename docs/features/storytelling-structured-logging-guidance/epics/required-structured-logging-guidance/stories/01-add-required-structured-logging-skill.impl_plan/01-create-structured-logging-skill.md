# Step: Create the structured logging skill template and dogfood copy

## Goal

Add the canonical `structured-logging` skill content in both the Sibu template catalog and this repository's active `.agents/skills` workspace so future installs and immediate dogfooding use the same concise guidance.

## Scope

- Create `templates/skills/structured-logging/SKILL.md` with frontmatter `name: structured-logging` and a focused description.
- Create `.agents/skills/structured-logging/SKILL.md` with the same guidance as the template copy.
- Cover apply/avoid triggers, project logging conventions first, ecosystem-standard logger selection, structured/storytelling metadata, sensitive-data exclusions, concise local helper/wrapper guidance, and dependency restraint.
- Keep the guidance compact and canonical; do not duplicate story 02 routing changes into other skills or agent instruction templates.

## Files

- `templates/skills/structured-logging/SKILL.md`
- `.agents/skills/structured-logging/SKILL.md`

## Done when

- Both skill files exist and contain `name: structured-logging`.
- The dogfood copy matches the template guidance unless there is a clearly documented repo-local reason to differ.
- The skill satisfies the story acceptance criteria for triggers, noisy-log avoidance, safe structured logs, project conventions, sensitive-data exclusions, storytelling metadata, and helper/wrapper guidance.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T18:52:49Z
