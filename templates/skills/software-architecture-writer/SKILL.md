---
name: software-architecture-writer
description: Create or revise the project Software Architecture Document (SAD) at docs/architecture.md, including deep-module boundaries, arc42-based architecture and C4 views after business foundations.
---

# Software Architecture Writer

Write one proportionate project architecture authority at `docs/architecture.md`, not feature implementation design. Use a lean arc42-based structure and meaningful C4 views without claiming standards certification.

## Inputs and boundaries

Read `docs/product-vision.md`, `docs/business-domain-model.md`, `docs/capabilities-map.md`, the existing SAD when revising, and the workflow's selected architecture skill. Missing business foundations route to their respective writers. No feature BRD is required: SAD and BRD are independent branches after the Capabilities Map.

Identify and read selected architecture guidance before interviewing or writing. Missing, unavailable, or ambiguous guidance requires workflow repair through `sibu sync`; do not choose, infer, or substitute a style. Conflicts require focused clarification, not a competing architecture. Apply selected guidance to project boundaries, dependency direction, and executable operations without restating the skill.

Inspect relevant implementation narrowly for an existing system. Distinguish observed implementation from intended architecture. For greenfield systems discover decisions rather than inventing modules or deployed infrastructure. Do not silently transform another artifact into a SAD. Do not write BRDs, feature SDDs, UX, Scrum artifacts, implementation plans, or production code.

## Architecture content

Tailor depth to project complexity; explain genuinely inapplicable views rather than filling empty boilerplate:

- Goals and quality priorities, constraints, system context and external dependencies.
- Solution strategy applying the selected architecture.
- Building-block view: each deep module has a stable name/slug, outside promise/interface, owned responsibilities, excluded responsibilities, hidden complexity, and relevant dependencies. Preserve useful existing boundaries and investigate changes.
- Important runtime scenarios and relevant deployment views.
- Cross-cutting concepts, quality goals and verification approach, decisions/tradeoffs, and risks.
- Link domain vocabulary instead of duplicating it.

Include embedded project context and container-level C4 structural views where meaningful, with deeper views only when useful. Mermaid flowcharts may express these views without specialized C4 syntax. A C4 container is not automatically a deep module: distinguish applications/data stores from source ownership boundaries and explain their mapping. Deployment diagrams are allowed when relevant.

## Discovery and user control

Read the required sources first, then interview one focused question at a time about remaining material decisions. Reuse settled answers; do not mechanically repeat questions answered by the user or sources. Ask meaningful follow-ups to partial answers and resolve material uncertainty instead of inventing decisions. There is no question-count limit or shortcut for complex work. Small changes need proportionate discovery, not filler questions.

Before writing, perform a final conversational check-in: “I am clear on my end. Is there anything else to cover before I write?” Incorporate corrections and wait for the response. This closes discovery, not a document sign-off ceremony. Do not add approval fields, signatures, or approval statuses. Never automatically execute the next stage; the user chooses progression. Preserve code-change permissions, story-level review, sync ownership choices, and external mutation authorization.

## Embedded Mermaid validation

Inspect locally available parser/render capabilities without installing dependencies, fetching packages, or uploading private diagrams externally without permission. Check the exact final Mermaid blocks with an available parser or renderer. Correct reported failures and recheck after edits. Record the tool/version when obtainable and actual outcome in the document. Parsing proves syntax acceptance, not rendering; claim rendering only when it ran. Known unresolved parse/render errors remain blockers: report the specific failure, never relabel it a manual pass or claim success.

When tooling is unavailable, inspect syntax and relationships manually and state “manual-only; parser/render validation unavailable.” Writing with this limitation is allowed. Separately review semantic accuracy: actors, ordering, module boundaries, responses, and meaningful failure paths. Prefer conservative syntax, simple IDs, declared participants, balanced fences/quotes/blocks, single-line quoted labels, explicit subgraph spacing, and quoted punctuation-bearing edge labels. Avoid semicolons in sequence messages, raw multiline labels, and unsupported version-specific syntax.

Return the written path and actual validation limits concisely. Keep diagrams and validation notes embedded, not in a separate companion.
