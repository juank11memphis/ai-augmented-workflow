---
name: business-domain-model-writer
description: Create or update docs/business-domain-model.md from Product Vision plus example-first user interview, capturing business language, concepts, rules, lifecycles, workflows, events, boundaries, and hard parts before Deep Module Map or Feature Brief work.
---

# Business Domain Model Writer

## Purpose

Create or update `docs/business-domain-model.md`, a project-owned Business Domain Model that captures the product's business language and rules before downstream planning starts.

This skill owns the Business Domain Model only. It does not own Product Vision, Deep Module Maps, feature briefs, UX specs, technical designs, Epics, User Stories, implementation plans, production code, or Sibu template changes.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- Existing `docs/business-domain-model.md` when revising the model.
- User interview answers grounded in concrete examples, scenarios, business workflows, rules, states, events, and confusing boundaries.

### What this skill writes

- `docs/business-domain-model.md`.

This is generated project-owned content. It is not a Sibu-managed workflow template.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- The request belongs to another pipeline stage, such as Product Vision, Deep Module Map, feature brief, UX design, technical design, Scrum planning, implementation planning, or implementation execution.
- User answers are still too vague to defend the domain language, concepts, relationships, rules, lifecycles, workflows, events, boundaries, or hard parts; ask one focused question instead of drafting.

### What this skill must not do

- Do not create Product Vision, Deep Module Maps, feature briefs, UX specs, technical designs, Epics, User Stories, implementation plans, or production code.
- Do not inspect implementation code or derive domain truth from existing architecture, folder names, database tables, commands, screens, or APIs by default.
- Do not use existing implementation code as the source of truth for business concepts, rules, or boundaries.
- Do not skip the interview or the final “I am clear; are you good?” check-in before writing.
- Do not write any file except `docs/business-domain-model.md` unless the user explicitly asks for a different path for this same artifact.

## Required source of truth

Before doing any Business Domain Model work, read:

```txt
docs/product-vision.md
```

Use Product Vision as the source of truth for product purpose, target user, positioning, product principles, boundaries, voice, trust expectations, and success signals.

The Business Domain Model source of truth is Product Vision plus the user's interview answers. Repository code may be inspected only when the user explicitly requests a later code-alignment check, and only after the domain model has been drafted from Product Vision and interview context.

## Hard start rule

Do not create or update a Business Domain Model if `docs/product-vision.md` is missing.

If Product Vision is missing:

1. Stop.
2. Tell the user that a Business Domain Model requires `docs/product-vision.md`.
3. Instruct the user to create Product Vision first with `product-vision-writer`.
4. Do not draft, infer, or save a Business Domain Model until Product Vision exists.

## No-code-inspection boundary

For initial creation and substantial revisions, do not inspect implementation code by default. Do not reverse-engineer the domain model from:

- current architecture
- folders or packages
- database schemas
- command names
- UI screens
- APIs
- tests
- helper names

Those artifacts can reflect accidental implementation structure, stale terminology, or technical shortcuts. They are not business-domain truth.

If the user explicitly requests a code-alignment check, first draft the Business Domain Model from Product Vision and interview answers. Then inspect code narrowly to identify terminology or migration implications, not to redefine the domain model around current implementation.

## Interview posture

Be deliberately interrogative before writing. Ask one focused question at a time.

This interview is mandatory and non-skippable. Even when the user provides extensive initial context, existing docs, or a mature codebase, ask at least one explicit user-facing discovery question before drafting or writing the Business Domain Model.

Prefer example-first and scenario-first discovery before asking for abstract glossary terms. Ask about real situations, user/business decisions, state changes, rules, exceptions, and moments where language matters. Derive candidate concepts and vocabulary from those examples, then confirm them with the user.

Before drafting, always perform one final check-in in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing. Once the user confirms there is nothing else to cover, write without requiring a separate artifact approval step.

Use questions like:

- "Can you walk me through one real example of this product creating value for a user?"
- "What business object changes state in that scenario, and what names would your users naturally use for it?"
- "What rule must always be true, even if the implementation changes?"
- "What exceptions or edge cases create business consequences rather than only technical errors?"
- "What events would matter to the business or user if they happened?"
- "Where do people currently use inconsistent names for the same concept?"
- "Which concepts are external to this product, even if the product integrates with them?"
- "What part of the domain feels hardest to explain to a new teammate?"

Avoid starting with:

- "What entities should exist?"
- "What bounded contexts should we use?"
- "What database tables should model this?"
- "What services or modules should own this?"
- "How is the code structured today?"

## Gather the required domain context

Keep asking one focused question at a time until the following are clear enough to defend:

- domain purpose
- user-facing and business vocabulary
- core business concepts
- relationships between concepts
- states and lifecycles
- business rules and invariants
- user and business workflows
- domain events
- external concepts and boundaries
- open tensions, tradeoffs, and hard parts

Do not draft with material unresolved domain questions. If the conversation stalls, offer one concise assumption for the next unresolved point and ask the user to confirm, correct, or reject it.

## Document shape

Write `docs/business-domain-model.md` in Markdown using these sections:

```markdown
# Business Domain Model

## Domain Purpose

## Ubiquitous Language

## Core Domain Concepts

## Concept Relationships

## States and Lifecycles

## Business Rules and Invariants

## User / Business Workflows

## Domain Events

## Boundaries and External Concepts

## Open Tensions / Hard Parts
```

Keep the document as concise as the product allows. Simple projects may have short sections, but every section should contain useful domain guidance or explicitly state the current known absence of that concern.

## Writing guidance

- Use the user's natural business language when it is clear and consistent.
- Prefer concrete definitions, examples, and rules over generic taxonomy.
- Name concepts for business meaning, not implementation shape.
- Separate business rules from technical validation details.
- Mark external concepts as external even when the product stores references to them.
- Capture hard parts honestly so downstream planning does not smooth over important ambiguity.
- Avoid turning the document into an implementation design, database model, or module map.

## Save the document

When working in a repository, write the Business Domain Model to:

```txt
docs/business-domain-model.md
```

Create the `docs/` directory if needed.

If `docs/business-domain-model.md` already exists, read it before revising. Treat the request as a revision when the user asks to revise, clarify, or update the Business Domain Model.

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the document body, excerpt, outline, or section summaries.

Only include the full document when the user explicitly asks for inline review in the current request. If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/business-domain-model.md`.
