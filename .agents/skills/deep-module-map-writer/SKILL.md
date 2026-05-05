---
name: deep-module-map-writer
description: Create or update docs/deep-module-map.md as an architecture-agnostic map of product-aligned implementation modules before feature brief work.
---

# Deep Module Map Writer

## Purpose

Create or update `docs/deep-module-map.md`, the product-aligned map of durable implementation modules that downstream feature briefs, technical designs, and implementation plans use to decide where code work belongs.

A Deep Module is architecture-agnostic. It is a suggested top-level implementation module, not a requirement to use Domain-Driven Design, Hexagonal Architecture, microservices, package-per-module, database-per-module, or team ownership.

This skill owns the Deep Module Map only. It does not own feature briefs, technical designs, user stories, implementation plans, production code, or the internal architecture used inside each module.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- Existing `docs/deep-module-map.md` when revising the map.
- Enough user interview context to identify durable product-aligned implementation modules, exclusions, scenarios, relationships, and cross-module rules.

### What this skill writes

- `docs/deep-module-map.md`.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- The request belongs to another pipeline stage, such as feature brief, technical design, UX design, Scrum planning, implementation planning, or implementation execution.
- User answers are still too vague to defend Deep Module boundaries; ask one focused question instead of drafting.

### What this skill must not do

- Do not create feature briefs, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not choose a specific internal architecture, service split, database model, framework, or team ownership structure.
- Do not ask for or require a final confirmation summary before writing once enough Deep Module Map information is available.
- Do not invent Deep Modules without grounding them in the product vision and user interview.

## What a Deep Module is

A Deep Module is a durable, product-aligned implementation module: a named part of the app that should usually become or remain a top-level code organization boundary because it owns a coherent product responsibility.

Use Deep Modules to answer:

```txt
What top-level implementation modules should this app have, and what product responsibility does each module own?
```

A Deep Module is not:

- a one-off feature
- a screen
- a command
- a workflow step
- a generic technical bucket such as `utils`, `api`, `db`, or `services`
- a technical layer
- a required DDD Bounded Context
- a required service, package, database, or team boundary

Good Deep Modules are stable product jobs that can absorb multiple features over time. They should be broad enough to own meaningful behavior and narrow enough that module ownership is defensible.

Use these tests:

- If it describes a stable product job or promise that will shape code organization, it may be a Deep Module.
- If it describes one command, page, database object, helper folder, or implementation mechanism, it is probably too small or too technical.
- If it only says "user control," "quality," "security," or another value that applies everywhere, it is probably a cross-module rule instead of a module.
- If two candidates cannot explain what implementation decisions they own differently, merge or rename them.
- If future feature work would routinely ask "does this code belong here or there?", keep clarifying the boundary.

## Required source of truth

Before doing any Deep Module Map work, read:

```txt
docs/product-vision.md
```

Use the product vision as the source of truth for purpose, audience, positioning, principles, boundaries, trust expectations, and success signals.

## Hard start rule

Do not create or update a Deep Module Map if `docs/product-vision.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a Deep Module Map requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with `product-vision-writer`.
4. Do not draft, infer, or save a module map until the product vision exists.

## Output location

Write the map to:

```txt
docs/deep-module-map.md
```

This file is user-owned product and implementation-boundary content created or updated by this skill. It is not a Sibu-managed workflow template.

## Interview posture

Be deliberately interrogative before writing.

- Ask one focused question at a time.
- Keep asking until you understand the app's major durable modules, boundaries, key scenarios, relationships, and naming.
- Treat "100% understanding" as: modules, suggested slugs, responsibilities, exclusions, scenarios, relationships, and cross-module boundaries are clear enough to defend.
- Treat "enough context" as: modules, suggested slugs, responsibilities, exclusions, scenarios, relationships, and cross-module boundaries are clear enough to defend in the map.
- Do not ask the user to name the Deep Modules up front. Most users do not know what the modules should be yet.
- Extract modules by asking about product jobs, decisions, promises, lifecycle moments, confusing boundaries, and where code should stay coherent over time.
- Teach briefly as needed. If the user seems unsure, explain Deep Modules in plain language before asking the next question.
- Do not create modules from vague labels without confirming what they own and do not own.
- If the conversation stalls, propose one concise assumption for the next unresolved point and ask the user to confirm or correct it.

## Interview method

Derive candidate modules from answers. Do not make the user design the map from scratch.

Prefer questions like:

- "What durable job is the app doing for the user at this moment?"
- "What code or behavior should stay together because it changes for the same product reasons?"
- "What decisions should this module own, and which decisions should it not own?"
- "What future features would you expect this module to absorb?"
- "Where do you expect future implementation work to create boundary confusion?"
- "Is this a durable product-aligned module, or a technical helper that belongs inside another module?"
- "If this behavior changed, what other modules would need to know?"
- "What module slug would be clear in code without forcing a specific architecture?"

Avoid questions like:

- "What bounded contexts should we use?"
- "What services should exist?"
- "What database boundaries should exist?"
- "What layers should this module have?"
- "What framework structure do you want?"

When a user gives a feature, command, screen, template, or technical mechanism, translate it into the durable product-aligned module it suggests and ask the user to confirm or correct that module boundary.

Example:

```txt
User: "sibu init scaffolds the AI files."
Assistant: "That sounds like a workflow adoption module: the part of the app that owns how an existing repo adopts Sibu-managed AI workflow files. Is that the durable module boundary you want?"
```

Ask enough follow-up to fill these fields for each module:

- Module name
- Suggested module slug
- Purpose
- Owns
- Does not own
- Key scenarios
- Related modules
- Boundary notes

Also identify cross-module rules, especially product values that apply everywhere, such as user ownership, safety, transparency, local customization, or quality.

## Deep Module principles

Deep Modules should be:

- product-aligned implementation boundaries
- suggested top-level modules for organizing code
- deep enough to be simple from the outside while owning meaningful behavior inside
- durable enough to guide multiple features over time
- named in language useful across product planning, technical design, implementation planning, and code organization
- flexible internally so different projects can use layered, DDD, Hexagonal, command-oriented, MVC, or other architectures inside them

Avoid shallow modules based on one feature, screen, command, workflow step, database table, generic helper folder, or technical layer.

## Workflow

1. Read `docs/product-vision.md`.
2. Read existing `docs/deep-module-map.md` if it exists.
3. Ask one focused question at a time until the module direction is clear.
4. Write or update `docs/deep-module-map.md` once enough context is available.

## Recommended map structure

```md
# Deep Module Map

## Purpose
<How this map guides feature briefs, technical design, and implementation boundaries.>

## Modules

### <Module Name>
- Suggested module slug:
- Purpose:
- Owns:
- Does not own:
- Key scenarios:
- Related modules:
- Boundary notes:

## Cross-Module Rules
- <Rules for work that spans modules or needs a new module.>
```

Adapt the structure when useful, but keep the map concise and module-focused.

## Final response behavior

After writing the file, final-answer with only the path created or updated:

```txt
docs/deep-module-map.md
```

Do not paste the map body, excerpt, outline, or section summaries unless the user explicitly asks for inline review in the current request.
