# AGENTS.md

## Project overview

This repository is the home for establishing an AI-augmented development workflow. The exact shape is still being decided: it may become a CLI, a collection of shared skills and template files, or a combination of both. Generally, the goal is for someone to use this repository to set up their own AI-augmented development workflow on their local machine.

## Security and safety

- Do not commit secrets, credentials, tokens, or other sensitive data.
- Avoid destructive operations unless the user explicitly requests them or confirms the plan.
- Keep changes focused on the requested scope; do not introduce unrelated refactors or enhancements.
- If an implementation becomes materially more complex or risky than expected, stop and ask for explicit approval before continuing.

## Agent-specific instructions

- Before any task that writes or modifies code, propose a brief plan and wait for user confirmation once per requested task.
- Exception: when the user asks to plan, implement, execute, continue, or work through a User Story or Epic with `ai-implementation-plan-executor`, that request confirms missing plan generation without a separate code-change approval. The exact plan still needs independent review and explicit human acceptance before a Story branch or Task execution; completed work still needs human Story review. A checked-Task executor may commit only its scoped Task after the prescribed check passes; final Story approval and continuation remain with the main agent.
- For read-only work, research, planning, documentation-only edits, or other non-code changes, do not ask for confirmation unless the action is destructive, risky, ambiguous, or explicitly requires user approval.
- After confirmation, proceed with all agreed in-scope changes without re-asking.
- Ask again only if the scope changes materially, the approach becomes materially more complex or risky, or the user explicitly asks to review before continuing.
- Use Conventional Commits 1.0.0 for commit messages.

## Validation permission hygiene

- Run repository validation commands directly as defined, without shell wrappers, output redirection, timestamps, or altered arguments unless the check itself requires them. This lets narrow host approvals apply across languages and toolchains.
- Run expensive final checks only after changes stabilize. Do not rerun a check or seek repeated escalations merely to obtain a different permission outcome.
- If sandbox restrictions block a required check, use the host's escalation process once for the exact command and a narrowly scoped reusable approval, when supported. If denied or still blocked, report the limitation; do not use alternate commands or wrappers to bypass it.
- Repository instructions do not grant host permissions. Do not ask the user for separate permission when the host already allows a routine validation command.

## Testing AI behavior

- Keep unit tests self-contained, deterministic, and idempotent. Do not call a live LLM or external model from a unit test.
- Unit tests cannot test or prove actual LLM or agent behavior. They may check deterministic code with fakes or static prompt contracts, but those checks do not establish that an LLM will follow instructions.
- Use separate, isolated integration evals with disposable fixtures to test actual live-model or agent behavior. Run evals only when explicitly in scope for the task; do not put them in the routine unit-test suite. Report observed outcomes and nondeterministic limits.

## Context budget discipline

Treat context as a shared budget owned by the user. Prefer narrow, purposeful context before broad reads: search targeted paths, inspect snippets before full files, and avoid dependency, generated, build, cache, and lockfile content unless relevant.

Do not dump full files, full diffs, or broad recursive scans unless needed for quality or explicitly requested. Summarize large diffs and generated artifacts by default, with focused excerpts when they support a decision.

Keep responses concise by default, but spend the context needed for correctness, safety, validation, human control, or required context gathering. Warn or ask before optional expensive context operations.

## Communication style

- Write for easy scanning: use short paragraphs, bullets for distinct points, and clear headings when they help. Avoid dense blocks of text or a single long sentence carrying several ideas.
- Keep responses as short as practical while still being clear and useful.
- Prefer concise, pragmatic answers over long explanations.
- Answer only what the user asked. Do not expand a request about X into adjacent topics Y and Z, broad background, tutorials, or alternatives unless the user asks for them or they are required for correctness.
- Be concise by default, but do not let brevity reduce the quality of required interviews, artifacts, safety warnings, validation details, or review gates.
- Ask focused questions when needed; otherwise make reasonable assumptions and proceed.
- If the user wants more detail, they can ask follow-up questions.

## Judgment and honesty

- Be direct and respectful. Avoid patronizing praise, performative agreement, and over-reassurance.
- Do not invent certainty or provide a polished answer when important context is missing; state uncertainty, ask one focused question, or verify first.
- Make low-risk assumptions only when they are clearly labeled.
- Challenge the user when there is a clear factual, safety/security, engineering-quality, repo-instruction, product-goal, or context-reliability reason.
- When challenging, give a short reason and a better alternative. Do not argue preferences or nitpick style; preserve user control after material tradeoffs are acknowledged unless safety or project rules require refusal.

## Skill routing

For planned product/feature work, use this pipeline: product vision -> business domain model -> capabilities map -> project SAD / independent feature BRD -> UX when the feature has UI impact -> software design -> epics/stories -> AI executor. Business Domain Model work sits after Product Vision and before the Capabilities Map. Software Architecture Document and BRD work are sibling downstream artifacts from Product Vision, Business Domain Model, and Capabilities Map. UX is optional overall but required before Software Design Document when the feature has UI impact. Software Design Document remains downstream of BRD, Software Architecture Document, and required UX, with Scrum planning and AI executor flows after Software Design Document. Narrow code fixes and small local changes do not require the full pipeline unless product scope, module ownership, or architecture direction is unclear.

- For any code-writing task, use `clean-code`.
- For code-writing tasks that introduce or modify logging, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior, also use `structured-logging`.
- For requests to create, revise, or clarify a product vision, product strategy narrative, product north star, positioning, product principles, product voice, target user definition, product boundaries, or success signals, use `product-vision-writer`.
- For requests to create, revise, or clarify a Business Domain Model, `docs/business-domain-model.md`, business/domain vocabulary, ubiquitous language, domain concepts, relationships, rules, lifecycles, workflows, domain events, boundaries, or hard parts, use `business-domain-model-writer`.
- For requests to create, revise, or clarify a Software Architecture Document, deep, complexity-hiding implementation modules, module boundaries, suggested implementation modules, or `docs/architecture.md`, use `software-architecture-writer`.
- For requests to create, revise, or clarify a Capabilities Map, product/business capabilities, capability coverage by subdomain, `docs/capabilities-map.md`, missing capability checks, or capability gaps, use `capabilities-map-writer`.
- For requests to create, revise, or clarify a business-level BRD, feature definition, feature scope, MVP feature boundaries, business acceptance criteria, capability coverage, or product-level feature rationale, use `business-requirements-writer`.
- For requests to create, revise, or clarify a software design, implementation-oriented design doc, architecture approach, technical tradeoffs, technical risks, or implementation plan for a feature defined by a sufficiently clear BRD, use `software-design-writer`.
- For requests to create Epics, User Stories, Scrum planning artifacts, backlog slices, or delivery plans from a sufficiently clear BRD and software design, use `scrum-master-planner`.
- For explicit planning-only requests to turn a specific User Story into an implementation checklist, coding plan, step-by-step execution plan, or baby-step plan without implementation, use `ai-implementation-planner` and stop after writing the plan. Treat a request as planning-only only when the user explicitly says planning-only, "do not implement," or asks to create the plan without execution.
- For requests to plan, implement, execute, continue, or work through a specific User Story under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md`, an Epic, or an existing story implementation plan under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/`, use `ai-implementation-plan-executor`; when the story plan is missing, the executor must create it with `ai-implementation-planner` and immediately continue into implementation without a separate plan approval gate.
- For requests to create, revise, or maintain Sibu eval suites, eval definitions, fixtures, assertions/graders, rubrics, expected/reference context, or conventional eval artifacts, use `eval-authoring`.
- For requests to capture, save, jot down, or add rough future feature ideas, use `feature-idea-capture`.
- For any task that changes `.ts` or `.tsx` files, also use `typescript`.
- For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.
- For prompt creation, rewriting, optimization, compression, evaluation, or reusable templates for AI models, agents, tools, coding assistants, or product workflows, use `ai-prompt-engineer-master`.
- For UX/UI design after product definition for UI-changing features, use `ux-expert`; downstream design, planning, and implementation must treat `docs/features/<feature-slug>/ux.md` mockups as binding UI goals, not redesign targets.
- For exporting a feature's Epics and User Stories to GitHub issues or sub-issues, use `export-to-github`.
- For exporting a feature's BRD, UX design, or software design to Notion, use `export-to-notion`.

## Sibu-provided sub-agent model routes

Use this protocol only for the five Sibu-provided roles named by their gatekeeper skills; user-created agents are not routed. Before every such spawn, classify the delegated task in provider-neutral terms: **bounded** means clear, narrow, repeatable work with little ambiguity or safety consequence; **demanding** means ambiguous or multi-step work needing broader reasoning; **high-risk** means security, privacy, destructive actions, persisted-data migration, or consequential architecture decisions. When material risk is uncertain, choose the higher-risk applicable class. Explain a high-risk choice briefly and allow the user to correct the classification.

The gatekeeper names its exact supported role, then runs `sibu models resolve --agent <environment> --role <role> --workload <class> --json` before spawning. Use the current supported agent environment (initially `codex`); do not infer a route from the parent session. Treat the result as versioned state: `configured` has a saved route, `missing` includes the current recommendation, `workflow-unavailable` and `unsupported` mean no spawn, and `recommendation-unavailable` means no first-use selection. If a configured result has no usable catalog, disclose that current recommendation guidance is unavailable; do not invent a replacement. Use `catalog.catalogVersion` and `stateBasis` from the resolution when saving.

- **Saved:** Say “Starting <role> with <model> / <reasoning effort> for <class> work. Using the saved repo route.” Do not ask again. Label any route other than the current recommendation `User selected` when shown, including a catalog-listed alternative; do not imply Sibu fit, cost, or speed assurances for it.
- **Missing, first use:** Say why this role is needed, then show `Workload:`, `Recommended`, model / effort, `Best expected fit`, relative cost and response-speed guidance, and `Recommendation, not a guarantee.` In that order, offer `Use recommended`, `Choose another`, `Cancel`. For high-risk work, state the consequence before the recommendation and explain higher expected cost. Show additional compatible models only after `Choose another`, labeled `Recommended`, `Alternative`, or `Not recommended`; do not disable user-selected available choices. Offer `Back` and `Cancel` there.
- **Choice:** An explicit choice comes before `sibu models set`. Label a chosen route `User selected` in the confirmation whenever it differs from the current recommendation, whether catalog-listed or external. Save through `sibu models set --agent <environment> --role <role> --workload <class> --model <model> --reasoning <effort> --catalog-version <version> --state-basis <token> --json`. A `saved` result confirms the exact role, class, model, and effort, then launches. On `conflict`, re-resolve and re-review with the user; never claim a save. On `failed`, say “I could not save this repo-wide route. No shared setting was changed.” Offer `Retry`, `Use once without saving`, `Cancel`. `Use once` means no write and one spawn with the chosen explicit route; say it applies to this launch only and may be asked again. `Cancel` means no write and no spawn.
- **Unavailable:** If the host rejects a configured route, preserve the saved route and pause. Show `The saved route is not available` and its role/class/model/effort. Never present that known-rejected model/effort pair as its own replacement, even when it is the catalog recommendation. Only when a distinct replacement is known viable for this host, show `Recommended replacement`, its expected fit, and `Recommendation, not a guarantee.`; offer `Use and save replacement`, `Choose another`, `Cancel`, and save only after explicit confirmation. If no distinct viable replacement is known, say so and offer `Choose another` or `Cancel`; wait for an explicit user choice, without live provider discovery or silent fallback. A host rejection of a newly selected route uses the same review. For `workflow-unavailable` or `unsupported`, no spawn; show the returned recovery guidance. Host incompatibility with explicit model **and** reasoning effort also stops the launch.

Every successful host spawn passes the selected model and reasoning effort as explicit spawn parameters, including one-time use. Never inherit the parent model or reasoning effort; do not silently fallback to another route or retry a rejected model with an alternate. Route only the named Sibu role, never an unrelated agent. Keep the role's existing authority, context, approval, validation, and foreground/background rules unchanged.

Advisory main-agent Codex profiles: GPT-6 Sol/medium for normal or demanding sessions (the normal default); GPT-6 Luna/low for clearly narrow sessions; GPT-6 Astra/high for high-risk sessions. The main-agent choice is user- and host-controlled, not persisted and not enforced by Sibu. Do not resolve or save a main-agent route, change the active session model, or repeatedly prompt for it.

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
