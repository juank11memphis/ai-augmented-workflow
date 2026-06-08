---
name: deep-module-map-writer
description: Create or update docs/deep-module-map.md as a map of deep, complexity-hiding implementation modules before feature brief work.
---

# Deep Module Map Writer

## Purpose

Create or update `docs/deep-module-map.md`, a technical design map of deep implementation modules that downstream technical designs, feature briefs, and implementation plans use to decide where code work belongs.

A Deep Module is primarily a technical design concept from software architecture: a module with a small, simple interface and a larger, more complex implementation hidden behind it. In this artifact, Deep Modules are derived from product purpose plus reviewed domain understanding: domain concepts, relationships, lifecycles, business rules, workflows, domain events, boundaries, and hard parts. Their depth comes from technical abstraction and complexity hiding, not from being a product category, command, folder, service, or team boundary.

This skill owns the Deep Module Map only. It does not own feature briefs, technical designs, user stories, implementation plans, production code, or the internal architecture used inside each module.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- `docs/business-domain-model.md`.
- Existing `docs/deep-module-map.md` when revising the map.
- Enough user interview context to identify candidate technical modules, the simple interface each module should expose to the rest of the app, the complexity each module should hide, boundaries, scenarios, relationships, and cross-module rules from the Product Vision and Business Domain Model.

### What this skill writes

- `docs/deep-module-map.md`.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- `docs/business-domain-model.md` is missing; tell the user to create it first with `business-domain-model-writer`.
- The request belongs to another pipeline stage, such as feature brief, technical design, UX design, Scrum planning, implementation planning, or implementation execution.
- User answers are still too vague to defend module depth, interfaces, hidden complexity, or boundaries; ask one focused question instead of drafting.

### What this skill must not do

- Do not create feature briefs, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not choose a specific internal architecture, service split, database model, framework, or team ownership structure.
- Do not skip the interview or the final “I am clear; are you good?” check-in before writing. Once the user confirms there is nothing else to cover, write without requiring a recap, artifact approval, or separate summary confirmation.
- Do not invent Deep Modules without grounding them in the product vision, Business Domain Model, and user interview.
- Do not inspect implementation code by default when creating or substantially revising the map.
- Do not use existing code, folders, commands, screens, services, data objects, or technical layers as the source of truth for module boundaries.
- Do not treat a command, screen, helper, folder, data object, or technical layer as a Deep Module merely because it exists.
- Do not leave material module-boundary questions unresolved in the final map; keep interviewing until the user answers, confirms an assumption, or explicitly excludes the boundary.

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
docs/business-domain-model.md
```

Use the product vision as the source of truth for purpose, audience, positioning, principles, boundaries, trust expectations, and success signals.

Use the Business Domain Model as the source of truth for business language, domain concepts, relationships, lifecycles, business rules, workflows, domain events, boundaries, and hard parts.

Read existing `docs/deep-module-map.md` only when revising the map. An existing map can provide continuity and change context, but it never replaces the required Product Vision and Business Domain Model.

Do not inspect implementation code by default. Existing code, folders, commands, screens, services, data objects, and technical layers are not the default source of truth for module boundaries. If the user explicitly asks for a code-alignment check, inspect code only after domain-driven module boundaries are drafted, and use that inspection only to identify alignment gaps, migration implications, and places where current code may not match the domain-driven map. Code alignment must not replace or override the Product Vision and Business Domain Model source requirements.

## Hard start rule

Do not create or update a Deep Module Map if `docs/product-vision.md` or `docs/business-domain-model.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a Deep Module Map requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with `product-vision-writer`.
4. Do not draft, infer, or save a module map until the product vision exists.

If the Business Domain Model is missing:

1. Stop.
2. Tell the user that a Deep Module Map requires `docs/business-domain-model.md`.
3. Instruct the user to create the Business Domain Model first with `business-domain-model-writer`.
4. Do not draft, infer, or save a module map until the Business Domain Model exists.

## Output location

Write the map to:

```txt
docs/deep-module-map.md
```

This file is user-owned product and implementation-boundary content created or updated by this skill. It is not a Sibu-managed workflow template.

## Interview posture

Be deliberately interrogative before writing.

This interview is mandatory and non-skippable. Even when the repository has substantial code, existing docs, an existing map, or extensive initial context, ask at least one explicit user-facing discovery question before drafting or writing the Deep Module Map. Treat the Product Vision and Business Domain Model as the primary source context; prior conversation and initial context can shape better questions, but they must not replace the interview. Implementation code is not inspected by default and must not become the source of truth for module boundaries, interfaces, hidden complexity, or ownership. Keep asking focused follow-up questions until the module decisions are clear enough to defend. Before drafting, always perform one final check-in in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing.

- Ask one focused question at a time.
- Ask as many one-at-a-time questions as needed to understand the app well enough to defend the map; do not optimize for a short interview.
- Walk down each module-boundary decision branch one by one, resolving dependencies between candidate modules before drafting.
- When useful, provide your recommended answer or a concise default assumption with the question so the user can confirm, correct, or reject it quickly.
- If a question can be answered by reading the Product Vision, Business Domain Model, or existing Deep Module Map during revision, inspect those artifacts instead of asking. Do not inspect implementation code unless the user explicitly requested a later code-alignment check after domain-driven boundaries are drafted.
- Do not rush to draft after a single answer unless the answer already makes interfaces, hidden complexity, boundaries, scenarios, and relationships clear.
- Treat "enough context" as: candidate modules, suggested slugs, simple external interfaces, hidden implementation complexity, responsibilities, exclusions, scenarios, relationships, and cross-module rules are clear enough to defend.
- Do not ask the user to name the Deep Modules up front. Most users do not know what the modules should be yet.
- Extract modules by asking about caller intent, complexity that should be hidden, product jobs, domain concepts, relationships, lifecycles, business rules, workflows, domain events, boundaries, hard parts, decisions, promises, lifecycle moments, confusing boundaries, and where code should stay coherent over time.
- Teach briefly as needed. If the user seems unsure, explain that a Deep Module hides a lot of implementation behind a simple interface, then ask the next question.
- Do not create modules from vague labels without confirming what interface they expose and what complexity they hide.
- If the conversation stalls, propose one concise assumption for the next unresolved point and ask the user to confirm or correct it.
- Draft only when there are no material open questions about interfaces, hidden complexity, ownership, exclusions, relationships, or cross-module rules.

## Clarify module intent before drafting

Do not draft a Deep Module Map from a vague product idea, feature label, command name, screen, folder, or implementation mechanism alone. The map must reflect the user's actual system responsibilities and the complexity boundaries that should stay stable over time.

A request is too vague when the user gives only a broad area such as "onboarding," "analytics," "sync," "workflow," "AI features," "the CLI," or "the database" without enough detail to know what capability the rest of the system should rely on or what implementation complexity should be hidden.

When module intent is vague or incomplete:

1. Stop before drafting.
2. Explain briefly that a responsible Deep Module Map requires more boundary context.
3. Ask one focused discovery question.
4. Wait for the user's answer.
5. Continue asking one question at a time until there is enough context to defend the map.
6. Draft only after the module candidates, interfaces, hidden complexity, ownership, exclusions, scenarios, relationships, and cross-module rules are clear enough to avoid invention.

Do not ask the user to answer a large questionnaire all at once. Keep the interview conversational and focused.

## Gather the minimum required module context

Ask every question needed to remove material ambiguity, but only one at a time. Clarify:

- what product or system capabilities the map must support
- which Business Domain Model concepts, relationships, lifecycles, business rules, workflows, domain events, boundaries, or hard parts should drive module discovery
- what the rest of the app should be able to ask each area to do
- what messy details callers should not need to know
- which decisions or policies should change together
- which responsibilities each candidate module owns
- which responsibilities each candidate module explicitly does not own
- key scenarios that prove the module boundary is useful
- relationships and dependencies between candidate modules
- cross-module rules such as user ownership, safety, validation, local customization, or read-only vs mutating behavior
- where future implementation work is likely to create boundary confusion

Treat "enough context" as: candidate modules, suggested slugs, simple external interfaces, hidden implementation complexity, responsibilities, exclusions, scenarios, relationships, and cross-module rules are all clear enough to defend. Do not draft a map with an `Open Questions` section. Resolve material questions during the interview, or record only known risks/tradeoffs after decisions are made.

If the conversation stalls, offer one concise default assumption for the next unresolved boundary and ask the user to confirm, correct, or reject it before proceeding.

## Interview method

Derive candidate modules from answers. Do not make the user design the map from scratch.

Prefer questions like:

- "What should the rest of the app be able to ask this area to do in one simple phrase?"
- "What messy details should callers not need to know?"
- "Which domain concept, rule, lifecycle, workflow, event, boundary, or hard part makes this candidate module important?"
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
- technical design boundaries first, derived from product purpose and reviewed domain understanding rather than accidental implementation structure
- durable enough to absorb related technical and product changes over time
- named in language useful across technical design, implementation planning, feature briefs, and code organization
- flexible internally so different projects can use layered, DDD, Hexagonal, command-oriented, MVC, functional, or other architectures inside them

Avoid shallow modules based on one feature, screen, command, workflow step, database table, generic helper folder, technical layer, or thin wrapper around an obvious operation.

## Workflow

1. Read `docs/product-vision.md`.
2. Read `docs/business-domain-model.md`.
3. Read existing `docs/deep-module-map.md` only if revising the map.
4. Draft domain-driven module boundaries from product purpose plus domain concepts, relationships, lifecycles, business rules, workflows, domain events, boundaries, and hard parts.
5. Ask one focused question at a time until the module direction is clear.
6. Keep asking focused follow-up questions until the simple interface and hidden complexity of each candidate module are defensible.
7. If the user explicitly requested code alignment, inspect implementation code only after domain-driven boundaries are drafted and only to identify alignment gaps or migration implications.
8. Write or update `docs/deep-module-map.md` once enough context is available.

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
