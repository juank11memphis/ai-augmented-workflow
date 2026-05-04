---
name: product-context-map-writer
description: Create or update docs/product-context-map.md as an architecture-agnostic map of durable product responsibility boundaries before feature brief work.
---

# Product Context Map Writer

## Purpose

Create or update `docs/product-context-map.md`, the product-level map of responsibility areas that downstream feature briefs, technical designs, and implementation plans use to decide where work belongs.

A Product Context is DDD-inspired but architecture-agnostic. It is not a folder structure, service boundary, layer, package, or requirement to use Domain-Driven Design.

This skill owns the Product Context Map only. It does not own feature briefs, technical designs, user stories, implementation plans, code structure, or architecture selection.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- Existing `docs/product-context-map.md` when revising the map.
- Enough user interview context to identify durable product responsibility boundaries, exclusions, scenarios, relationships, and cross-context rules.

### What this skill writes

- `docs/product-context-map.md`.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- The request belongs to another pipeline stage, such as feature brief, technical design, UX design, Scrum planning, implementation planning, or implementation execution.
- User answers are still too vague to defend Product Context boundaries; ask one focused question instead of drafting.

### What this skill must not do

- Do not create feature briefs, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not choose application architecture, folders, services, packages, database tables, or team ownership.
- Do not ask for or require a final confirmation summary before writing once enough context map information is available.
- Do not invent Product Contexts without grounding them in the product vision and user interview.

## What a Product Context is

A Product Context is a durable area of product responsibility: a named part of the product that owns specific user-facing behaviors, rules, decisions, promises, and language.

Use Product Contexts to answer:

```txt
When future work changes behavior, which part of the product is responsible for deciding how that behavior should work?
```

A Product Context is not:

- a feature
- a screen
- a command
- a workflow step
- a code folder
- a package, service, or database table
- a technical layer
- an org chart or team boundary

Good Product Contexts are stable product jobs that will absorb multiple features over time. They should be broad enough to own meaningful behavior and narrow enough that ownership is defensible.

Use these tests:

- If it describes a stable product job or promise, it may be a context.
- If it describes one command, page, database object, or implementation mechanism, it is probably too small or too technical.
- If it only says "user control," "quality," "security," or another value that applies everywhere, it is probably a cross-context rule instead of a context.
- If two candidates cannot explain what decisions they own differently, merge or rename them.
- If future feature work would routinely ask "does this belong here or there?", keep clarifying the boundary.

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
- Treat "enough context" as: contexts, responsibilities, exclusions, scenarios, relationships, and deep-module boundaries are clear enough to defend in the map.
- Do not ask the user to name the Product Contexts up front. Most users do not know what the contexts should be yet.
- Extract contexts by asking about product jobs, decisions, promises, lifecycle moments, and confusing boundaries.
- Teach briefly as needed. If the user seems unsure, explain Product Contexts in plain language before asking the next question.
- Do not create contexts from vague labels without confirming what they own and do not own.
- If the conversation stalls, propose one concise assumption for the next unresolved point and ask the user to confirm or correct it.

## Interview method

Derive candidate contexts from answers. Do not make the user design the map from scratch.

Prefer questions like:

- "What is the existing product/repo state before the product starts helping?"
- "What durable job is the product doing for the user at this moment?"
- "What decisions should this area own, and which decisions should it not own?"
- "What should never be silently changed or overwritten?"
- "After the first setup, what ongoing responsibilities does the product have?"
- "What user scenarios would feel like the same responsibility area over time?"
- "Where do you expect future features to create boundary confusion?"
- "Is this a separate responsibility area, or a rule that applies across all areas?"
- "If this behavior changed, what other parts of the product would need to know?"
- "What language would a product manager, designer, engineer, and agent all understand?"

Avoid questions like:

- "What contexts do you want?"
- "What bounded contexts should we use?"
- "What services/packages/modules should exist?"
- "What are your DDD boundaries?"

When a user gives a feature, command, screen, template, or technical mechanism, translate it into the product responsibility it represents and ask the user to confirm or correct that responsibility.

Example:

```txt
User: "sibu init scaffolds the AI files."
Assistant: "That sounds like an AI workflow adoption/scaffolding responsibility, not general project onboarding. It owns how an existing repo adopts Sibu-managed AI workflow files. Is that right?"
```

Ask enough follow-up to fill these fields for each context:

- Purpose
- Owns
- Does not own
- Key scenarios
- Related contexts
- Boundary notes

Also identify cross-context rules, especially product values that apply everywhere, such as user ownership, safety, transparency, local customization, or quality.

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
4. Write or update `docs/product-context-map.md` once enough context is available.

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
