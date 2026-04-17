---
name: technical-design-writer
description: Use this skill to turn an approved feature brief into a concise, implementation-oriented technical design that delegates code-quality and architecture details to the relevant skills instead of restating them.
---

# technical-design-writer

Write the smallest useful technical design doc for an approved feature.

The doc should help a human say, “cool, I understand the implementation direction,” and help a later coding agent say, “nice, I know what to do next.” Avoid filler, generic engineering advice, and restating other skills.

## Grounding

Before writing, read:

1. `docs/product-vision.md`
2. the feature brief
3. `clean-code`
4. any selected architecture, language, or framework skills that apply
5. relevant existing repo files and flows

Apply those inputs. Do not summarize them back into the technical design unless a specific implication changes the implementation.

## Required input

Require a Markdown feature brief. If the user only has a vague idea, route to `feature-brief-writer` first.

If the feature has UI impact, use an existing UX artifact when available. If missing, note the UI uncertainty briefly instead of inventing UX.

## Design stance

Translate product intent into implementation direction.

Prefer:

- concise decisions over long explanation
- concrete file/module impact over abstract architecture language
- current codebase patterns over speculative redesigns
- explicit open questions over risky assumptions
- delegation to the right skills instead of duplicating their guidance

Avoid:

- restating clean-code, architecture, language, or framework principles
- product scope expansion
- user stories, tickets, or delivery plans
- invented CLI/database/API concepts that the feature brief did not ask for
- large template sections that say “none” without adding value

## Delegation rule

A technical design may name the skills that later implementation should use, but it should not repeat their contents.

Examples:

- Good: “Implementation should follow `command-pattern` for the new `ekko skills use` command slice.”
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

Use this structure as a starting point, not a contract. Delete sections that do not add value.

```md
# Technical Design: <Feature Name>

## Inputs
- Product vision: <path>
- Feature brief: <path>
- Delegated skills: <skills later implementation should apply>

## Summary
<2-4 sentences describing the implementation direction.>

## Existing Context
<Only the current files, commands, modules, state, templates, or integrations that materially affect the change.>

## Proposed Design
<Concrete implementation decisions. Include command flows, file/module impact, state changes, and integration boundaries when relevant.>

## Validation
<Focused test/build/manual checks.>

## Risks / Open Questions
- <Only unresolved decisions or meaningful risks.>
```

## Quality bar

A good technical design is short, specific, and useful. It should not try to be the product brief, architecture skill, clean-code skill, implementation plan, or ticket backlog.
