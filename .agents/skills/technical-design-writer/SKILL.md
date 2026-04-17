---
name: technical-design-writer
description: Use this skill to translate an approved feature brief and optional UX direction into an implementation-oriented technical design before user stories, delivery planning, or implementation. Applies the product vision, `clean-code` skill guidance, selected architecture skills, selected framework/language skills, and `ux-expert` skill artifacts when relevant.
---

# technical-design-writer

Write a Feature Technical Design Doc that translates product intent, and optional UX direction, into an implementation-ready engineering design.

This skill prepares the technical artifact that can later be combined with the feature brief and UX artifact to create user stories, delivery plans, or Jira-ready work.

## Required grounding

Read `docs/product-vision.md` first. Internalize the product vision, target users, product principles, product boundaries, MVP bar, trust expectations, and success signals.

Read the feature brief for the feature before producing the technical design. Prefer feature briefs created by, or matching the structure of, the `feature-brief-writer` skill.

Read the `clean-code` skill before producing the technical design. Apply its code-quality principles to keep the proposed implementation simple, readable, focused, and maintainable.

Read any user-selected architecture skills before producing the technical design. Apply the selected architecture guidance instead of restating it here. If no architecture skill is selected, say so in the technical design and use the lightest architecture that preserves clear boundaries and maintainability.

For UI-impacting features, also require or request a UX artifact from the `ux-expert` skill. If the project has selected frontend or framework skills such as `react` or `nextjs`, read and apply those skills as well.

Do not restate these documents wholesale. Apply only the implications that matter for the feature design.

## Required feature input

Require a Markdown feature brief produced by, or matching the structure of, the `feature-brief-writer` skill.

Do not write a technical design directly from a vague idea. If the user has only an idea, route to the `feature-brief-writer` skill first.

If the feature brief indicates UI changes, require or request a UX artifact from the `ux-expert` skill unless the user explicitly wants a backend-only or technical-first design. If the UX artifact is missing, call that out in `Open Technical Questions` or route to the `ux-expert` skill before finalizing UI/frontend design.

## Design stance

Translate product and UX intent into software changes. Do not redefine the product scope or redesign the UX.

Prefer:

1. the simplest implementation that satisfies the feature brief
2. boundaries that match the selected architecture skills and the existing codebase
3. framework entrypoints that stay focused on framework concerns
4. explicit operations or flows for meaningful application behavior
5. abstractions only where they make the implementation clearer, safer, or easier to test
6. readable, focused, maintainable code structure
7. concrete file/module impact over vague architecture language
8. testable technical decisions
9. explicit risks, tradeoffs, and open questions

Avoid:

- product scope expansion disguised as technical design
- UI decisions that contradict the UX artifact
- speculative abstractions
- generic architecture diagrams without implementation value
- architecture-specific concepts unless they come from the selected architecture skills or existing codebase
- leaking external tool, storage, protocol, or framework details into places where they do not belong
- user stories or tickets; leave those for a later delivery-planning or scrum-master skill

## Workflow

1. Read `docs/product-vision.md`.
2. Read the `clean-code` skill.
3. Read the user-selected architecture skills, if any.
4. Read the required feature brief.
5. If the feature has UI changes, read the UX artifact from the `ux-expert` skill plus any selected frontend/framework skills.
6. Inspect the relevant repo files and existing flows before proposing changes.
7. Identify affected product areas, existing flows, executable operations, framework entrypoints, data storage, integrations, UI components, and tests.
8. Choose the lightest architecture that preserves clear boundaries and clean implementation.
9. Document the proposed design with enough specificity for implementation and later user-story generation.
10. Separate decisions from open questions. Do not silently assume risky product, UX, or architecture choices.

## Output location

Always create or update a Markdown technical design file at:

```txt
docs/features/<feature-slug>/technical_design.md
```

Use the same short kebab-case feature slug as the feature brief. Keep all artifacts for the same feature together under `docs/features/<feature-slug>/`; do not place technical designs in product, UX, user story, or implementation plan files.

## Output format

Prefer a concise Markdown technical design with these sections when useful:

```md
# Technical Design: <Feature Name>

## Input Artifacts
- Product vision: <path/title>
- Feature brief: <path/title>
- UX artifact: <path/title or "Not applicable / missing">
- Architecture skills: <selected architecture skills or "None selected">

## Summary
<Short engineering summary of what will be built.>

## Goals
- <Technical outcome required by the feature brief.>

## Non-Goals
- <Technical/product/UX work intentionally excluded.>

## Product / UX Implications
<Only the implications that materially affect the implementation.>

## Existing System Context
<Relevant existing files, modules, entrypoints, workflows, data models, integrations, and constraints.>

## Proposed Technical Approach
<High-level implementation approach and rationale.>

## Architecture and Boundaries
- Selected architecture guidance:
- Core responsibilities:
- Execution flow:
- Framework entrypoints:
- Data/storage boundaries:
- Integration boundaries:
- Abstractions introduced or reused:

## UI / Frontend Design
<Only if relevant. Components, routes, Server vs Client Component boundaries, state ownership, responsive behavior, and UX artifact alignment.>

## Code Quality / Maintainability Notes
<Clean-code implications: naming, module boundaries, focused units, duplication risks, and simplicity concerns.>

## API / Route Changes
<New or changed endpoints, route handlers, server actions, request/response shapes, or "None".>

## Data Model / Persistence Changes
<Schema changes, migrations, repositories, indexes, lifecycle, backfills, or "None".>

## External Integrations
<Auth, AI providers, background jobs, queues, or other external systems if relevant.>

## Error Handling and Edge Cases
<How product edge cases and technical failures should behave.>

## Testing Strategy
- Unit:
- Integration:
- E2E / manual:
- Fixtures / mocks:

## Rollout / Migration Plan
<How to ship safely if needed, or "Not needed".>

## Risks and Tradeoffs
- <Risk/tradeoff and mitigation.>

## Implementation Plan
1. <Ordered implementation step.>
2. <Ordered implementation step.>

## Open Technical Questions
- <Decision needed before or during implementation.>
```

Use only sections that help. Keep the doc specific enough that a later scrum-master or delivery-planning skill can turn it into clear implementation stories without rediscovering architecture decisions.
