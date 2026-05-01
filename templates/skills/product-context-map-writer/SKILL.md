---
name: product-context-map-writer
description: Create or update docs/product-context-map.md as an architecture-agnostic map of durable product responsibility boundaries before feature brief work.
---

# Product Context Map Writer

## Purpose

Create or update `docs/product-context-map.md`, the product-level map of responsibility areas that downstream feature briefs, technical designs, and implementation plans use to decide where work belongs.

A Product Context is DDD-inspired but architecture-agnostic. It is not a folder structure, service boundary, layer, package, or requirement to use Domain-Driven Design.

This skill owns the Product Context Map only. It does not own feature briefs, technical designs, user stories, implementation plans, code structure, or architecture selection.

## Required source of truth

Before doing any Product Context Map work, read:

```txt
docs/product-vision.md
```

Use the product vision as the source of truth for purpose, audience, positioning, principles, boundaries, trust expectations, and success signals.

## Hard start rule

Do not create or update a Product Context Map if `docs/product-vision.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a Product Context Map requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with `product-vision-writer`.
4. Do not draft, infer, or save a context map until the product vision exists.

## Output location

Write the map to:

```txt
docs/product-context-map.md
```

This file is user-owned product content created or updated by this skill. It is not a Sibu-managed workflow template.

## Interview posture

Be deliberately interrogative before writing.

- Ask one focused question at a time.
- Keep asking until you understand the product's major responsibility areas, boundaries, key scenarios, relationships, and naming.
- Treat "100% understanding" as: contexts, responsibilities, exclusions, scenarios, relationships, and deep-module boundaries are clear enough to defend.
- Treat "100% alignment" as: the user has confirmed your concise understanding before the map is written or revised.
- Do not create contexts from vague labels without confirming what they own and do not own.
- If the conversation stalls, propose one concise assumption for the next unresolved point and ask the user to confirm or correct it.

## Context principles

Product Contexts should be:

- product responsibility boundaries, not implementation details
- deep modules: simple from the outside, rich enough inside to own meaningful behavior
- durable enough to guide multiple features over time
- named in language useful across product planning, technical design, implementation planning, and code organization

Avoid shallow contexts based on one feature, screen, command, workflow step, database table, folder, or technical layer.

## Workflow

1. Read `docs/product-vision.md`.
2. Read existing `docs/product-context-map.md` if it exists.
3. Ask one focused question at a time until the context direction is clear.
4. Summarize the proposed map or revision and ask the user to confirm or correct it.
5. Write or update `docs/product-context-map.md` only after alignment.

## Recommended map structure

```md
# Product Context Map

## Purpose
<How this map guides feature briefs, technical design, and implementation.>

## Contexts

### <Context Name>
- Purpose:
- Owns:
- Does not own:
- Key scenarios:
- Related contexts:
- Boundary notes:

## Cross-Context Rules
- <Rules for when work spans contexts or needs a new context.>
```

Adapt the structure when useful, but keep the map concise and product-level.

## Final response behavior

After writing the file, final-answer with only the path created or updated:

```txt
docs/product-context-map.md
```

Do not paste the map body, excerpt, outline, or section summaries unless the user explicitly asks for inline review in the current request.
