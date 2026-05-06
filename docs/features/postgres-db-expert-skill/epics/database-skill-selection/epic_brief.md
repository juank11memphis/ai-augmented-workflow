# Database Skill Selection Epic Brief

## Summary

Deliver PostgreSQL Expert as the first selectable database skill in Sibu. This Epic adds the database category, makes PostgreSQL Expert selectable during init and skill management, installs the managed skill template, and preserves existing sync/doctor safety behavior.

## Source Context

- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope

- Add a database-related selectable skill category to catalog, state, target planning, and routing rendering.
- Add PostgreSQL Expert as the first database skill.
- Expose the category through `sibu init` and `sibu skills list/use/stop`.
- Add the PostgreSQL Expert skill template and manifest metadata.
- Validate build, packed runtime, and Sibu workflow health.

## Out of Scope

- Adding database introspection or connecting to a real PostgreSQL instance.
- Generating schemas, migrations, SQL, or ER diagrams automatically.
- Adding database skills beyond PostgreSQL Expert.
- Changing existing skill-selection command semantics beyond supporting the new category.
- Adding sync-time prompts that ask existing projects about database skills.

## User Stories

- [Add the PostgreSQL Expert managed template](./stories/01-add-postgresql-expert-template.md)
- [Add database skill category planning and state](./stories/02-add-database-category-planning-and-state.md)
- [Expose database skills in init and skill commands](./stories/03-expose-database-skills-in-commands.md)

## Acceptance Criteria

- `PostgreSQL Expert` exists as a managed optional skill template with concise PostgreSQL guidance.
- A database-related category appears in skill selection/list flows.
- Selecting `postgresql-expert` installs and records `.agents/skills/postgresql-expert/SKILL.md` through existing Sibu workflow mechanics.
- `AGENTS.md` routing includes PostgreSQL Expert only when selected.
- Existing sync/doctor safety guarantees remain unchanged.
- Validation from the technical design passes or any failures are documented.

## Dependencies / Risks

- Story 1 should land first so later catalog and command flows can render the referenced template.
- Story 3 depends on the category/state plumbing from Story 2.
- The category touches several function signatures; keep changes mechanical and consistent with existing selectable categories.
