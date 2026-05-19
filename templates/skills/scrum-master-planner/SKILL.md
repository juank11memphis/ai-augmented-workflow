---
name: scrum-master-planner
description: Create pragmatic Epics and User Stories from an approved feature brief and technical design. Use when asked to plan delivery, create epics, write user stories, split a feature into backlog work, or turn a feature brief plus technical design under docs/features into Scrum planning artifacts.
---

# Scrum Master Planner

## Purpose

Turn an approved feature brief and technical design into the smallest useful Scrum planning structure: Epics and User Stories that are clear enough for a team to implement and validate.

This skill owns delivery planning artifacts. It does not own product vision, feature definition, technical design, code implementation, or project-management tool automation.

## Pipeline Contract

### What this skill needs

- `docs/features/<feature-slug>/feature_brief.md`.
- `docs/features/<feature-slug>/technical_design.md`.
- `docs/features/<feature-slug>/ux.md` only when the feature has UI impact.
- Enough source-artifact detail to create delivery slices without inventing product scope or implementation boundaries.

### What this skill writes

- `docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md`.
- `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<user-story-slug>.md`.
- Supporting Epic and Story directories under the same feature tree when needed.

### When this skill stops

- The feature brief or technical design is missing; direct the user to the owning prior stage.
- The feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- A prior artifact is obviously incomplete or invalid in a way its owning stage should repair.
- The request belongs to another pipeline stage, such as product definition, technical design, UX design, implementation planning, or implementation execution.

### What this skill must not do

- Do not create or update product visions, Deep Module Maps, feature briefs, technical designs, UX specs, implementation plans, or production code.
- Do not modify prior-stage artifacts.
- Do not reread `docs/deep-module-map.md` by default; trust `technical_design.md` for Deep Module implementation boundaries.
- Do not add product scope or architecture decisions absent from the feature brief and technical design.

## Required inputs

Before planning, read:

```txt
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
docs/features/<feature-slug>/ux.md  # when the feature has UI impact
```

Also read `docs/product-vision.md` when it exists and the planning decision depends on product fit, scope boundaries, user value, or success signals.

If the feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before Scrum planning.

When `ux.md` includes mockups, treat them as binding UI goals. Epics and Stories must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI in Scrum planning; create delivery slices that implement the approved UX.

## Hard start rule

Do not create Epics or User Stories if either the feature brief or technical design is missing.

If an input is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create the missing artifact first.
4. Do not invent planning scope from partial context.

## Output locations

For a feature at:

```txt
docs/features/<feature-slug>/feature_brief.md
```

write Epics and User Stories under:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<user-story-slug>.md
```

Rules:

- Every User Story must belong to exactly one Epic.
- Never create orphan User Stories outside an Epic folder.
- Use kebab-case slugs for Epic folders and User Story filenames.
- Prefix every User Story filename with a two-digit execution order within its Epic, such as `01-`, `02-`, or `03-`.
- Use the same order number for User Stories that can be developed in parallel within the same Epic.
- Keep all artifacts for the feature under the same `docs/features/<feature-slug>/` tree.

## Planning rule

Create the smallest useful planning structure. Use one Epic and one User Story when that fully captures the work. Add more only for distinct outcomes, delivery slices, risks, dependencies, validation paths, or contributor ownership boundaries. Avoid Agile theater.

## Workflow

### 1. Read source artifacts

Identify from the feature brief:

- user/customer problem
- MVP scope
- out-of-scope boundaries
- success signals
- business-level acceptance criteria

Identify from the technical design:

- implementation slices
- affected commands, files, modules, integrations, or docs
- validation expectations
- meaningful risks or unresolved decisions

### 2. Choose Epic boundaries

Create Epics around coherent delivery outcomes, not technical layers.

Good Epic boundaries include:

- a user-visible capability
- a complete CLI workflow
- a self-contained documentation or planning outcome
- a risk-reduction slice needed before broader work
- a contributor-owned chunk that can be reviewed independently

Avoid Epics that are only generic layers such as “frontend,” “backend,” “tests,” or “refactor” unless the source docs explicitly make that the delivery outcome.

### 3. Write each Epic brief

Each `epic_brief.md` should use this structure:

```md
# <Epic Name> Epic Brief

## Summary
<What outcome this Epic delivers and why it matters.>

## Source Context
- Feature brief: <relative path>
- Technical design: <relative path>

## Scope
- <What belongs in this Epic.>

## Out of Scope
- <What this Epic intentionally does not cover.>

## User Stories
- [<Story title>](./stories/<order>-<user-story-slug>.md)

## Acceptance Criteria
- <Epic-level criteria that prove the outcome is complete.>

## Dependencies / Risks
- <Only meaningful dependencies, risks, or sequencing notes.>
```

Adapt headings only when it improves clarity. Keep the Epic brief short.

### 4. Sequence and write User Stories

Within each Epic, decide the order of execution before writing User Story files. Use the lowest practical sequence number for the first story that should be implemented, then increment only when later stories depend on earlier work. If two or more stories can be developed at the same time, give them the same order number.

Each User Story should be independently understandable, reviewable, and deployable.

A User Story represents a shippable increment that can move from backlog to Done and be merged safely on its own. It may be hidden behind feature flags, internal-only paths, disabled defaults, or incomplete parent-Epic workflows, but it must leave the product in a valid deployable state without requiring unmerged sibling Stories.

Use this structure:

```md
# <User Story Title>

## Epic
[<Epic Name>](./epic_brief.md)

## User Story
As a <user or contributor>, I want <capability or outcome>, so that <value or reason>.

## Context
<Brief source-grounded context.>

## Scope
- <What this story includes.>

## Out of Scope
- <What this story excludes.>

## Acceptance Criteria
- <Observable, testable behavior or artifact.>

## Validation
- <Manual or automated checks from the technical design.>

## Notes
- <Optional implementation, sequencing, or risk notes. Omit if not useful.>
```

Keep Stories concrete, but do not turn them into implementation plans or task checklists. If detailed implementation guidance is needed, point to the technical design instead of restating it.

### 5. Check coverage and boundaries

Before finishing, verify:

- every MVP scope item from the feature brief is covered by at least one Epic or Story, or intentionally left out with a reason
- every Story belongs to exactly one Epic
- every Story filename includes a two-digit execution order prefix
- Stories with the same order number are actually parallelizable
- every Story can be merged and deployed safely on its own, even if its user-facing value is gated or incomplete until the Epic is done
- Story count is pragmatic, not inflated
- no Story adds scope that is absent from the feature brief or technical design
- acceptance criteria are testable enough for a reviewer

## Final response behavior

After writing files, final-answer with only:

- the Epic directories created or updated
- the number of Epics and User Stories
- any source-scope items intentionally left unresolved or captured as risks

Do not paste artifact bodies, excerpts, outlines, story text, acceptance criteria, or section summaries. Only include generated artifacts when the user explicitly asks for inline review in the current request.
