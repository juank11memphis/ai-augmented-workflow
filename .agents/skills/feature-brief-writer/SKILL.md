---
name: feature-brief-writer
description: Use this skill to define business-level feature briefs that stay loyal to docs/product-vision.md before UX, technical design, or implementation work.
---

# Feature Brief Writer

## Purpose

Create concise feature briefs that explain what a feature is, why it matters, who it serves, and how it follows `docs/product-vision.md`: purpose, audience, boundaries, and success signals.

This skill owns the product/business shape of a feature. It does not own UI interaction design, technical architecture, implementation plans, data models, APIs, or task breakdowns.

## Required source of truth

Before doing any feature-brief work, read:

```txt
docs/product-vision.md
docs/product-context-map.md
```

Use the product vision as the source of truth for the product's purpose, audience, positioning, principles, voice, boundaries, trust expectations, and success signals.

Use the Product Context Map as the source of truth for where feature work belongs. Product Contexts answer “where does this work belong?” Do not invent Product Contexts in a feature brief.

Do not duplicate or rewrite the product vision inside the feature brief. Apply it to the specific feature being defined.

## Hard start rule

Do not start a feature brief if `docs/product-vision.md` or `docs/product-context-map.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with the `product-vision-writer` skill.
4. Do not draft, infer, or save a feature brief until the product vision exists.

If the Product Context Map is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/product-context-map.md`.
3. Instruct the user to create the map first with the `product-context-map-writer` skill.
4. Do not draft, infer, or save a feature brief until the map exists.

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

## Interview posture

Be deliberately interrogative before drafting. The feature brief should reflect the user's intent, not the assistant's assumptions.

- Ask one focused question at a time.
- Keep asking until you have complete practical understanding and explicit user alignment.
- Prefer follow-up questions over filling gaps with plausible invention.
- Treat "100% understanding" as: feature intent, target user, scenario, user problem, business goal, MVP boundary, out-of-scope boundary, success signals, and known constraints are all clear enough to defend in the brief.
- Treat "100% alignment" as: the user has confirmed the assistant's concise understanding of the feature direction before the brief is written.
- If the user gives a partial answer, acknowledge the useful part and ask the next most important unresolved question.
- Do not ask a large questionnaire all at once.

## Workflow

### 1. Read the product vision and Product Context Map

Read `docs/product-vision.md` first and identify:

- the product's core promise
- target users and scenarios
- product positioning
- product principles
- boundaries and anti-goals
- trust, quality, or voice expectations
- success signals

Use these as constraints for the feature brief.

Then read `docs/product-context-map.md` and identify which existing Product Contexts may own the requested feature. A feature brief must name one or more existing Product Contexts.

If no existing Product Context fits:

1. Stop before drafting.
2. Tell the user the feature appears to require a Product Context Map update.
3. Provide this suggested prompt, adapted to the user's feature:

```txt
Use product-context-map-writer to update docs/product-context-map.md for this feature: <feature summary>. Decide whether it belongs in an existing Product Context or requires a new/changed context, then update the map only after confirming the responsibility boundary with me.
```

4. Do not draft, infer, or save a feature brief until the map is updated.

### 2. Clarify feature intent before drafting

Do not draft a feature brief from a vague or merely plausible request.

A request is too vague when the user gives only a broad area, product milestone, theme, or label such as "define the MVP," "write the onboarding feature," "make a sync feature," or "I want analytics" without enough detail to know what the user actually means.

When feature intent is vague, incomplete, or not yet explicitly aligned:

1. Stop before drafting.
2. Explain briefly that the feature direction needs clarification before a responsible brief can be written.
3. Ask one focused discovery question.
4. Wait for the user's answer.
5. Continue asking one question at a time until there is enough context to write a useful, product-vision-aligned brief.
6. Summarize the current understanding in a concise confirmation statement.
7. Ask the user to confirm or correct it.
8. Draft only after the user confirms alignment or provides corrections that resolve the remaining gaps.

Do not ask the user to answer a large questionnaire all at once. Keep the interview conversational and focused.

### 3. Gather the minimum required feature context

Ask every question needed to remove material ambiguity, but only one at a time. Clarify:

- what feature or capability the user wants
- what the user means by broad labels such as MVP, onboarding, sync, analytics, or automation
- what user or business problem it addresses
- who the feature is for
- when and why the target user would use it
- what outcome should improve
- what must be included in the first version
- what should stay out of scope
- known constraints, risks, or open decisions

Draft only once feature intent, target user/scenario, desired outcome, MVP boundary, out-of-scope boundary, success signals, and constraints are clear enough to avoid invention and the user has confirmed alignment.

If the conversation stalls, offer a concise default assumption for the next unresolved point and ask the user to confirm or correct it before proceeding.

### 4. Write a business-level brief

Write in Markdown. Keep the brief clear, decision-oriented, and non-technical.

Recommended structure:

```md
# <Feature Name> Feature Brief

## Summary
<One-paragraph description of the feature and why it matters.>

## Product Vision Fit
<How this feature supports the product vision, principles, audience, or positioning.>

## Product Context
<One or more existing Product Contexts from docs/product-context-map.md that own this feature, with a brief fit rationale.>

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

### 5. Keep technical detail out

Do not include:

- architecture diagrams
- implementation plans
- database schemas
- API contracts
- library choices
- engineering task lists
- UI wireframes or detailed interaction specs

If technical or UX decisions come up, capture them as brief product-level constraints or open questions.

### 6. Save the document

Create the feature directory if needed and save the document at:

```txt
docs/features/<feature-slug>/feature_brief.md
```

If the file already exists, read it first. Treat the request as a revision when the user asks to revise, clarify, or update the feature brief. Ask before overwriting an existing brief when the user appears to be asking for a separate new feature.

## Writing style

Aim for writing that is:

- loyal to the required product vision
- explicit about which existing Product Contexts own the feature
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
- drafting from vague feature labels without discovery
- inventing new Product Contexts instead of stopping for a map update
- inventing certainty where the product vision or user input is unresolved

## Decision rule

When shaping a feature brief, prefer:

1. alignment with `docs/product-vision.md`
2. fit with existing Product Contexts from `docs/product-context-map.md`
3. clear user value
4. clear business or product outcome
5. simple MVP scope
6. honest boundaries and tradeoffs
7. measurable success signals
8. non-technical acceptance criteria

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the feature brief body, excerpt, outline, or section summaries.

Only include the full feature brief when the user explicitly asks for inline review in the current request. If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/features/<feature-slug>/feature_brief.md`.
