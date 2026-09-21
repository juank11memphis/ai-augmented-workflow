---
name: software-design-writer
description: Create or revise a feature Software Design Document (SDD) at the feature-local sdd.md from its BRD, project SAD, selected architecture guidance and required UX, with embedded Mermaid behavior diagrams.
---

# Software Design Writer

Write only `docs/features/<feature-slug>/sdd.md` as the feature-design output. Explain how the feature works internally with enough local context for Scrum and implementation workers, not exhaustive coding checklists or duplicated system architecture.

## Prerequisites and ownership

Read `docs/architecture.md`, `docs/features/<feature-slug>/brd.md`, selected architecture guidance, relevant repository context, and `docs/features/<feature-slug>/ux.md` when the feature has UI impact. Read applicable clean-code and implementation skills without duplicating them. A missing BRD routes to `business-requirements-writer`; `docs/architecture.md` missing or insufficient routes to `software-architecture-writer`; missing required UX routes to `ux-expert`. Explain the missing input and stop rather than use old-file fallback.

Before interviewing or writing, identify and read the workflow's selected architecture skill. Missing, unavailable, or ambiguous guidance requires workflow repair: run `sibu sync`. Do not choose, infer, or substitute a style. Conflicting guidance requires clarification. Selected guidance and SAD boundaries are binding.

UI mockups in UX are binding goals for structure, hierarchy, content, interactions and breakpoint layouts, not redesign targets. Surface feasibility conflicts for UX revision.

If the feature needs changed module boundaries or system-wide architecture decisions, pause SDD work and give a focused request for `software-architecture-writer`. Do not edit the SAD or invent new modules. Resume only after corrected SAD context and a user request to continue. Local algorithms and interface details that fit existing boundaries stay within SDD scope; do not force unnecessary SAD rework. Do not modify upstream artifacts, Scrum artifacts, implementation plans, or production code.

## Feature design content

Use proportionate sections for inputs and requirement coverage, summary, selected SAD modules and boundaries, responsibilities/interfaces, main execution flow, relevant data/state changes, failure behavior, important security/concurrency concerns, quality strategy and concrete verification, and risks/tradeoffs. Omit irrelevant detail. Separate planned verification from commands actually run. Keep exhaustive class/method inventories and story implementation checklists out.

Carry source BRD requirement IDs and qualify references with `docs/features/<feature-slug>/brd.md`; verify IDs resolve to its entries. Surface missing, invalid, or conflicting references instead of inventing IDs. Map relevant IDs to decisions and planned verification without requiring a standalone matrix. Require sufficient BRD context, not approval fields, signatures or sign-off.

Name relevant existing SAD modules and include sufficient promises/interfaces, ownership/exclusions, hidden complexity, and dependencies for downstream workers without copying the entire SAD. Apply selected architecture to concrete feature boundaries and ordering. If context is insufficient or contradictory, clarify upstream rather than guessing.

## Quality strategy

Specify unit, acceptance/integration, edge/failure, and regression tests relevant to the feature. Use property/invariant, torture/fuzz, mutation, or manual QA only when risk warrants them; explain material skips. Identify validation commands where known without claiming they ran. Keep planned verification intent distinct from observed results.

## Visual explanation

Every SDD embeds at least one explanatory Mermaid diagram. For an interaction-driven feature use a main-flow sequence diagram showing the trigger, relevant participants, interactions/data, responses, and meaningful branches/failures. For a change with no meaningful interaction flow, include a suitable structural flowchart, state or data diagram and explain why a sequence would misrepresent the change. The exception changes diagram type, not the obligation: no completed SDD is diagram-free. Supplement only when useful and never invent unsupported behavior to populate a diagram.

## Discovery and user control

Read the required sources first, then interview one focused question at a time about remaining material decisions. Reuse settled answers; do not mechanically repeat questions answered by the user or sources. Ask meaningful follow-ups to partial answers and resolve material uncertainty instead of inventing decisions. There is no question-count limit or shortcut for complex work. Small changes need proportionate discovery, not filler questions.

Before writing, perform a final conversational check-in: “I am clear on my end. Is there anything else to cover before I write?” Incorporate corrections and wait for the response. This closes discovery, not a document sign-off ceremony. Do not add approval fields, signatures, or approval statuses. Never automatically execute the next stage; the user chooses progression. Preserve code-change permissions, story-level review, sync ownership choices, and external mutation authorization.

## Embedded Mermaid validation

Inspect locally available parser/render capabilities without installing dependencies, fetching packages, or uploading private diagrams externally without permission. Check the exact final Mermaid blocks with an available parser or renderer. Correct reported failures and recheck after edits. Record the tool/version when obtainable and actual outcome in the document. Parsing proves syntax acceptance, not rendering; claim rendering only when it ran. Known unresolved parse/render errors remain blockers: report the specific failure, never relabel it a manual pass or claim success.

When tooling is unavailable, inspect syntax and relationships manually and state “manual-only; parser/render validation unavailable.” Writing with this limitation is allowed. Separately review semantic accuracy: actors, ordering, module boundaries, responses, and meaningful failure paths. Prefer conservative syntax, simple IDs, declared participants, balanced fences/quotes/blocks, single-line quoted labels, explicit subgraph spacing, and quoted punctuation-bearing edge labels. Avoid semicolons in sequence messages, raw multiline labels, and unsupported version-specific syntax.

Return the written path and actual validation limits concisely. Keep diagrams and validation notes embedded, not in a separate companion.
