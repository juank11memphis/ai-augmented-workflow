---
name: feature-brief-writer
description: Use this skill to define business-level feature briefs that stay loyal to docs/product-vision.md before UX, technical design, or implementation work.
---

# Feature Brief Writer

## Purpose

Create concise feature briefs that explain what a feature is, why it matters, who it serves, and how it follows the product vision required by this skill.

Every feature shaped with this skill must stay loyal to `docs/product-vision.md`: it should support the product's purpose, fit its intended audience, respect its boundaries, and move in the same direction as its success signals.

This skill owns the product/business shape of a feature. It does not own UI interaction design, technical architecture, implementation plans, data models, APIs, or task breakdowns.

## Required source of truth

Before doing any feature-brief work, read:

```txt
docs/product-vision.md
```

Use the product vision as the source of truth for the product's purpose, audience, positioning, principles, voice, boundaries, trust expectations, and success signals.

Do not duplicate or rewrite the product vision inside the feature brief. Apply it to the specific feature being defined.

## Hard start rule

Do not start a feature brief if `docs/product-vision.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with the `product-vision-writer` skill.
4. Do not draft, infer, or save a feature brief until the product vision exists.

## Use this skill for

- defining a new feature at the business/product level
- turning a rough feature idea into a scoped feature brief
- clarifying user value, product fit, and business rationale
- deciding MVP vs later scope at a product level
- identifying non-technical risks, assumptions, dependencies, and tradeoffs
- defining business-level acceptance criteria
- checking whether a feature fits the product vision

## Output location

When asked to create a file, write the feature brief to:

```txt
docs/features/<feature-slug>/feature_brief.md
```

Use a short kebab-case feature slug that matches the feature name. Keep all artifacts for the same feature together under `docs/features/<feature-slug>/`.

Do not write the brief to technical design, UX, user story, implementation plan, or backlog files unless the user explicitly asks for a separate artifact after the feature brief exists.

## Workflow

### 1. Read the product vision

Read `docs/product-vision.md` first and identify:

- the product's core promise
- target users and scenarios
- product positioning
- product principles
- boundaries and anti-goals
- trust, quality, or voice expectations
- success signals

Use these as constraints for the feature brief.

### 2. Gather only missing feature context

If the user's request does not include enough feature context, ask focused follow-up questions before writing.

Prefer the fewest questions needed to produce a useful brief. Ask one question at a time when the feature direction is unclear.

Clarify:

- what feature or capability the user wants
- what user or business problem it addresses
- when and why the target user would use it
- what outcome should improve
- what must be included in the first version
- what should stay out of scope
- known constraints, risks, or open decisions

### 3. Write a business-level brief

Write in Markdown. Keep the brief clear, decision-oriented, and non-technical.

Recommended structure:

```md
# <Feature Name> Feature Brief

## Summary
<One-paragraph description of the feature and why it matters.>

## Product Vision Fit
<How this feature supports the product vision, principles, audience, or positioning.>

## User / Customer Problem
<The user need, pain, desire, or opportunity this feature addresses.>

## Business Goal
<The product or business outcome this feature should improve.>

## Target User / Scenario
<Who this is for and when they would use it.>

## Proposed Experience
<Business-level user experience, not implementation details.>

## MVP Scope
- <What belongs in the first useful version.>

## Out of Scope
- <What is intentionally excluded for now.>

## Success Signals
- <Observable user, product, or business signals that indicate the feature is working.>

## Business-Level Acceptance Criteria
- <Testable product behavior or outcome, stated without technical implementation details.>

## Risks / Tradeoffs
- <Important product, user, trust, operational, or positioning risks.>

## Open Questions
- <Decisions that still need user/product input.>
```

Adapt the structure to the feature. Add, rename, merge, or omit sections when useful, but keep the result business-level and product-vision-aligned.

### 4. Keep technical detail out

Do not include:

- architecture diagrams
- implementation plans
- database schemas
- API contracts
- library choices
- engineering task lists
- UI wireframes or detailed interaction specs

If technical or UX decisions come up, capture them as brief product-level constraints or open questions.

### 5. Save the document

Create the feature directory if needed and save the document at:

```txt
docs/features/<feature-slug>/feature_brief.md
```

If the file already exists, read it first. Treat the request as a revision when the user asks to revise, clarify, or update the feature brief. Ask before overwriting an existing brief when the user appears to be asking for a separate new feature.

## Writing style

Aim for writing that is:

- loyal to the required product vision
- specific to the user's feature
- grounded in the product vision
- concise
- opinionated enough to guide later decisions
- understandable by non-engineering stakeholders

Avoid:

- generic startup language
- technical implementation detail
- vague benefits without user or business grounding
- feature lists without rationale
- inventing certainty where the product vision or user input is unresolved

## Decision rule

When shaping a feature brief, prefer:

1. alignment with `docs/product-vision.md`
2. clear user value
3. clear business or product outcome
4. simple MVP scope
5. honest boundaries and tradeoffs
6. measurable success signals
7. non-technical acceptance criteria

## Final response behavior

After writing the file, briefly report the path that was created or updated. Include the full feature brief in the response only if the user asks to review it inline.

If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/features/<feature-slug>/feature_brief.md`.
