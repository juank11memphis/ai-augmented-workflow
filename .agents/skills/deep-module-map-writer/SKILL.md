---
name: deep-module-map-writer
description: Create or update docs/deep-module-map.md as a map of deep, complexity-hiding implementation modules before feature brief work.
---

# Deep Module Map Writer

## Purpose

Create or update `docs/deep-module-map.md`, a technical design map of deep implementation modules that downstream technical designs, feature briefs, and implementation plans use to decide where code work belongs.

A Deep Module is primarily a technical design concept from software architecture: a module with a small, simple interface and a larger, more complex implementation hidden behind it. In this artifact, Deep Modules may align with product responsibilities, but their depth comes from technical abstraction and complexity hiding, not from being a product category, command, folder, service, or team boundary.

This skill owns the Deep Module Map only. It does not own feature briefs, technical designs, user stories, implementation plans, production code, or the internal architecture used inside each module.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- Existing `docs/deep-module-map.md` when revising the map.
- Enough user interview context to identify candidate technical modules, the simple interface each module should expose to the rest of the app, the complexity each module should hide, boundaries, scenarios, relationships, and cross-module rules.

### What this skill writes

- `docs/deep-module-map.md`.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- The request belongs to another pipeline stage, such as feature brief, technical design, UX design, Scrum planning, implementation planning, or implementation execution.
- User answers are still too vague to defend module depth, interfaces, hidden complexity, or boundaries; ask one focused question instead of drafting.

### What this skill must not do

- Do not create feature briefs, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not choose a specific internal architecture, service split, database model, framework, or team ownership structure.
- Do not ask for or require a final confirmation summary before writing once enough Deep Module Map information is available.
- Do not invent Deep Modules without grounding them in the product vision, current system behavior, and user interview.
- Do not treat a command, screen, helper, folder, data object, or technical layer as a Deep Module merely because it exists.

## What a Deep Module is

A Deep Module is a module whose interface is much simpler than its implementation.

Use this mental model:

```txt
Deep Module = small/simple interface + substantial hidden implementation complexity
Shallow Module = interface nearly as complex as the implementation it hides
```

A module can be a function, class, package, subsystem, CLI workflow, or top-level code area. Size alone does not make a module deep. A large module can be shallow if callers must understand many details to use it, and a small module can be deep if it creates useful semantic distance between caller intent and implementation details.

For this map, identify deep modules that are useful as durable technical implementation boundaries. Product responsibilities can help discover them, but the module is only valid if it hides meaningful technical complexity behind a simpler interface. A good entry should answer:

```txt
What simple capability should the rest of the app be able to rely on, and what messy details should be hidden behind that capability?
```

A Deep Module is not automatically:

- a one-off feature
- a screen
- a command
- a workflow step
- a generic technical bucket such as `utils`, `api`, `db`, `shared`, or `services`
- a technical layer
- a required DDD Bounded Context
- a required service, package, database, or team boundary

Good Deep Modules:

- expose a small, stable interface to callers or neighboring modules
- hide complex decisions, orchestration, data handling, validation, or edge cases
- reduce how much other code must know
- have clear semantic distance between the module name/interface and the internal work it performs
- are stable enough to absorb related changes over time
- are broad enough to own meaningful behavior and narrow enough that boundaries are defensible

Use these tests:

- If callers can say what they want without knowing how it is done, the module may be deep.
- If the module hides several details that would otherwise leak into many callers, it may be deep.
- If using the module requires understanding almost the same steps as implementing it, it is probably shallow.
- If it only renames one obvious operation, it is probably shallow unless the name adds important semantic meaning for callers.
- If it describes one command, page, database object, helper folder, or implementation mechanism, it is probably too small or too technical for this map.
- If it only says "user control," "quality," "security," or another value that applies everywhere, it is probably a cross-module rule instead of a module.
- If two candidates cannot explain what interface and hidden complexity they own differently, merge or rename them.
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
- Ask as many one-at-a-time questions as needed to understand the app well enough to defend the map.
- Do not rush to draft after a single answer unless the answer already makes interfaces, hidden complexity, boundaries, scenarios, and relationships clear.
- Treat "enough context" as: candidate modules, suggested slugs, simple external interfaces, hidden implementation complexity, responsibilities, exclusions, scenarios, relationships, and cross-module rules are clear enough to defend.
- Do not ask the user to name the Deep Modules up front. Most users do not know what the modules should be yet.
- Extract modules by asking about caller intent, complexity that should be hidden, product jobs, decisions, promises, lifecycle moments, confusing boundaries, and where code should stay coherent over time.
- Teach briefly as needed. If the user seems unsure, explain that a Deep Module hides a lot of implementation behind a simple interface, then ask the next question.
- Do not create modules from vague labels without confirming what interface they expose and what complexity they hide.
- If the conversation stalls, propose one concise assumption for the next unresolved point and ask the user to confirm or correct it.

## Interview method

Derive candidate modules from answers. Do not make the user design the map from scratch.

Prefer questions like:

- "What should the rest of the app be able to ask this area to do in one simple phrase?"
- "What messy details should callers not need to know?"
- "If this were a good abstraction, what would its small public interface look like conceptually?"
- "What steps, checks, edge cases, or policies would be hidden behind that interface?"
- "Where are callers currently forced to know too much?"
- "What behavior changes for the same product reason and should stay together?"
- "What decisions should this module own, and which decisions should it not own?"
- "Where do you expect future implementation work to create boundary confusion?"
- "Is this a deep module, or is it just a command/helper/folder that exposes nearly as much complexity as it hides?"
- "If this behavior changed, what other modules would need to know?"
- "What module slug would be clear in code without forcing a specific architecture?"

Avoid questions like:

- "What bounded contexts should we use?"
- "What services should exist?"
- "What database boundaries should exist?"
- "What layers should this module have?"
- "What framework structure do you want?"

When a user gives a feature, command, screen, template, or technical mechanism, translate it into the possible deep abstraction it suggests and ask the user to confirm or correct the interface and hidden complexity.

Example:

```txt
User: "sibu doctor checks for drift."
Assistant: "That sounds like it may belong to a workflow health module. Its simple interface could be 'check workflow health,' while it hides state loading, manifest comparison, file hashing, missing-file detection, and update advice. Is that the right abstraction, or does it leak too much into sync/adoption?"
```

Ask enough follow-up to fill these fields for each module:

- Module name
- Suggested module slug
- Simple interface / outside promise
- Hidden complexity
- Owns
- Does not own
- Key scenarios
- Related modules
- Boundary notes

Also identify cross-module rules, especially values and policies that apply everywhere, such as user ownership, safety, transparency, local customization, quality, validation, and read-only vs mutating behavior.

## Deep Module principles

Deep Modules should be:

- complexity-hiding abstractions with simple external interfaces
- deep enough that callers do not need to understand internal orchestration, edge cases, or policies
- technical design boundaries first, with product alignment used only where it helps explain why code changes together
- durable enough to absorb related technical and product changes over time
- named in language useful across technical design, implementation planning, feature briefs, and code organization
- flexible internally so different projects can use layered, DDD, Hexagonal, command-oriented, MVC, functional, or other architectures inside them

Avoid shallow modules based on one feature, screen, command, workflow step, database table, generic helper folder, technical layer, or thin wrapper around an obvious operation.

## Workflow

1. Read `docs/product-vision.md`.
2. Read existing `docs/deep-module-map.md` if it exists.
3. Ask one focused question at a time until the module direction is clear.
4. Keep asking focused follow-up questions until the simple interface and hidden complexity of each candidate module are defensible.
5. Write or update `docs/deep-module-map.md` once enough context is available.

## Recommended map structure

```md
# Deep Module Map

## Purpose
<How this map guides technical design, feature briefs, and implementation boundaries.>

## Modules

### <Module Name>
- Suggested module slug:
- Simple interface / outside promise:
- Hidden complexity:
- Owns:
- Does not own:
- Key scenarios:
- Related modules:
- Boundary notes:

## Cross-Module Rules
- <Rules for work that spans modules or needs a new module.>
```

Adapt the structure when useful, but keep the map concise and module-focused. Do not omit the simple interface/outside promise or hidden complexity fields unless the user explicitly asks for another format.

## Final response behavior

After writing the file, final-answer with only the path created or updated:

```txt
docs/deep-module-map.md
```

Do not paste the map body, excerpt, outline, or section summaries unless the user explicitly asks for inline review in the current request.
