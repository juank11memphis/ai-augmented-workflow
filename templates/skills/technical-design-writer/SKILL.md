---
name: technical-design-writer
description: Use this skill to turn an approved feature brief into a concise, implementation-oriented technical design that delegates code-quality and architecture details to the relevant skills instead of restating them.
---

# technical-design-writer

Write the smallest useful technical design doc for an approved feature: enough for a human to understand the implementation direction and a later coding agent to know what to do next. Avoid filler, generic engineering advice, and restating other skills.

## Grounding

Before writing, read:

1. `docs/product-vision.md`
2. `docs/product-context-map.md`
3. the feature brief, including its `## Product Context` section
4. `docs/features/<feature-slug>/ux.md` when the feature has UI impact
5. `clean-code`
6. any selected architecture, language, or framework skills that apply
7. relevant existing repo files and flows

Apply those inputs. Do not summarize them back into the technical design unless a specific implication changes the implementation.

## Required input

Require a Markdown feature brief. If the user only has a vague idea, route to `feature-brief-writer` first.

Require `docs/product-context-map.md`. If it is missing, stop and ask the user to create it with `product-context-map-writer` first. Do not infer or invent Product Contexts.

Require the feature brief to name one or more existing Product Contexts. Preserve those selected contexts in the technical design; if they appear missing, ambiguous, or inconsistent with the map, stop and ask the user to update the feature brief or Product Context Map first.

If the feature has UI impact, require `docs/features/<feature-slug>/ux.md`. If it is missing, stop and ask the user to create the UX spec with `ux-expert` first.

## UX binding rule

For UI-related features, `ux.md` is source context, not inspiration. If `ux.md` includes mockups, treat those mockups as binding UI goals for structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the mockups in the technical design. Translate them into implementation direction and call out only technical feasibility issues, missing states, or conflicts that require UX revision.

## Design stance

Translate product intent into implementation direction.

Product Contexts answer “where does this work belong?” Architecture guidance answers “how is that context structured internally?” Explain their interaction only when it affects implementation direction, such as file/module ownership, boundaries, command placement, dependencies, or cross-context coordination.

Prefer:

- concise decisions over long explanation
- concrete file/module impact over abstract architecture language
- current codebase patterns over speculative redesigns
- explicit open questions over risky assumptions
- delegation to the right skills instead of duplicating their guidance
- preserving the feature brief's selected Product Contexts

Avoid:

- restating clean-code, architecture, language, or framework principles
- product scope expansion
- user stories, tickets, or delivery plans
- invented CLI/database/API concepts that the feature brief did not ask for
- inventing new Product Contexts or moving work into unselected contexts
- large template sections that say “none” without adding value

## Delegation rule

A technical design may name the skills that later implementation should use, but it should not repeat their contents.

Examples:

- Good: “Implementation should follow `command-pattern` for the new `sibu skills use` command slice.”
- Bad: restating the full command/handler/port responsibilities from the `command-pattern` skill.
- Good: “Use `clean-code` during implementation; no extra code-quality rules are introduced here.”
- Bad: adding a generic clean-code checklist to the doc.

## Workflow

1. Read the required grounding artifacts.
2. Inspect the relevant existing code before proposing changes.
3. Identify only the implementation decisions that matter.
4. Write the doc at `docs/features/<feature-slug>/technical_design.md`.
5. Keep it concise. Remove any section that does not help implementation.

## Output location

Always create or update:

```txt
docs/features/<feature-slug>/technical_design.md
```

Use the same kebab-case feature slug as the feature brief.

## Output format

Use this structure as a starting point. Delete sections that do not add value.

```md
# Technical Design: <Feature Name>

## Inputs
- Product vision: <path>
- Product Context Map: <path>
- Feature brief: <path>
- Delegated skills: <skills later implementation should apply>

## Summary
<2-4 sentences describing the implementation direction.>

## Existing Context
<Only the current files, commands, modules, state, templates, or integrations that materially affect the change.>

## Proposed Design
<Concrete implementation decisions. Include command flows, file/module impact, state changes, and integration boundaries when relevant.>

<When it changes implementation direction, explain how the selected Product Contexts interact with the selected architecture guidance. Otherwise, preserve the contexts without adding a separate generic section.>

## Validation
<Focused test/build/manual checks.>

## Risks / Open Questions
- <Only unresolved decisions or meaningful risks.>
```

## Quality bar

A good technical design is short, specific, and useful. It should not try to be the product brief, architecture skill, clean-code skill, implementation plan, or ticket backlog.

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the technical design body, excerpt, outline, or section summaries.

Only include the full technical design when the user explicitly asks for inline review in the current request.
