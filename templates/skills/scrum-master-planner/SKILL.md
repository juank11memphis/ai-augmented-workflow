---
name: scrum-master-planner
description: Create pragmatic Epics and User Stories from a sufficiently clear BRD and software design. Use when asked to plan delivery, create epics, write user stories, split a feature into backlog work, or turn a BRD plus software design under docs/features into Scrum planning artifacts.
---

# Scrum Master Planner

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

## Purpose

Turn a sufficiently clear BRD and software design into the smallest useful Scrum planning structure: Epics and User Stories that are clear enough for a team to implement and validate.

This skill owns delivery planning definitions in GitHub issues. It does not own product vision, feature definition, software design, code implementation, or a CLI GitHub delivery engine.

## Pipeline Contract

### What this skill needs

- `docs/features/<feature-slug>/brd.md`.
- `docs/features/<feature-slug>/sdd.md`.
- `docs/features/<feature-slug>/ux.md` only when the feature has UI impact.
- Enough source-artifact detail to create delivery slices without inventing product scope or implementation boundaries.

### What this skill writes

- Epic issues as native sub-issues of the existing Feature issue.
- Story issues as native sub-issues of exactly one Epic issue.
- Settled definitions and acceptance criteria in each owning issue body, not duplicate local Epic or Story files.

### When this skill stops

- The BRD or software design is missing; direct the user to the owning prior stage.
- The feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- A prior artifact is obviously incomplete or invalid in a way its owning stage should repair.
- The request belongs to another pipeline stage, such as product definition, software design, UX design, implementation planning, or implementation execution.
- The project GitHub repository, Feature issue identity, GitHub MCP issue access, or native sub-issue operation is unavailable. Name the missing prerequisite and stop; do not substitute flat links or local files.

### What this skill must not do

- Do not create or update product visions, Software Architecture Documents, BRDs, software designs, UX specs, implementation plans, or production code.
- Do not modify prior-stage artifacts.
- Do not reread `docs/architecture.md` by default for ordinary planning; read it when an accepted flag needs the project's established flag mechanism.
- Do not add product scope or architecture decisions absent from the BRD and software design.

## Required inputs

Before planning, read only the published prerequisites needed for this stage through GitHub MCP into session context:

```txt
docs/features/<feature-slug>/brd.md
docs/features/<feature-slug>/sdd.md
docs/features/<feature-slug>/ux.md  # when the feature has UI impact
```

Resolve these artifacts on the identified Feature issue, confirming each artifact identity and published content before using it. A local or unpublished draft is not a settled prerequisite. Read each unchanged prerequisite once per planning session; reuse session context instead of repeatedly fetching it. Do not download a feature folder, persist an on-disk feature-artifact cache, or write local feature artifacts. If required content is missing, stale, conflicting, or inaccessible, name the affected artifact and stop before downstream planning or writes.

Also read `docs/product-vision.md` when it exists and the planning decision depends on product fit, scope boundaries, user value, or success signals.

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

If the feature has UI impact and its published `ux.md` artifact is missing, stop and ask the user to create it with `ux-expert` before Scrum planning. Do not write a local feature-artifact cache.

When `ux.md` includes mockups, treat them as binding UI goals. Epics and Stories must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI in Scrum planning; create delivery slices that implement the approved UX.

## Hard start rule

Do not create Epic or Story issues if either published BRD or software design artifact is missing.

If an input is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to publish the missing artifact first.
4. Do not invent planning scope from partial context.

## GitHub issue hierarchy

Identify the intended GitHub repository and existing Feature issue before any write. Confirm GitHub MCP can read issues and create native sub-issues in that repository. For each planned Epic, find an existing matching Epic under that Feature before creating one; use its confirmed issue ID as the parent for its Stories. For each Story, find a matching Story under its intended Epic before creating one. Reuse matching issues rather than duplicating them; if identity or parentage conflicts, stop for reconciliation. Use native parent operations, not a flat list of issue links. Confirm each created or reused parent relationship by readback before proceeding. If a write response is uncertain, read back the intended parent and child before any retry. Never infer success or blindly repeat creation.

Before updating an Epic or Story body, identify its repository, issue ID, and intended content. After a confirmed response or an ambiguous response such as a timeout, read back that exact issue and compare identity, parentage, and content. If the intended effect is present, do not retry. If absent and the target is unchanged, retry only after that readback; if access, identity, parentage, or content conflicts, stop without retry or downstream Story creation. Report confirmed Epic and Story effects separately from uncertain ones; never call an uncertain publication complete. Status and logs may include safe issue IDs and failure categories, but not credentials or full private artifact bodies.

Put the Epic brief structure and settled Epic acceptance criteria in the Epic issue body. Put the User Story structure and settled Story acceptance criteria in the Story issue body. Do not create local Epic/Story Markdown files or directories as a fallback. GitHub MCP remains the external access boundary; do not add a CLI runtime engine, on-disk cache, exporter dependency, separate Task issues, or GitHub Projects dependency.

Rules:

- Every User Story must belong to exactly one Epic issue, and each Epic issue to the Feature issue.
- Never create orphan Story issues or duplicate issues under a different parent.
- Give Epic and Story issues stable IDs and clear titles; preserve a two-digit Story execution order within its Epic, such as `01`, `02`, or `03`.
- Use the same order number for User Stories that can be developed in parallel within the same Epic.
- Keep issue definitions in their owning issues, not local feature-tree copies.

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

### Conditional feature-flag decision before finalization

While sizing each independently deployable, reviewable slice, assess whether merging it would expose unfinished behavior. Do not ask about flags speculatively for internal-only or backward-compatible increments. A flag defers visibility; it never makes a nonworking horizontal layer deployable.

If a proposed slice needs a flag, pause **before** finalizing its Epic or Stories. Explain the concrete exposure risk and ask whether the user wants to use flags; do not ask the user to determine whether a flag is needed.

- If the user declines, re-slice into a complete, independently deployable and one-sitting-reviewable unflagged increment. If no viable slice exists, present the deployability/reviewability conflict and stop for a human decision. Never silently add a flag or finalize an incomplete horizontal slice.
- If the user accepts, read the target project's `docs/architecture.md` for its project-wide flag mechanism. Reuse an established mechanism without asking how flags work again. If it is missing or ambiguous, ask once how the project should support flags (existing framework, external service, or project-local mechanism). If the user has no preference, give a concise recommendation and obtain an explicit choice. Pause for a user-directed `software-architecture-writer` update to the project SAD; do not invent or record a mechanism only in this feature's SDD.
- With a clear project SAD mechanism, pause for a user-directed `software-design-writer` revision of this feature's SDD. It must record feature-specific flag-off and flag-on behavior, defaults, migration conditions, and safety implications. Ask only for missing feature-specific behavior. Do not edit the SAD or SDD here. Resume planning only after both sources are available and consistent; reread the revised SDD before writing flagged artifacts.

### 3. Write each Epic issue definition

Each Epic issue body should use this structure:

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
1. <Story ID and title, with confirmed Story issue link when published> — <outcome; dependencies or `none`>

## Feature Flags
- <`none`, or each named coarse capability-level flag and the Stories that use it>

## Acceptance Criteria
- <Observable condition proving this one outcome is complete.>

## Dependencies / Risks
- <Only meaningful dependencies, risks, or sequencing notes.>
```

Use this section order and keep the Epic definition short. Record meaningful cross-Story dependencies and an explicit completion condition; do not group unrelated outcomes or only technical layers. Reference applicable source sections and valid BRD requirement IDs rather than copying upstream contracts. For a flagged Epic, name each coarse flag (ideally one per independent capability) and its Story users. Create and link a final Story dedicated to removing all flag code introduced by the Epic **at the same time** as the flagged Stories. The Epic cannot be marked done while those code references remain. Do not assert or check production deployment.

### 4. Sequence and write User Stories

Within each Epic, decide the order of execution before writing Story issues. Use the lowest practical sequence number for the first story that should be implemented, then increment only when later stories depend on earlier work. If two or more stories can be developed at the same time, give them the same order number.

Each new User Story should be independently understandable, reviewable in one sitting, and deployable as one working vertical increment. Prefer one primary bounded context and name necessary cross-context collaboration. Split unrelated behaviors or a horizontal-only layer rather than finalizing an incomplete Story.

A User Story represents a shippable increment that can move from backlog to Done and be merged safely on its own. It may be hidden behind feature flags, internal-only paths, disabled defaults, or incomplete parent-Epic workflows, but it must leave the product in a valid deployable state without requiring unmerged sibling Stories.

Use this structure in each Story issue body:

```md
# <User Story Title>

**Story ID:** <stable ID>

## Epic
<Epic name and confirmed parent issue link>

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
**Behind flag:** no | <named flag supported by the project SAD and feature SDD>.
<Why this working increment can be merged and deployed without unmerged sibling Stories; for flagged work, flag-off preservation and flag-on behavior with applicable safe defaults or migration conditions; otherwise `not applicable`.>

## Dependencies
<Stories this depends on and Stories it blocks, or `none`.>

## Open Questions and Assumptions
<Unresolved questions and separately identified accepted assumptions, or `none`.>
```

Keep this section order for every new Story. Mark irrelevant details `not applicable` or `none` instead of inventing them. Keep Stories concrete, but do not turn them into implementation plans or task checklists. If detailed implementation guidance is needed, point to the software design instead of restating it. A `ready-for-planning` status requires no unresolved material question; record accepted assumptions explicitly. Readiness does not authorize implementation.

Keep `## Acceptance Criteria`, `## Verification Expectations`, and `## Validation` distinct:

For every flagged Story, name its flag and include verifiable acceptance criteria for flag-off preservation of existing behavior and flag-on new behavior. Record applicable safe defaults and migration conditions in deployability notes. Every unflagged Story says `**Behind flag:** no`. The final flag-removal Story must verify, by repository search scoped to executable code and configuration plus human diff review, that no code references to any Epic-introduced flag remain; exclude historical documentation and unrelated identifiers from the search judgment. It is last in the Epic sequence, leaves the capability working without flag code, and does not require production-deployment evidence.

- Acceptance Criteria stay behavior-focused: observable product, workflow, or artifact outcomes that must be true.
- Each criterion has a stable local ID, an observable pass/fail outcome, its applicable source BRD ID, and a verification label: test, build/check, visual comparison, or `needs human/LLM-judge review`. Use concrete examples where helpful; do not invent subjective or numeric thresholds.
- Verification Expectations stay evidence-focused: the confidence reviewers should expect from tests, focused review, manual checks, or justified omissions. Derive them from the BRD, the software design quality strategy, and embedded SDD diagrams.
- Validation stays command/check-focused: likely checks the implementer can run, without duplicating implementation-plan steps.

For each Story slice, map the applicable SDD quality-strategy direction into its acceptance criteria, Verification Expectations, and likely Validation. Preserve required verification methods, relevant scenarios, surfaces, states or UX breakpoints, expected reviewer evidence, human-only judgments and automation limits, and material exclusions or constraints. Carry source BRD requirement IDs and point to the governing SDD section. Include only what applies to this Story; do not copy the whole feature strategy or silently replace a required method with a non-equivalent check. Exact repository commands can be refined later within that direction. If the relevant SDD direction, source alignment, or required UX coverage is missing or contradictory, stop and ask for the owning artifact to be clarified rather than guessing. The SDD is the source of direction, not an approval record; do not add SDD sign-off or routine Story approval.

Verification expectations should name the smallest useful evidence for the story risk. Consider unit, acceptance/integration, edge/failure, and regression checks by default. Mention property/invariant, torture/fuzz, mutation, or manual QA only when the source artifacts or risk profile make them valuable; do not require every verification type for every story. Do not create dedicated test-only stories by default unless the source artifacts explicitly call for them or the risk justifies a separate validation slice.

### 5. Check coverage and boundaries

Before finishing, verify:

- enumerate distinct behaviors or outcomes in each proposed Story; split unrelated ones and reject horizontal-only database, backend, frontend, or test layers that need unmerged siblings to work
- size by deployable value and one-sitting human reviewability, not task count or elapsed time; roughly three to six acceptance criteria is a review heuristic, not a hard cap, and extra criteria trigger a split review
- missing or contradictory source IDs, contracts, domain facts, or capability references are returned to the owning upstream stage instead of guessed
- material open questions keep a Story in `draft` until resolved or explicitly accepted as assumptions

- every MVP scope item from the BRD is covered by at least one Epic or Story, or intentionally left out with a reason
- every Story belongs to exactly one Epic
- every Story issue has a two-digit execution order in its title or definition
- Stories with the same order number are actually parallelizable
- every Story can be merged and deployed safely on its own, even if its user-facing value is gated or incomplete until the Epic is done
- flagged Epics inventory each flag and Story user, include a final flag-code removal Story, and remain incomplete while those references remain
- Story count is pragmatic, not inflated
- no Story adds scope that is absent from the BRD or software design
- acceptance criteria are testable enough for a reviewer

Apply these authoring rules to newly created Epics and Stories only; do not retrofit existing planning artifacts or change downstream implementation-planner behavior. Confirm the native Feature→Epic→Story parent IDs and relevant issue links before reporting success. If confirmation fails, report the unconfirmed step and pause downstream work, rather than presenting a completed hierarchy.

## Final response behavior

After confirmed issue publication, final-answer in a short, linear handoff with only:

- `Feature ready on GitHub` and the confirmed Feature issue link, then the relevant confirmed Epic and Story issue links needed to navigate the new hierarchy
- the number of Epics and User Stories, and `Next: Plan the first Story` (or the actual next planning action)
- any source-scope items intentionally left unresolved or captured as risks

At compact width, show one link and one next action per line; at medium and wide widths, group confirmed Feature/Epic/Story links for orientation without a dashboard or width-only meaning. Use only readback-confirmed issue links. If an Epic or Story write is unconfirmed, say `Epic or Story publication was not confirmed on GitHub`, name the affected issue or parent and what was confirmed, then `Next work is paused. Check GitHub access, then retry.` Do not print a success heading or link for the uncertain effect. Do not paste artifact bodies, excerpts, outlines, story text, acceptance criteria, or section summaries. Only include generated artifacts when the user explicitly asks for inline review in the current request.

## BRD handoff

Reference covered source BRD requirement IDs in Epics, Stories, and their acceptance criteria.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
