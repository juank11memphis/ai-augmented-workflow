---
name: product-vision-writer
description: Create product vision documents for products at any stage. Use when an assistant should interview the user with focused discovery questions, clarify product purpose, audience, positioning, principles, boundaries, voice, trust expectations, and success signals, then synthesize the answers into a human, opinionated, structured Markdown product vision document at docs/product-vision.md.
---

# Product Vision Writer

## Purpose

Help write product vision documents that make a product feel clear, intentional, and worth building. Work for any product domain and any product stage.

Default output path: `docs/product-vision.md`.

## Pipeline Contract

### What this skill needs

- Enough user-provided product discovery to define or revise a product vision.
- No upstream pipeline artifact is required.
- If an existing `docs/product-vision.md` is being revised, read it first.

### What this skill writes

- `docs/product-vision.md` by default.
- A different path only when the user explicitly requests one.

### When this skill stops

- The user's intent is too unclear to ask a useful discovery question.
- Writing would overwrite an existing vision when the user appears to want a separate new vision.
- The request is for a downstream artifact such as a Deep Module Map, feature brief, technical design, UX spec, stories, implementation plan, or implementation work.

### What this skill must not do

- Do not create Deep Module Maps, feature briefs, technical designs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not skip the interview or the final “I am clear; are you good?” check-in before writing. Once the user confirms there is nothing else to cover, write without requiring a recap, artifact approval, or separate summary confirmation.
- Do not leave material strategy questions unresolved in the final document; keep interviewing until the user answers, confirms an assumption, or explicitly excludes the topic.

## Workflow

### 1. Start with discovery, not drafting

Interview before writing. Be deliberately interrogative: ask as many focused questions as needed to extract all material product vision decisions before drafting.

This interview is mandatory and non-skippable. Even when the user provides extensive initial context, existing documents, or a mature codebase, ask at least one explicit user-facing discovery question before drafting or writing the product vision. Treat repository artifacts, prior conversation, and initial context as useful but provisional: they can shape better questions, but they must not replace the interview or become the full source of truth for the user's product intent. Keep asking focused follow-up questions until the material product vision decisions are clear enough to defend. Before drafting, always perform one final check-in in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing.

Ask one question at a time. Walk down the product decision tree branch by branch, resolving dependencies between decisions before moving on. When useful, include a recommended answer or concise assumption so the user can confirm, correct, or reject it quickly. If a question can be answered from existing repository artifacts, inspect those artifacts instead of asking.

Do not optimize for the fewest questions. Optimize for ending the interview with no material open product vision questions. Cover these areas over the interview:

- **Product essence:** What is the product? What should it help people do, feel, or become?
- **Current context:** Is this a new concept, an active project, or an existing product?
- **Target user:** Who is it for? What is true about their life, work, habits, or desires?
- **Core problem or desire:** What pain, need, ambition, or emotional gap does the product address?
- **Emotional promise:** What should the ideal user reaction be?
- **Positioning:** What is this product compared against, and how should it feel different?
- **Product philosophy:** What principles should guide product decisions?
- **User control:** How much should users configure, decide, or manage?
- **Trust and quality:** What must the product be honest about? Where can it be imperfect?
- **Product voice:** How should the product sound? What language should it avoid?
- **Boundaries:** What should the product not become?
- **Success signal:** What behavior or outcome proves the product is working?

When helpful, ask for examples of products, experiences, media, brands, or moments the user wants the product to feel like or avoid.

### 2. Synthesize before structuring

Before drafting, infer the product's through-line:

- the central promise
- the main user tension
- the strongest differentiation
- the product's opinion about the world
- the decision-making principles that should survive future feature debates

If the user's answers conflict, ask follow-up questions until the conflict is resolved or the user confirms which direction should win. Do not preserve every idea equally.

### 3. Draft the product vision document

Write in Markdown with clear headings, short paragraphs, and useful bullets. Recommended structure:

```markdown
# <Product Name> Product Vision

## Summary

## Product North Star

## Target User

## Product Positioning

## Product Philosophy

## User Control

## Trust and Quality

## Product Voice

## What <Product Name> Should Not Become

## Success Signal
```

Adapt sections to the product. Add, rename, merge, or omit sections when useful.

### 4. Write in the right style

Aim for writing that is:

- human
- opinionated
- concrete
- concise
- emotionally clear
- useful for decision-making
- free of generic startup language

Avoid:

- corporate fluff
- vague claims like “seamless,” “innovative,” or “leveraging technology” unless grounded in specifics
- overexplaining
- feature lists masquerading as vision
- excessive frameworks
- leaving unresolved strategy questions in the document

Use the user's own language when it is vivid or revealing. Improve clarity without sanding off personality.

### 5. Handle incomplete inputs

For rough ideas, keep interviewing until the user has confirmed enough assumptions to support a sharper first-pass vision. For existing products, reflect what the product is today and what it must protect or change. If context is still insufficient, ask the next most important follow-up instead of inventing details.

### 6. Save the document

When working in a repository, write the product vision document to `docs/product-vision.md` by default. Create the `docs/` directory if needed.

If `docs/product-vision.md` already exists, read it before drafting. Treat the request as a revision when the user asks to revise, clarify, or update the product vision. Ask before overwriting an existing document when the user appears to be asking for a separate new product vision.

If the user explicitly requests a different path, use that path instead.

### 7. Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the document body, excerpt, outline, or section summaries.

Only include the full document when the user explicitly asks for inline review in the current request. If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/product-vision.md`.
