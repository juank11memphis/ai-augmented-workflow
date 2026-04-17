---
name: scrum-master-planner
description: Create pragmatic Epics and User Stories from an approved feature brief and technical design. Use when asked to plan delivery, create epics, write user stories, split a feature into backlog work, or turn a feature brief plus technical design under docs/features into Scrum planning artifacts.
---

# Scrum Master Planner

## Purpose

Turn an approved feature brief and technical design into the smallest useful Scrum planning structure: Epics and User Stories that are clear enough for a team to implement and validate.

This skill owns delivery planning artifacts. It does not own product vision, feature definition, technical design, code implementation, or project-management tool automation.

## Required inputs

Before planning, read:

```txt
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
```

Also read `docs/product-vision.md` when it exists and the planning decision depends on product fit, scope boundaries, user value, or success signals.

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
docs/features/<feature-slug>/epics/<epic-slug>/<user-story-slug>.md
```

Rules:

- Every User Story must belong to exactly one Epic.
- Never create orphan User Stories outside an Epic folder.
- Use kebab-case slugs for Epic folders and User Story filenames.
- Keep all artifacts for the feature under the same `docs/features/<feature-slug>/` tree.

## Planning rule

Create the smallest useful planning structure.

If one Epic with one User Story fully captures the work, create one Epic and one User Story. Add more Epics or User Stories only when there are meaningfully distinct outcomes, delivery slices, risks, dependencies, validation paths, or contributor ownership boundaries.

Avoid Agile theater. Do not create multiple Epics or Stories just because Scrum artifacts usually appear in groups.

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
- [<Story title>](./<user-story-slug>.md)

## Acceptance Criteria
- <Epic-level criteria that prove the outcome is complete.>

## Dependencies / Risks
- <Only meaningful dependencies, risks, or sequencing notes.>
```

Adapt headings only when it improves clarity. Keep the Epic brief short.

### 4. Write User Stories

Each User Story should be independently understandable and should represent a reviewable slice of work.

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
- Story count is pragmatic, not inflated
- no Story adds scope that is absent from the feature brief or technical design
- acceptance criteria are testable enough for a reviewer

## Final response behavior

After writing files, briefly report:

- the Epic directories created or updated
- the number of Epics and User Stories
- any source-scope items intentionally left unresolved or captured as risks

Do not paste all generated artifacts unless the user asks to review them inline.
