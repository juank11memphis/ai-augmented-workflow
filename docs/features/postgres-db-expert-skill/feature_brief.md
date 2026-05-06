# PostgreSQL Expert Skill Feature Brief

## Summary

Add a selectable optional Sibu skill called **PostgreSQL Expert**. The skill gives AI agents concise, practical guidance for designing database schemas and working with PostgreSQL responsibly. It should help developers get better database advice without turning Sibu into a heavyweight database architecture framework.

## Product Vision Fit

Sibu helps engineers move faster with AI without lowering standards. Database changes are high-leverage and easy for AI to overcomplicate or get subtly wrong. A focused PostgreSQL skill fits Sibu’s philosophy by giving agents better judgment: keep schemas simple, make tradeoffs explicit, and avoid performative complexity such as adding indexes “just because.”

The feature supports Sibu’s skill-based flexibility: teams that use PostgreSQL can opt in, while projects that do not need database guidance stay unchanged. The database-related category starts small with PostgreSQL Expert and can later host other database skills if there is clear demand.

## Deep Module

- **Workflow Target Planning**: owns the new database-related selectable category, the PostgreSQL Expert catalog entry, and target resolution for selected database skills.
- **Template Catalog and Rendering**: owns the skill template content and manifest metadata.
- **Project Adoption**: includes PostgreSQL Expert as an optional selection under the database-related category during `sibu init`.
- **Skill Selection Management**: allows adding or stopping database-related selectable skills after initialization, starting with PostgreSQL Expert.
- **Sync Review / Workflow Health Diagnosis**: preserve expected behavior when the new selectable skill becomes available or selected.

No new Deep Module is needed; this adds a database-related category inside the existing selectable skill system.

## User / Customer Problem

AI agents often give database advice that is either too generic or too eager: unnecessary indexes, premature normalization debates, vague “best practices,” or PostgreSQL-specific suggestions without enough judgment. Developers using PostgreSQL need agent guidance that improves schema quality while respecting the project’s actual needs.

## Business Goal

Make Sibu’s optional skill catalog more useful for common backend projects while reinforcing Sibu’s quality bar: practical, maintainable, human-owned software instead of AI-generated overengineering.

## Target User / Scenario

This is for engineers and small teams building applications that use PostgreSQL. They would select the skill during `sibu init` or later via `sibu skills use` when they want AI agents to help with schema design, migrations, queries, constraints, data integrity, or PostgreSQL-specific tradeoffs.

## Proposed Experience

A user can opt into **PostgreSQL Expert** under a new database-related selectable category. Once selected, Sibu adds a skill file that teaches agents to provide grounded PostgreSQL guidance:

- prefer simple schemas that match real product needs
- model relationships and constraints clearly
- protect data integrity with appropriate keys, constraints, and transactions
- understand PostgreSQL-specific capabilities without using them unnecessarily
- add indexes only when there is a clear query/access-pattern need
- explain tradeoffs instead of defaulting to maximum complexity

The feature should feel like a pragmatic database coach, not a database platform redesign.

## MVP Scope

- Introduce a database-related selectable skill category.
- Add **PostgreSQL Expert** as the first selectable optional skill in that category.
- Provide a concise skill template focused on:
  - schema design principles
  - data integrity and constraints
  - migrations and safe evolution
  - query/access-pattern awareness
  - index judgment and avoidance of unnecessary indexes
  - PostgreSQL-specific basics and caveats
- Make the skill available through existing init and skill selection flows under a new database-related selectable category.
- Ensure doctor/sync behavior remains consistent with existing selectable skills.

## Out of Scope

- Adding database introspection or connecting to a real Postgres instance.
- Generating schemas, migrations, SQL, or ER diagrams automatically.
- Supporting every database engine.
- Creating a full DBA or performance-tuning framework.
- Adding advanced PostgreSQL content that makes the skill too large or too prescriptive.
- Changing existing skill-selection command behavior.
- Adding additional database skills beyond PostgreSQL Expert in the first version.

## Success Signals

- PostgreSQL projects can select the skill during setup or later skill management.
- The generated skill guidance is concise and easy for agents to follow.
- The skill nudges agents away from overengineering and toward explicit tradeoffs.
- Existing Sibu init, sync, doctor, and skill-management validation continues to pass.
- Reviewers can understand the addition as a small optional catalog/template expansion.

## Business-Level Acceptance Criteria

- A database-related category appears in existing selection/list flows and includes **PostgreSQL Expert**.
- **PostgreSQL Expert** appears as an optional selectable database skill with clear naming and description.
- Selecting the skill installs/records a corresponding skill file through the existing Sibu workflow.
- The skill content emphasizes simple, practical schema design and PostgreSQL-specific judgment.
- The skill explicitly discourages unnecessary indexes and premature complexity.
- Existing workflow safety guarantees remain unchanged: no silent overwrites, local edits protected, and sync choices explicit.

## Risks / Tradeoffs

- The skill could become too broad if it tries to cover all database administration topics.
- Overly strong guidance could conflict with legitimate high-scale or specialized PostgreSQL needs.
- Too much PostgreSQL-specific detail could make the skill noisy for normal application development.
- A small, principle-driven first version may omit advanced topics some users expect.
- A new category slightly increases selection complexity, so it should stay minimal and database-specific.

## Open Questions

- None currently.
