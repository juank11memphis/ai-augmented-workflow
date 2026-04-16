---
name: product-vision-writer
description: Create product vision documents for products at any stage. Use when an assistant should interview the user with focused discovery questions, clarify product purpose, audience, positioning, principles, boundaries, voice, trust expectations, and success signals, then synthesize the answers into a human, opinionated, structured Markdown product vision document at docs/product-vision.md.
---

# Product Vision Writer

## Purpose

Help write product vision documents that make a product feel clear, intentional, and worth building. Work for any product domain and any product stage.

Default output path: `docs/product-vision.md`.

## Workflow

### 1. Start with discovery, not drafting

Ask focused questions before writing the document unless the user has already provided enough source material.

Prefer one compact batch of questions. Ask follow-ups only when an answer materially changes the document or when a critical input is missing.

Cover these areas:

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

If the user's answers conflict, resolve the conflict explicitly in the draft by choosing the clearest product direction. Do not preserve every idea equally.

### 3. Draft the product vision document

Write in Markdown. Use clear headings, short paragraphs, and bullets where they improve readability.

Recommended structure:

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
- pretending unresolved strategy questions are settled

Use the user's own language when it is vivid or revealing. Improve clarity without sanding off personality.

### 5. Handle incomplete inputs

If the user has only a rough idea, produce a sharper first-pass vision with clearly stated assumptions.

If the user has an existing product, make the document reflect what the product is today and what it must protect or change.

If there is not enough context to write responsibly, ask the smallest possible follow-up question set instead of inventing details.

### 6. Save the document

When working in a repository, write the product vision document to `docs/product-vision.md` by default. Create the `docs/` directory if needed.

If `docs/product-vision.md` already exists, read it before drafting. Treat the request as a revision when the user asks to revise, clarify, or update the product vision. Ask before overwriting an existing document when the user appears to be asking for a separate new product vision.

If the user explicitly requests a different path, use that path instead.

### 7. Final response behavior

After writing the file, briefly report the path that was created or updated. Include the full document in the response only if the user asks to review it inline.

If file writes are unavailable, provide the Markdown content and state that it is intended for `docs/product-vision.md`.
