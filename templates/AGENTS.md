# AGENTS.md

## Project overview

{{PROJECT_OVERVIEW}}

## Security and safety

- Do not commit secrets, credentials, tokens, or other sensitive data.
- Avoid destructive operations unless the user explicitly requests them or confirms the plan.
- Keep changes focused on the requested scope; do not introduce unrelated refactors or enhancements.
- If an implementation becomes materially more complex or risky than expected, stop and ask for explicit approval before continuing.

## Agent-specific instructions

- Before any task that writes or modifies code, propose a brief plan and wait for user confirmation once per requested task.
- Exception: when the user asks to plan, implement, execute, continue, or work through a User Story or Epic with `ai-implementation-plan-executor`, that request is confirmation to generate any missing implementation plan and begin execution immediately. Do not require a separate plan approval gate; wait only for the story-level review after implementation finishes.
- For read-only work, research, planning, documentation-only edits, or other non-code changes, do not ask for confirmation unless the action is destructive, risky, ambiguous, or explicitly requires user approval.
- After confirmation, proceed with all agreed in-scope changes without re-asking.
- Ask again only if the scope changes materially, the approach becomes materially more complex or risky, or the user explicitly asks to review before continuing.
- Use Conventional Commits 1.0.0 for commit messages.

## Context budget discipline

Treat context as a shared budget owned by the user. Prefer narrow, purposeful context before broad reads: search targeted paths, inspect snippets before full files, and avoid dependency, generated, build, cache, and lockfile content unless relevant.

Do not dump full files, full diffs, broad recursive scans, or uncapped command output unless needed for quality or explicitly requested. Summarize large diffs, logs, command output, and generated artifacts by default, with focused excerpts when they support a decision.

Keep responses concise by default, but spend the context needed for correctness, safety, validation, human control, or required context gathering. Warn or ask before optional expensive context operations.

## Communication style

- Keep responses as short as practical while still being clear and useful.
- Prefer concise, pragmatic answers over long explanations.
- Ask focused questions when needed; otherwise make reasonable assumptions and proceed.
- If the user wants more detail, they can ask follow-up questions.

## Skill routing

For planned product/feature work, use this pipeline: product vision -> business domain model -> deep module map / feature brief -> technical design -> optional UX -> epics/stories -> AI executor. Business Domain Model work sits after Product Vision and before Deep Module Map or Feature Brief work. Technical Design remains downstream of both Feature Brief and Deep Module Map, with Scrum planning and AI executor flows after Technical Design. Narrow code fixes and small local changes do not require the full pipeline unless product scope, module ownership, or architecture direction is unclear.

- For any code-writing task, use `clean-code`.
- For requests to create, revise, or clarify a product vision, product strategy narrative, product north star, positioning, product principles, product voice, target user definition, product boundaries, or success signals, use `product-vision-writer`.
- For requests to create, revise, or clarify a Business Domain Model, `docs/business-domain-model.md`, business/domain vocabulary, ubiquitous language, domain concepts, relationships, rules, lifecycles, workflows, domain events, boundaries, or hard parts, use `business-domain-model-writer`.
- For requests to create, revise, or clarify a Deep Module Map, deep, complexity-hiding implementation modules, module boundaries, suggested implementation modules, or `docs/deep-module-map.md`, use `deep-module-map-writer`.
- For requests to create, revise, or clarify a business-level feature brief after Deep Module Map work, feature definition, feature scope, MVP feature boundaries, business acceptance criteria, or product-level feature rationale, use `feature-brief-writer`.
- For requests to create, revise, or clarify a technical design, implementation-oriented design doc, architecture approach, technical tradeoffs, technical risks, or implementation plan for an approved feature, use `technical-design-writer`.
- For requests to create Epics, User Stories, Scrum planning artifacts, backlog slices, or delivery plans from an approved feature brief and technical design, use `scrum-master-planner`.
- For explicit planning-only requests to turn a specific User Story into an implementation checklist, coding plan, step-by-step execution plan, or baby-step plan without implementation, use `ai-implementation-planner` and stop after writing the plan. Treat a request as planning-only only when the user explicitly says planning-only, "do not implement," or asks to create the plan without execution.
- For requests to plan, implement, execute, continue, or work through a specific User Story under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md`, an Epic, or an existing story implementation plan under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/`, use `ai-implementation-plan-executor`; when the story plan is missing, the executor must create it with `ai-implementation-planner` and immediately continue into implementation without a separate plan approval gate.
- For requests to capture, save, jot down, or add rough future feature ideas, use `feature-idea-capture`.
{{OPTIONAL_SKILL_ROUTING}}

## Sibu maintenance

This repository uses Sibu to manage AI workflow setup.

- `sibu init` is a one-time bootstrap command for adopting Sibu in a project. It creates the initial agent support files, keeps existing files unchanged, and creates `.sibu/state.json` metadata. Do not rerun `sibu init` to apply updates to an existing Sibu project.
- `sibu doctor` is the read-only health check for this workflow. It inspects whether Sibu-managed files are missing, modified, unrecorded, or generated from older templates.
- `sibu sync` is the post-init workflow maintenance command. It reviews template updates interactively, repairs missing managed files, adopts newly added managed templates, protects local edits from automatic overwrites, and lets the user apply safe updates, mark customized files as reviewed, write side templates, stop managing a file, or skip for later.

Use `sibu doctor` as a read-only workflow health check when you need to verify Sibu-managed file state. After `sibu doctor` finishes, guide the user based on the outcome:

- Healthy workflow: mention that the Sibu check passed and proceed.
- Missing `.sibu/state.json`: tell the user to run `sibu init` once before continuing.
- Missing, unrecorded, modified, or older managed files: tell the user to run `sibu sync` to review and repair them.
- Sibu unavailable: tell the user how to install or run Sibu before relying on template status.

Sibu records managed workflow file metadata in `.sibu/state.json`, including template versions, file hashes, selected agent support, and whether files are `managed`, `customized`, or `unmanaged`.
