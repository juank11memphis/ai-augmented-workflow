---
name: postgresql-expert
description: Use this skill for PostgreSQL schema design, migrations, constraints, queries, indexing, and database tradeoffs when practical database judgment is needed.
---

# PostgreSQL Expert

Use this skill when working with PostgreSQL database design or database-facing application changes.

Apply this skill together with `clean-code`. Keep the guidance practical: prefer the simplest database design that protects data integrity and supports the application's real access patterns.

## Use this skill for

- designing or reviewing PostgreSQL schemas
- planning migrations and safe schema evolution
- choosing keys, constraints, relationships, and transactions
- reasoning about queries, access patterns, and indexes
- deciding whether PostgreSQL-specific features are worth using
- reviewing database-related tradeoffs in application code

## Core principles

### 1. Start with the product model
- Model the real domain concepts, not speculative future reporting or scaling needs.
- Prefer clear table and column names that match product language.
- Keep schemas boring until the product needs something more specialized.
- Do not add tables, abstractions, or generic metadata columns just in case.

### 2. Protect data integrity in the database
- Use primary keys, foreign keys, `NOT NULL`, `UNIQUE`, and `CHECK` constraints when they express real invariants.
- Prefer database-enforced integrity over relying only on application checks for durable rules.
- Make deletion behavior explicit with appropriate foreign-key actions.
- Use transactions when a change must succeed or fail as one unit.

### 3. Evolve schemas safely
- Treat migrations as production changes that need clear rollback or recovery thinking.
- Prefer small, reversible migration steps for risky changes.
- Avoid destructive changes until data has been backfilled, verified, and callers have moved over.
- Consider lock behavior and table size before changing large production tables.

### 4. Design from access patterns, not guesses
- Understand the queries the application actually needs before optimizing.
- Keep common reads and writes straightforward before introducing denormalization.
- Use normalization for clarity and integrity; denormalize only for a measured or well-understood reason.
- Explain tradeoffs when choosing between simpler schema shape and query convenience.

### 5. Add indexes only when justified
- Do not add indexes just because a column is used, foreign-keyed, or might be queried someday.
- Add an index when there is a clear query, filtering, joining, sorting, uniqueness, or constraint need.
- Remember that indexes speed some reads but add write cost, storage cost, and maintenance overhead.
- Prefer a small number of purposeful indexes over broad defensive indexing.

### 6. Use PostgreSQL features with restraint
- Consider PostgreSQL capabilities such as JSONB, arrays, partial indexes, generated columns, enums, extensions, and full-text search when they simplify a real requirement.
- Do not use PostgreSQL-specific features to appear sophisticated when standard relational modeling is clearer.
- Be explicit about portability tradeoffs when choosing PostgreSQL-specific behavior.
- Prefer built-in PostgreSQL capabilities before adding extra infrastructure.

### 7. Keep database advice actionable
- Tie recommendations to the schema, query, migration, or invariant at hand.
- Say what evidence would change the recommendation, such as query plans, row counts, write volume, or latency targets.
- When context is missing, ask for the relevant schema, migration, query, or access pattern instead of guessing.
- Avoid broad DBA checklists unless the task is explicitly about operations or performance investigation.

## Decision rule

When unsure, prefer:
1. simple schema design that matches current product needs
2. explicit database constraints for real invariants
3. safe, incremental migrations
4. query-aware design over speculative optimization
5. purposeful indexes over blanket indexing
