---
name: feature-brief-writer
description: Use this skill to define business-level feature briefs that stay loyal to docs/product-vision.md, docs/business-domain-model.md, and docs/capabilities-map.md before UX, technical design, or implementation work.
---

# Feature Brief Writer

## Purpose

Create concise feature briefs that explain what a feature is, why it matters, who it serves, and how it follows `docs/product-vision.md`, `docs/business-domain-model.md`, and `docs/capabilities-map.md`: purpose, audience, business language, domain concepts, rules, workflows, boundaries, capability coverage, and success signals.

This skill owns the product/business shape of a feature. It does not own UI interaction design, technical architecture, implementation plans, data models, APIs, or task breakdowns.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- `docs/business-domain-model.md`.
- `docs/capabilities-map.md`.
- Enough user-provided feature intent to define the feature problem, target user/scenario, business goal, MVP boundary, out-of-scope boundary, success signals, constraints, Product Vision fit, Business Domain Model fit, and Capability Coverage.

### What this skill writes

- `docs/features/<feature-slug>/feature_brief.md`.
- The containing `docs/features/<feature-slug>/` directory when needed.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- `docs/business-domain-model.md` is missing; tell the user to create it first with `business-domain-model-writer`.
- `docs/capabilities-map.md` is missing; tell the user to create it first with `capabilities-map-writer`.
- The feature appears to stretch or change the Product Vision; hard-stop with a ready prompt for `product-vision-writer`.
- The feature introduces missing or changed domain concepts, rules, workflows, lifecycles, events, boundaries, or core/supporting subdomains; hard-stop with a ready prompt for `business-domain-model-writer`.
- The feature fits an existing subdomain but needs missing capability coverage; hard-stop with a ready prompt for `capabilities-map-writer`.
- The request belongs to another pipeline stage, such as technical design, UX design, Scrum planning, implementation planning, or implementation execution.
- Current-stage feature intent is unclear; ask one focused question at a time until enough information is available.

### What this skill must not do

- Do not create or update Product Vision, Business Domain Model, Capabilities Map, Deep Module Maps, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not invent missing product direction, domain model coverage, subdomains, or capabilities in the final brief.
- Do not skip the interview or the final “I am clear; are you good?” check-in before writing. Once the user confirms there is nothing else to cover, write without requiring a recap, artifact approval, or separate summary confirmation.
- Do not duplicate or rewrite the product vision; apply only the relevant implications to the feature.
- Do not leave material product, scope, success, constraint, domain fit, or capability coverage questions unresolved in the final brief; keep interviewing until the user answers, confirms an assumption, or explicitly excludes the topic.

## Required source of truth

Before doing any feature-brief work, read:

```txt
docs/product-vision.md
docs/business-domain-model.md
docs/capabilities-map.md
```

Use the product vision as the source of truth for the product's purpose, audience, positioning, principles, voice, boundaries, trust expectations, and success signals.

Use the Business Domain Model as the source of truth for business language, domain concepts, relationships, rules, states, workflows, events, and boundaries that shape business-level feature scope.

Use the Capabilities Map as the source of truth for business/product capability coverage by subdomain. Capabilities answer “what existing business/product ability supports this feature?” Do not invent capabilities in a feature brief.

Do not duplicate or rewrite the product vision inside the feature brief. Apply it to the specific feature being defined.

## Hard start rule

Do not start a feature brief if `docs/product-vision.md`, `docs/business-domain-model.md`, or `docs/capabilities-map.md` is missing.

If the product vision is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/product-vision.md`.
3. Instruct the user to create the product vision first with the `product-vision-writer` skill.
4. Do not draft, infer, or save a feature brief until the product vision exists.

If the Business Domain Model is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/business-domain-model.md`.
3. Instruct the user to create the domain model first with the `business-domain-model-writer` skill.
4. Do not draft, infer, or save a feature brief until the domain model exists.

If the Capabilities Map is missing:

1. Stop.
2. Tell the user that a feature brief requires `docs/capabilities-map.md`.
3. Instruct the user to create the map first with the `capabilities-map-writer` skill.
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

## Raw idea sources

If the user asks for a feature brief from an idea in `docs/feature-ideas.md`, read the relevant idea and treat it as raw/vague input only.

- Do not skip the normal interview flow because the idea exists in a file.
- Use the idea as a seed for the first discovery question, not as complete feature intent.
- Keep asking one focused question at a time until the usual required context is resolved: problem, target user/scenario, business goal, MVP boundary, out-of-scope boundary, success signals, constraints, Business Domain Model fit, and Capability Coverage.
- Preserve the hard-start requirements for `docs/product-vision.md`, `docs/business-domain-model.md`, and `docs/capabilities-map.md`.
- After the local `docs/features/<feature-slug>/feature_brief.md` file is successfully written, remove the promoted idea from `docs/feature-ideas.md` while preserving the rest of the file.
- Do not delete the idea before the feature brief file exists, and do not remove unrelated ideas or headings.

## Interview posture

Be deliberately interrogative before drafting. The feature brief should reflect the user's intent, not the assistant's assumptions.

This interview is mandatory and non-skippable. Even when the user provides extensive initial context, existing docs, repo code, or a raw idea file, ask at least one explicit user-facing discovery question before drafting or writing the feature brief. Treat repository artifacts, prior conversation, existing product docs, and initial context as useful but provisional: they can shape better questions, but they must not replace the interview or become the full source of truth for feature intent, scope, success, constraints, or user value. Keep asking focused follow-up questions until the feature decisions are clear enough to defend. Before drafting, always perform one final check-in in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing.

- Ask one focused question at a time.
- Keep asking until you have complete practical understanding and explicit user alignment; do not optimize for a short interview.
- Walk down each feature decision branch one by one, resolving dependencies between product, scope, success, constraint, domain-fit, and capability-coverage decisions before drafting.
- When useful, provide your recommended answer or a concise default assumption with the question so the user can confirm, correct, or reject it quickly.
- If a question can be answered by reading repository artifacts, inspect those artifacts instead of asking.
- Prefer follow-up questions over filling gaps with plausible invention.
- Treat "100% understanding" as: feature intent, target user, scenario, user problem, business goal, MVP boundary, out-of-scope boundary, success signals, and known constraints are all clear enough to defend in the brief.
- Treat "enough context" as: feature intent, target user/scenario, desired outcome, MVP boundary, out-of-scope boundary, success signals, constraints, Business Domain Model fit, and Capability Coverage are clear enough to defend in the brief.
- If the user gives a partial answer, acknowledge the useful part and ask the next most important unresolved question.
- Do not ask a large questionnaire all at once.

## Workflow

### 1. Read the product vision, Business Domain Model, and Capabilities Map

Read `docs/product-vision.md` first and identify:

- the product's core promise
- target users and scenarios
- product positioning
- product principles
- boundaries and anti-goals
- trust, quality, or voice expectations
- success signals

Use these as constraints for the feature brief.

Then read `docs/business-domain-model.md` and identify relevant business language, domain concepts, relationships, rules, states, workflows, events, and boundaries that should shape feature scope and wording.

Then read `docs/capabilities-map.md` and identify which existing subdomain capabilities support the requested feature. A feature brief must explain the feature's Capability Coverage using existing Business Domain Model subdomains and existing capabilities.

Before drafting, check for upstream gaps. Do not silently invent missing upstream foundations in the final brief.

If the feature appears to stretch or change the Product Vision's direction, target users, boundaries, principles, trust expectations, or success signals:

1. Stop before drafting.
2. Tell the user the feature needs Product Vision clarification first.
3. Provide this prompt, adapted to the user's feature:

```txt
Use product-vision-writer to revise docs/product-vision.md for this feature request: <feature summary>. Clarify whether the feature fits or changes the product direction, target users, boundaries, principles, trust expectations, and success signals. Include this context: <known user/scenario/problem/outcome/scope notes>. Do not write the feature brief until I confirm the Product Vision update.
```

If the feature introduces missing or changed domain concepts, rules, workflows, lifecycles, events, boundaries, or core/supporting subdomains:

1. Stop before drafting.
2. Tell the user the Business Domain Model needs coverage first.
3. Provide this prompt, adapted to the user's feature:

```txt
Use business-domain-model-writer to revise docs/business-domain-model.md for this feature request: <feature summary>. Check whether it introduces or changes domain concepts, rules, workflows, lifecycles, events, boundaries, or core/supporting subdomains. Include this context: <known user/scenario/problem/outcome/scope notes>. Do not write the feature brief until I confirm the Business Domain Model update.
```

If the feature fits an existing Business Domain Model subdomain but depends on a missing capability:

1. Stop before drafting.
2. Tell the user the Capabilities Map needs coverage first.
3. Provide this prompt, adapted to the user's feature:

```txt
Use capabilities-map-writer to revise docs/capabilities-map.md for this feature request: <feature summary>. Map it to the existing subdomain <subdomain name> and add or adjust only the business/product capability coverage needed to support it. Include this context: <known user/scenario/problem/outcome/scope notes>. Do not write the feature brief until I confirm the Capabilities Map update.
```

### 2. Clarify feature intent before drafting

Do not draft a feature brief from a vague or merely plausible request.

A request is too vague when the user gives only a broad area, product milestone, theme, or label such as "define the MVP," "write the onboarding feature," "make a sync feature," or "I want analytics" without enough detail to know what the user actually means.

When feature intent is vague or incomplete:

1. Stop before drafting.
2. Explain briefly that the feature direction needs clarification before a responsible brief can be written.
3. Ask one focused discovery question.
4. Wait for the user's answer.
5. Continue asking one question at a time until there is enough context to write a useful, product-vision-aligned brief.
6. Draft once the missing information is clear enough to produce the feature brief.

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
- which Business Domain Model concepts, rules, states, workflows, or boundaries materially shape the scope
- what should stay out of scope
- known constraints and risks

Draft only once feature intent, target user/scenario, desired outcome, MVP boundary, out-of-scope boundary, success signals, constraints, Business Domain Model fit, and Capability Coverage are clear enough to avoid invention. Do not draft a brief with an `Open Questions` section.

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

## Business Domain Model Fit
<Relevant domain language, concepts, rules, states, workflows, or boundaries from docs/business-domain-model.md that shape this feature.>

## Capability Coverage
<Existing subdomain capabilities from docs/capabilities-map.md that support this feature, with a business/product fit rationale.>

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

If technical or UX decisions come up, either capture the resolved product-level implication as a constraint or ask follow-up questions before drafting. Do not add unresolved technical or UX decisions as open questions in the brief.

### 6. Save the document

Create the feature directory if needed and save the document at:

```txt
docs/features/<feature-slug>/feature_brief.md
```

If the file already exists, read it first. Treat the request as a revision when the user asks to revise, clarify, or update the feature brief. Ask before overwriting an existing brief when the user appears to be asking for a separate new feature.

## Writing style

Aim for writing that is:

- loyal to the required product vision
- explicit about which existing subdomain capabilities support the feature
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
- inventing new capabilities or subdomains instead of stopping for the right upstream update
- inventing certainty where the product vision or user input is unresolved
- including an Open Questions section instead of resolving the questions during the interview

## Decision rule

When shaping a feature brief, prefer:

1. alignment with `docs/product-vision.md`
2. fit with existing capabilities from `docs/capabilities-map.md`
3. clear user value
4. clear business or product outcome
5. simple MVP scope
6. honest boundaries and tradeoffs
7. measurable success signals
8. non-technical acceptance criteria

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the feature brief body, excerpt, outline, or section summaries.

Only include the full feature brief when the user explicitly asks for inline review in the current request. If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/features/<feature-slug>/feature_brief.md`.
