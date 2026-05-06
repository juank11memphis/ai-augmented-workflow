# Add the PostgreSQL Expert Managed Template

## Epic
[Database Skill Selection](../epic_brief.md)

## User Story
As a Sibu user building with PostgreSQL, I want a concise PostgreSQL Expert skill template, so that selected agents receive practical database guidance without heavyweight DBA process.

## Context

The feature brief defines PostgreSQL Expert as a small optional skill focused on schema design, constraints, migrations, query/access-pattern awareness, PostgreSQL-specific judgment, and avoiding unnecessary indexes.

## Scope

- Add `templates/skills/postgresql-expert/SKILL.md`.
- Keep the skill concise, principle-driven, and aligned with Sibu's keep-it-simple philosophy.
- Include guidance for schema clarity, data integrity, migrations, transactions, access patterns, PostgreSQL-specific capabilities, and index restraint.
- Update `templates/manifest.json` with the new template entry and global template version bump.

## Out of Scope

- Registering the skill in the selectable catalog.
- Wiring init, list, use, or stop commands.
- Adding database introspection, SQL generation, ER diagrams, or broad DBA/performance-tuning guidance.

## Acceptance Criteria

- `templates/skills/postgresql-expert/SKILL.md` exists with frontmatter name `postgresql-expert`.
- The skill explicitly discourages unnecessary indexes and premature complexity.
- The skill includes PostgreSQL-specific guidance without becoming a full DBA guide.
- `templates/manifest.json` contains a user-facing entry for the new skill template.
- The global template version is incremented.

## Validation

- Manually inspect the skill for concise, practical guidance.
- Manually inspect `templates/manifest.json` for the new template entry and version bump.
