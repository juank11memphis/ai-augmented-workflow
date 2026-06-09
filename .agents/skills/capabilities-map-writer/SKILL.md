---
name: capabilities-map-writer
description: Create or update docs/capabilities-map.md from Product Vision and Business Domain Model, mapping business/product capabilities by subdomain before Deep Module Map or Feature Brief work.
---

# Capabilities Map Writer

## Purpose

Create or update `docs/capabilities-map.md`, a project-owned Capabilities Map that translates Product Vision and Business Domain Model context into clear business/product abilities organized by subdomain.

This skill owns the Capabilities Map only. It does not own Product Vision, Business Domain Models, Deep Module Maps, feature briefs, UX specs, technical designs, Epics, User Stories, implementation plans, production code, or Sibu template changes.

## Pipeline Contract

### What this skill needs

- `docs/product-vision.md`.
- `docs/business-domain-model.md`.
- Existing `docs/capabilities-map.md` when revising the map.
- Assistant-generated capability hypotheses grounded in Product Vision and Business Domain Model, then user review/corrections before writing.

### What this skill writes

- `docs/capabilities-map.md`.

This is generated project-owned content. It is not a Sibu-managed workflow template.

### When this skill stops

- `docs/product-vision.md` is missing; tell the user to create it first with `product-vision-writer`.
- `docs/business-domain-model.md` is missing; tell the user to create it first with `business-domain-model-writer`.
- The request belongs to another pipeline stage, such as Product Vision, Business Domain Model, Deep Module Map, feature brief, UX design, technical design, Scrum planning, implementation planning, or implementation execution.
- Product Vision appears to need new or changed product direction, target user, boundaries, principles, trust expectations, or success signals; stop with a ready-to-paste `product-vision-writer` repair prompt.
- Business Domain Model appears to need new or changed subdomains, concepts, relationships, rules, workflows, lifecycles, events, boundaries, or hard parts; stop with a ready-to-paste `business-domain-model-writer` repair prompt.
- Product Vision, Business Domain Model, and user review still leave material ambiguity about core, supporting, generic, or external capabilities; ask one focused review question instead of drafting.

### What this skill must not do

- Do not create Product Vision, Business Domain Models, Deep Module Maps, feature briefs, UX specs, technical designs, Epics, User Stories, implementation plans, or production code.
- Do not turn modules, commands, services, APIs, database tables, files, classes, packages, screens, jobs, queues, deployment units, or other implementation structure into primary capabilities.
- Do not inspect implementation code or derive capabilities from current architecture, folder names, database schemas, commands, screens, APIs, or tests by default.
- Do not skip the user review/correction pass or the final “I am clear; are you good?” check-in before writing.
- Do not write any file except `docs/capabilities-map.md` unless the user explicitly asks for a different path for this same artifact.

## Required source of truth

Before doing any Capabilities Map work, read:

```txt
docs/product-vision.md
docs/business-domain-model.md
```

Use Product Vision as the source of truth for product purpose, target user, positioning, product principles, boundaries, voice, trust expectations, and success signals.

Use Business Domain Model as the source of truth for core, supporting, generic, and external subdomains; ubiquitous language; concepts; relationships; rules; workflows; lifecycles; events; boundaries; and hard parts.

The Capabilities Map source of truth is Product Vision, Business Domain Model, and the user's review of assistant-generated capability hypotheses. Repository code may be inspected only when the user explicitly requests a later code-alignment check, and only after the business/product capability map has been drafted from upstream artifacts and user-reviewed context.

## Hard start rule

Do not create or update a Capabilities Map if either required upstream artifact is missing.

If Product Vision is missing:

1. Stop.
2. Tell the user that a Capabilities Map requires `docs/product-vision.md`.
3. Instruct the user to create Product Vision first with `product-vision-writer`.
4. Do not draft, infer, or save a Capabilities Map until Product Vision exists.

If Business Domain Model is missing:

1. Stop.
2. Tell the user that a Capabilities Map requires `docs/business-domain-model.md`.
3. Instruct the user to create the Business Domain Model first with `business-domain-model-writer`.
4. Do not draft, infer, or save a Capabilities Map until the Business Domain Model exists.

## Upstream gap detection and repair prompts

Do not use the Capabilities Map to patch over missing upstream foundations. While reading Product Vision and Business Domain Model, actively check whether the requested capability work exposes an upstream gap.

Hard-stop and provide a ready-to-paste repair prompt when either upstream artifact needs revision before capabilities can be mapped safely. The prompt must include the user's capability-map request, the suspected gap, and the specific decision needed so the upstream skill can repair the source artifact.

Product Vision gaps include missing or changed product purpose, target user, positioning, product boundaries, product principles, voice, trust expectations, or success signals. When found, stop and give a prompt shaped like:

```markdown
Use product-vision-writer to revise docs/product-vision.md before Capabilities Map work continues.

Capability-map request: <user request or concise summary>

Suspected Product Vision gap: <what direction, target user, boundary, principle, trust expectation, or success signal is missing or changing>

Decision needed: <the product-level decision needed before capabilities can be mapped>

After docs/product-vision.md is updated, return to capabilities-map-writer to create or revise docs/capabilities-map.md.
```

Business Domain Model gaps include missing or changed core/supporting subdomains, ubiquitous language, domain concepts, relationships, business rules, workflows, lifecycles, events, boundaries, or hard parts. When found, stop and give a prompt shaped like:

```markdown
Use business-domain-model-writer to revise docs/business-domain-model.md before Capabilities Map work continues.

Capability-map request: <user request or concise summary>

Suspected Business Domain Model gap: <what subdomain, concept, relationship, rule, workflow, lifecycle, event, boundary, or hard part is missing or changing>

Decision needed: <the domain-level decision needed before capabilities can be mapped>

After docs/business-domain-model.md is updated, return to capabilities-map-writer to create or revise docs/capabilities-map.md.
```

If the upstream artifacts are present and only the capability wording is unclear, do not route away. Continue the normal assistant-led review with one focused question.

## Business/product-level boundary

Capabilities describe what the product or business must be able to do, not how the software is structured.

Use capability names like:

- “Capture workflow decisions”
- “Surface upstream planning gaps”
- “Preserve user-controlled artifact review”
- “Coordinate external export handoff”

Avoid capability names like:

- “Create `CapabilityRepository`”
- “Add `/api/capabilities` endpoint”
- “Implement command handler”
- “Store rows in `capabilities` table”
- “Render React capability list component”

If an upstream artifact only provides technical language, translate it into the underlying business/product ability and ask the user to confirm the translation.

## Discovery posture

Be assistant-led before writing. The user is asking for help defining capabilities; do not make them supply the map from scratch.

Before asking questions, extract as much as possible from Product Vision and Business Domain Model:

- likely product abilities implied by product goals and success signals
- capabilities owned by each core subdomain
- capabilities owned by each supporting subdomain
- generic or external capabilities that matter for boundaries
- capability dependencies or sequencing constraints
- capability gaps, tensions, or future evolution notes
- places where upstream artifacts are silent or ambiguous

Then present a concise first-pass interpretation and ask the user to correct one specific part of it. The user's job is reviewer, not author.

Use plain product language. Prefer questions like “Does this read right?” or “Which of these feels wrong?” over questions that require capability-modeling expertise.

This user review pass is mandatory and non-skippable. Even when upstream artifacts are rich, ask at least one explicit user-facing review/correction question before drafting or writing the Capabilities Map.

Ask one focused question at a time. Never ask the user to answer a list of questions, fill out a questionnaire, or respond to multiple numbered gaps in one turn. When useful, include your recommended answer or a concise default assumption with the single question so the user can confirm, correct, or reject it quickly.

Do not optimize for the fewest questions. Optimize for ending the interview with no material open capability questions. If a question can be answered from Product Vision, Business Domain Model, or an existing Capabilities Map during revision, inspect those artifacts instead of asking.

Before drafting, always perform one final check-in as a single question in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing. Once the user confirms there is nothing else to cover, write without requiring a separate artifact approval step.

Start with a response shaped like this, with exactly one user-facing question:

```markdown
I’ll take the first pass from Product Vision and the Business Domain Model, then ask you to correct it.

My read is:
- <core subdomain> likely needs capabilities around <plain product/business abilities>
- <supporting subdomain> likely needs capabilities around <plain product/business abilities>
- <generic/external capability area> may matter because <boundary or dependency>

First question: <one focused review question about the highest-leverage capability assumption>
```

Use review questions like:

- “My read is that `<subdomain>` owns the ability to `<plain product ability>`. Does that feel right?”
- “I think these are the main capabilities under `<subdomain>`: `<short list>`. Which one feels wrong or missing?”
- “This capability sounds technical in the source docs: `<technical phrase>`. Would you describe the business ability as `<plain-language translation>`?”
- “Product Vision suggests this dependency: `<capability A>` must exist before `<capability B>`. Is that true?”
- “This part is still ambiguous to me: `<specific ambiguity>`. My default assumption would be `<assumption>`. Should I use that?”

Avoid starting with:

- “What capabilities should exist?”
- “What modules should own this?”
- “What services or commands do we need?”
- “What API endpoints should we support?”
- “What database tables should model capabilities?”
- “How is the code structured today?”

## Gather the required capability context

Keep extracting from Product Vision and Business Domain Model and asking focused review questions until the following are clear enough to defend:

- core subdomain capabilities
- supporting subdomain capabilities
- generic or external capabilities when useful for boundaries
- capability descriptions or outcome statements
- capability dependencies or sequencing
- known gaps or evolution notes
- capability names that stay business/product-level

Do not draft with material unresolved capability questions. If the conversation stalls, offer one concise assumption for the next unresolved point and ask the user to confirm, correct, or reject it.

## Document shape

Write `docs/capabilities-map.md` in Markdown using these sections:

```markdown
# Capabilities Map

## Purpose

## Capability Map

### Core Subdomains

#### <Subdomain>
- **<Capability>**: <business/product ability and outcome>

### Supporting Subdomains

#### <Subdomain>
- **<Capability>**: <business/product ability and outcome>

### Generic / External Capabilities

## Capability Dependencies / Sequencing

## Known Gaps / Evolution Notes
```

Adapt section names when useful, but preserve the distinction between core, supporting, and generic/external capabilities when those categories exist in the Business Domain Model.

Keep “Known Gaps / Evolution Notes” for acknowledged future evolution, not unresolved questions in the drafting process. Resolve material open questions before writing.

## Writing style

Write capabilities as concise business/product abilities with outcome-oriented descriptions.

Prefer:

- short capability names
- plain product language
- bullets grouped by subdomain
- clear statements of user or business outcome
- explicit dependency notes only where they affect planning

Avoid:

- implementation tasks
- architecture diagrams
- module or service ownership
- database or API design
- exhaustive process documentation
- generic filler capabilities that could apply to any product

## Save the document

When working in a repository, write the Capabilities Map to `docs/capabilities-map.md` by default. Create the `docs/` directory if needed.

If `docs/capabilities-map.md` already exists, read it before drafting. Treat the request as a revision when the user asks to revise, clarify, or update the map. Ask before overwriting an existing map when the user appears to be asking for a separate artifact.

If the user explicitly requests a different path, use that path instead.

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the document body, excerpt, outline, or section summaries.

Only include the full document when the user explicitly asks for inline review in the current request. If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/capabilities-map.md`.
