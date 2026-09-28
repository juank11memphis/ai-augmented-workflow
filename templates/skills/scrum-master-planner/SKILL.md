---
name: scrum-master-planner
description: Create pragmatic Epics and User Stories from a sufficiently clear BRD and software design. Use when asked to plan delivery, create epics, write user stories, split a feature into backlog work, or turn a BRD plus software design under docs/features into Scrum planning artifacts.
---

# Scrum Master Planner

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

## Purpose

Turn a sufficiently clear BRD and software design into the smallest useful Scrum planning structure: Epics and User Stories that are clear enough for a team to implement and validate.

This skill owns delivery planning artifacts. It does not own product vision, feature definition, software design, code implementation, or project-management tool automation.

## Pipeline Contract

### What this skill needs

- `docs/features/<feature-slug>/brd.md`.
- `docs/features/<feature-slug>/sdd.md`.
- `docs/features/<feature-slug>/ux.md` only when the feature has UI impact.
- Enough source-artifact detail to create delivery slices without inventing product scope or implementation boundaries.

### What this skill writes

- `docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md`.
- `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<user-story-slug>.md`.
- Supporting Epic and Story directories under the same feature tree when needed.

### When this skill stops

- The BRD or software design is missing; direct the user to the owning prior stage.
- The feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- A prior artifact is obviously incomplete or invalid in a way its owning stage should repair.
- The request belongs to another pipeline stage, such as product definition, software design, UX design, implementation planning, or implementation execution.

### What this skill must not do

- Do not create or update product visions, Software Architecture Documents, BRDs, software designs, UX specs, implementation plans, or production code.
- Do not modify prior-stage artifacts.
- Do not reread `docs/architecture.md` by default; trust `sdd.md` for Deep Module implementation boundaries.
- Do not add product scope or architecture decisions absent from the BRD and software design.

## Required inputs

Before planning, read:

```txt
docs/features/<feature-slug>/brd.md
docs/features/<feature-slug>/sdd.md
docs/features/<feature-slug>/ux.md  # when the feature has UI impact
```

Also read `docs/product-vision.md` when it exists and the planning decision depends on product fit, scope boundaries, user value, or success signals.

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

If the feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before Scrum planning.

When `ux.md` includes mockups, treat them as binding UI goals. Epics and Stories must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI in Scrum planning; create delivery slices that implement the approved UX.

## Hard start rule

Do not create Epics or User Stories if either the BRD or software design is missing.

If an input is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create the missing artifact first.
4. Do not invent planning scope from partial context.

## Output locations

For a feature at:

```txt
docs/features/<feature-slug>/brd.md
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

Identify from the BRD:

- user/customer problem
- MVP scope
- out-of-scope boundaries
- success signals
- business-level acceptance criteria

Identify from the software design:

- implementation slices
- affected commands, files, modules, integrations, or docs
- quality strategy and validation expectations
- meaningful risks or unresolved decisions

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

### 2. Choose Epic boundaries

Create Epics around one coherent delivery outcome each, not technical layers. Split unrelated outcomes even when combining them would reduce the Epic count. Name the existing capabilities served and keep each Epic's Stories in a meaningful delivery sequence.

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

**Epic ID:** <stable ID>

## Summary
<What outcome this Epic delivers and why it matters.>

## Source Context
- BRD: <relative path, applicable sections and requirement IDs>
- Technical design: <relative path and applicable SDD sections>
- Domain and capabilities: <applicable Business Domain Model and Capabilities Map sections; name served capabilities>
- UX: <applicable UX document sections when this Epic includes UI changes, otherwise `not applicable`>

## Scope
- <What belongs in this Epic.>

## Out of Scope
- <What this Epic intentionally does not cover.>

## User Stories and Sequence
1. [<Story ID and title>](./stories/<order>-<user-story-slug>.md) — <outcome; dependencies or `none`>

## Acceptance Criteria
- <Observable condition proving this one outcome is complete.>

## Dependencies / Risks
- <Only meaningful dependencies, risks, or sequencing notes.>
```

Use this section order and keep the Epic brief short. Record meaningful cross-Story dependencies and an explicit completion condition; do not group unrelated outcomes or only technical layers. Reference applicable source sections and valid BRD requirement IDs rather than copying upstream contracts.

### 4. Sequence and write User Stories

Within each Epic, decide the order of execution before writing User Story files. Use the lowest practical sequence number for the first story that should be implemented, then increment only when later stories depend on earlier work. If two or more stories can be developed at the same time, give them the same order number.

Each new User Story should be independently understandable, reviewable in one sitting, and deployable as one working vertical increment. Prefer one primary bounded context and name necessary cross-context collaboration. Split unrelated behaviors or a horizontal-only layer rather than finalizing an incomplete Story.

A User Story represents a shippable increment that can move from backlog to Done and be merged safely on its own. It may be hidden behind feature flags, internal-only paths, disabled defaults, or incomplete parent-Epic workflows, but it must leave the product in a valid deployable state without requiring unmerged sibling Stories.

Use this structure:

```md
# <User Story Title>

**Story ID:** <stable ID>

## Epic
[<Epic Name>](./epic_brief.md)

**Status:** draft | ready-for-planning | in-progress | done

## User Story
As a <user or contributor>, I want <capability or outcome>, so that <value or reason>.

## Context and Source Traceability
- BRD: <relative path, applicable sections and valid requirement IDs>
- SDD: <relative path and applicable sections/contracts>
- Domain and capability: <applicable Business Domain Model and Capabilities Map sections; name served capability>
- UX: <applicable UX sections when UI changes, otherwise `not applicable`>

## In Scope
- <What this story includes.>

## Out of Scope
- <What this story excludes.>

## Acceptance Criteria
- **AC-01 — <name>:** <Observable pass/fail outcome and source BRD ID>. Verification: test | build/check | visual comparison | needs human/LLM-judge review.

## Verification Expectations
- <Reviewable evidence expected for this story, proportionate to risk.>

## Validation
- <Likely manual or automated checks from the software design.>

## Domain Context
<Primary bounded context, applicable aggregates/events and collaborators; `not applicable` for irrelevant details.>

## Technical Context
<Affected layer and applicable SDD sections/contracts by reference, not copied design.>

## UX References
<Applicable UX sections and mockups, or `not applicable`.>

## Non-Functional Criteria
<Applicable sourced conditions and thresholds, or `not applicable`; invent none.>

## Deployability and Feature Flag
**Behind flag:** no | <named flag when already supported by source design>.
<Why this working increment can be merged and deployed without unmerged sibling Stories; applicable safe defaults or migration notes, or `not applicable`.>

## Dependencies
<Stories this depends on and Stories it blocks, or `none`.>

## Open Questions and Assumptions
<Unresolved questions and separately identified accepted assumptions, or `none`.>
```

Keep this section order for every new Story. Mark irrelevant details `not applicable` or `none` instead of inventing them. Keep Stories concrete, but do not turn them into implementation plans or task checklists. If detailed implementation guidance is needed, point to the software design instead of restating it. A `ready-for-planning` status requires no unresolved material question; record accepted assumptions explicitly. Readiness does not authorize implementation.

Keep `## Acceptance Criteria`, `## Verification Expectations`, and `## Validation` distinct:

- Acceptance Criteria stay behavior-focused: observable product, workflow, or artifact outcomes that must be true.
- Each criterion has a stable local ID, an observable pass/fail outcome, its applicable source BRD ID, and a verification label: test, build/check, visual comparison, or `needs human/LLM-judge review`. Use concrete examples where helpful; do not invent subjective or numeric thresholds.
- Verification Expectations stay evidence-focused: the confidence reviewers should expect from tests, focused review, manual checks, or justified omissions. Derive them from the BRD, the software design quality strategy, and embedded SDD diagrams.
- Validation stays command/check-focused: likely checks the implementer can run, without duplicating implementation-plan steps.

Verification expectations should name the smallest useful evidence for the story risk. Consider unit, acceptance/integration, edge/failure, and regression checks by default. Mention property/invariant, torture/fuzz, mutation, or manual QA only when the source artifacts or risk profile make them valuable; do not require every verification type for every story. Do not create dedicated test-only stories by default unless the source artifacts explicitly call for them or the risk justifies a separate validation slice.

### 5. Check coverage and boundaries

Before finishing, verify:

- enumerate distinct behaviors or outcomes in each proposed Story; split unrelated ones and reject horizontal-only database, backend, frontend, or test layers that need unmerged siblings to work
- size by deployable value and one-sitting human reviewability, not task count or elapsed time; roughly three to six acceptance criteria is a review heuristic, not a hard cap, and extra criteria trigger a split review
- missing or contradictory source IDs, contracts, domain facts, or capability references are returned to the owning upstream stage instead of guessed
- material open questions keep a Story in `draft` until resolved or explicitly accepted as assumptions

- every MVP scope item from the BRD is covered by at least one Epic or Story, or intentionally left out with a reason
- every Story belongs to exactly one Epic
- every Story filename includes a two-digit execution order prefix
- Stories with the same order number are actually parallelizable
- every Story can be merged and deployed safely on its own, even if its user-facing value is gated or incomplete until the Epic is done
- Story count is pragmatic, not inflated
- no Story adds scope that is absent from the BRD or software design
- acceptance criteria are testable enough for a reviewer

Apply these authoring rules to newly created Epics and Stories only; do not retrofit existing planning artifacts or change downstream implementation-planner behavior.

## Final response behavior

After writing files, final-answer with only:

- the Epic directories created or updated
- the number of Epics and User Stories
- any source-scope items intentionally left unresolved or captured as risks

Do not paste artifact bodies, excerpts, outlines, story text, acceptance criteria, or section summaries. Only include generated artifacts when the user explicitly asks for inline review in the current request.

## BRD handoff

Reference covered source BRD requirement IDs in Epics, Stories, and their acceptance criteria.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
