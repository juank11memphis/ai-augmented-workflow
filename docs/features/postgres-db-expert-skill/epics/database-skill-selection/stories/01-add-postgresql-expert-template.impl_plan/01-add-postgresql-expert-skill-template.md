# Step: Add PostgreSQL Expert skill template

## Goal

Create the new managed PostgreSQL Expert skill template with concise, practical guidance that helps agents make better PostgreSQL schema and database tradeoff decisions without turning the skill into a broad DBA playbook.

## Scope

- Add `templates/skills/postgresql-expert/SKILL.md` with frontmatter `name: postgresql-expert`.
- Write concise guidance for schema clarity, data integrity, constraints, migrations, transactions, query/access-pattern awareness, PostgreSQL-specific judgment, and index restraint.
- Explicitly discourage unnecessary indexes, premature complexity, and using PostgreSQL-specific features just because they exist.
- Do not register the skill in `src/modules/workflow-target-planning/catalog.ts` or any command flow in this story.
- Do not add database introspection, SQL generation, ER diagram, or full DBA/performance-tuning guidance.

## Files

- `templates/skills/postgresql-expert/SKILL.md`

## Done when

- `templates/skills/postgresql-expert/SKILL.md` exists.
- The skill frontmatter name is exactly `postgresql-expert`.
- The skill is concise, principle-driven, and aligned with Sibu's keep-it-simple philosophy.
- The skill includes PostgreSQL-specific guidance without becoming a full DBA guide.
- The skill explicitly discourages unnecessary indexes and premature complexity.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:01:06-06:00
