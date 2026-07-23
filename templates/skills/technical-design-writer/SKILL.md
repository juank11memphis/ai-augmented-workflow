---
name: technical-design-writer
description: Use this skill to turn an approved feature brief into a concise, implementation-oriented technical design that delegates code-quality and architecture details to the relevant skills instead of restating them.
---

# technical-design-writer

Write the smallest useful technical design doc for an approved feature: enough for a human to understand the implementation direction and a later coding agent to know what to do next. Avoid filler, generic engineering advice, and restating other skills.

## Pipeline Contract

### What this skill needs

- A Markdown feature brief at `docs/features/<feature-slug>/feature_brief.md`.
- `docs/deep-module-map.md`.
- Enough feature and module context to map the feature brief to one or more existing Deep Modules during technical design.
- Relevant existing repo files and flows needed to make implementation direction concrete.
- `docs/features/<feature-slug>/ux.md` only when the feature has UI impact.
- Selected architecture guidance installed under `.agents/skills/architecture/` or rendered as the selected architecture skill path for this workflow.
- Relevant implementation guidance skills such as `clean-code`, language skills, framework skills, or database skills.

### What this skill writes

- `docs/features/<feature-slug>/technical_design.md`.

### When this skill stops

- The feature brief is missing or the user only has a vague feature idea; direct the user to `feature-brief-writer`.
- `docs/deep-module-map.md` is missing; direct the user to `deep-module-map-writer`.
- The feature brief and Deep Module Map cannot be reconciled to existing Deep Modules after focused clarification, or the selected modules are missing, ambiguous, or inconsistent with the map.
- The feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing; direct the user to `ux-expert`.
- Selected architecture guidance is missing or cannot be identified; stop and tell the user to run `sibu sync` to repair workflow configuration before technical design. Do not choose, infer, or substitute architecture guidance yourself.
- The request belongs to another pipeline stage, such as feature definition, UX design, Scrum planning, implementation planning, or implementation execution.

### What this skill must not do

- Do not create or update product visions, Deep Module Maps, feature briefs, UX specs, Epics, User Stories, implementation plans, or production code.
- Do not invent new Deep Modules or move work into modules that cannot be justified from the Feature Brief and Deep Module Map.
- Do not redesign binding UX mockups.
- Do not duplicate architecture, language, framework, or clean-code skill guidance.
- Do not choose or infer architecture guidance when it is missing; selected architecture is repo-owned workflow configuration repaired through `sibu sync`.
- Do not skip the interview or the final “I am clear; are you good?” check-in before writing. Once the user confirms there is nothing else to cover, write without requiring a recap, artifact approval, or separate summary confirmation.

## Grounding

Before writing, read:

1. `docs/product-vision.md`
2. `docs/deep-module-map.md`
3. the feature brief
4. `docs/features/<feature-slug>/ux.md` when the feature has UI impact
5. `clean-code`
6. the selected architecture skill for this workflow
7. any selected language, framework, or database skills that apply
8. relevant existing repo files and flows

Apply those inputs. Do not summarize them back into the technical design unless a specific implication changes the implementation.


## Selected architecture guidance gate

Before interviewing or writing, identify the workflow's selected architecture skill and read its installed guidance. If selected architecture guidance is missing, unavailable, or ambiguous, hard-stop and tell the user to run `sibu sync` to repair Sibu workflow configuration. Do not choose an architecture, infer one from the codebase, or proceed with generic architecture advice.

When selected architecture guidance is present, treat it as binding for design order, module/layer boundaries, dependency direction, and concrete implementation boundaries. Apply it through the technical design by naming project-specific boundaries and sequencing decisions; do not paste or restate the architecture skill itself.

## Required input

Require a Markdown feature brief. If the user only has a vague idea, route to `feature-brief-writer` first.

Require `docs/deep-module-map.md`. If it is missing, stop and ask the user to create it with `deep-module-map-writer` first. Do not infer or invent Deep Modules.

Treat the Feature Brief and Deep Module Map as sibling upstream inputs. Older feature briefs may name selected Deep Modules directly; newer feature briefs may omit that section. If the brief names modules, preserve them when they match the map. If it does not, use the approved feature scope plus `docs/deep-module-map.md` to identify the existing modules during technical clarification. If the feature cannot be mapped to existing modules, or the selected modules are missing, ambiguous, or inconsistent with the map, stop and ask the user to update the Feature Brief or Deep Module Map first.

If the feature has UI impact, require `docs/features/<feature-slug>/ux.md`. If it is missing, stop and ask the user to create the UX spec with `ux-expert` first.

## Interview posture

Be deliberately interrogative before drafting. The technical design should reflect resolved implementation direction, not risky assistant assumptions.

This interview is mandatory and non-skippable. Even when the approved artifacts, repo files, codebase, or prior conversation seem complete, ask at least one explicit user-facing technical clarification question before drafting or writing the technical design. Treat repository artifacts, source docs, prior conversation, and initial context as useful but provisional for current implementation intent: they can shape better questions, but they must not replace the interview or become the full source of truth for implementation direction, boundaries, risks, or validation choices. Keep asking focused follow-up questions until the technical decisions are clear enough to defend. Before drafting, always perform one final check-in in the spirit of: “I am clear on my end. Are you good, or is there anything else you want to cover before I proceed?” If the user adds context, incorporate or clarify it before writing.

- Ask one focused question at a time when repository artifacts and source docs do not resolve a material technical ambiguity.
- Ask as many questions as required to reach complete practical understanding; do not optimize for a short interview.
- If a question can be answered by reading repository artifacts, inspect those artifacts instead of asking.
- Prefer follow-up questions over filling gaps with plausible invention.
- When useful, provide your recommended answer or a concise default assumption with the question so the user can confirm, correct, or reject it quickly.
- Treat "enough context" as: existing Deep Modules selected or mapped during technical design, affected code paths, entrypoints, implementation boundaries, important state/data changes, validation approach, and meaningful risks are clear enough to defend in the design.
- If the user gives a partial answer, acknowledge the useful part and ask the next most important unresolved question.
- Do not ask a large questionnaire all at once.
- Do not draft a technical design with an `Open Questions` section; resolve material questions during the interview, or record only known risks/tradeoffs after decisions are made.

## UX binding rule

For UI-related features, `ux.md` is source context, not inspiration. If `ux.md` includes mockups, treat those mockups as binding UI goals for structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the mockups in the technical design. Translate them into implementation direction and call out only technical feasibility issues, missing states, or conflicts that require UX revision.

## Design stance

Translate product intent into implementation direction.

Deep Modules answer “where does this implementation work belong?” Selected architecture guidance answers “how is that module structured internally?” Translate the existing Deep Modules selected or mapped from the Feature Brief plus Deep Module Map into implementation boundaries appropriate for the selected architecture. Capture those boundaries in the technical design so downstream Scrum planning, implementation planning, and execution can trust the technical design instead of rereading the Deep Module Map by default.

When a feature crosses a framework or delivery boundary, include the allowed orchestration/application entrypoint and the forbidden lower-level dependencies. Keep this framework-agnostic: name roles like framework adapter, application/orchestration boundary, domain, port, and infrastructure, then add concrete project paths only where useful.

Prefer:

- concise decisions over long explanation
- concrete file/module impact over abstract architecture language
- current codebase patterns over speculative redesigns
- asking enough focused follow-up questions to resolve material ambiguity before drafting
- delegation to the right skills instead of duplicating their guidance
- preserving named Deep Modules when present and otherwise mapping the Feature Brief to existing Deep Modules during technical design

Avoid:

- restating clean-code, architecture, language, or framework principles
- product scope expansion
- user stories, tickets, or delivery plans
- invented CLI/database/API concepts that the feature brief did not ask for
- inventing new Deep Modules or moving work into modules that cannot be justified from the Feature Brief and Deep Module Map
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
4. Ask one focused follow-up question at a time until material technical ambiguity is resolved.
5. Write the doc at `docs/features/<feature-slug>/technical_design.md`.
6. Keep it concise. Remove any section that does not help implementation.

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
- Deep Module Map: <path>
- Feature brief: <path>
- Delegated skills: <skills later implementation should apply>

## Summary
<2-4 sentences describing the implementation direction.>

## Existing Context
<Only the current files, commands, modules, state, templates, or integrations that materially affect the change.>

## Proposed Design
<Concrete implementation decisions. Include command flows, file/module impact, state changes, and integration boundaries when relevant.>

<Explain how the existing Deep Modules selected or mapped during technical design translate into architecture, module, command, file, or implementation boundaries when that affects downstream work.>

<For framework/delivery entrypoints, state the application/orchestration API they may call and the lower-level layers, modules, or paths they must not call directly.>

## Validation
<Focused test/build/manual checks.>

## Risks / Tradeoffs
- <Only meaningful risks or tradeoffs that remain after decisions are resolved.>
```

## Quality bar

A good technical design is short, specific, and useful. It should not try to be the product brief, architecture skill, clean-code skill, implementation plan, or ticket backlog.

## Final response behavior

After writing the file, final-answer with only the path created or updated. Do not paste the technical design body, excerpt, outline, or section summaries.

Only include the full technical design when the user explicitly asks for inline review in the current request.
