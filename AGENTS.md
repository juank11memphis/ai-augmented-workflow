# AGENTS.md

## Project overview

This repository is the home for establishing an AI-augmented development workflow. The exact shape is still being decided: it may become a CLI, a collection of shared skills and template files, or a combination of both. Generally, the goal is for someone to use this repository to set up their own AI-augmented development workflow on their local machine.

## Security and safety

- Do not commit secrets, credentials, tokens, or other sensitive data.
- Avoid destructive operations unless the user explicitly requests them or confirms the plan.
- Keep changes focused on the requested scope; do not introduce unrelated refactors or enhancements.
- If an implementation becomes materially more complex or risky than expected, stop and ask for explicit approval before continuing.

## Agent-specific instructions

- Before any task that requires code changes, propose a brief plan and wait for user confirmation once per requested task.
- After confirmation, proceed with all agreed in-scope changes without re-asking.
- Ask again only if the scope changes materially, the approach becomes materially more complex or risky, or the user explicitly asks to review before continuing.
- Use Conventional Commits 1.0.0 for commit messages.

## Communication style

- Keep responses as short as practical while still being clear and useful.
- Prefer concise, pragmatic answers over long explanations.
- Ask focused questions when needed; otherwise make reasonable assumptions and proceed.
- If the user wants more detail, they can ask follow-up questions.

## Skill routing

- For any code-writing task, use `clean-code`.
- For requests to create, revise, or clarify a product vision, product strategy narrative, product north star, positioning, product principles, product voice, target user definition, product boundaries, or success signals, use `product-vision-writer`.
- For requests to create, revise, or clarify a business-level feature brief, feature definition, feature scope, MVP feature boundaries, business acceptance criteria, or product-level feature rationale, use `feature-brief-writer`.
- For requests to create, revise, or clarify a technical design, implementation-oriented design doc, architecture approach, technical tradeoffs, technical risks, or implementation plan for an approved feature, use `technical-design-writer`.
- For requests to create Epics, User Stories, Scrum planning artifacts, backlog slices, or delivery plans from an approved feature brief and technical design, use `scrum-master-planner`.
- For requests to turn a specific User Story into an implementation checklist, coding plan, step-by-step execution plan, or baby-step plan, use `ai-implementation-planner`.
- For requests to implement, execute, continue, or work through an existing story implementation plan under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/`, use `ai-implementation-plan-executor`.
- For any task that changes `.ts` or `.tsx` files, also use `typescript`.
- For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.

## Echo maintenance

This repository uses Echo to manage AI workflow setup.

- `echo init` is a one-time bootstrap command for adopting Echo in a project. It creates the initial agent support files, keeps existing files unchanged, and creates `.echo/state.json` metadata. Do not rerun `echo init` to apply updates to an existing Echo project.
- `echo doctor` is the read-only health check for this workflow. It inspects whether Echo-managed files are missing, modified, unrecorded, or generated from older templates.
- `echo sync` is the post-init workflow maintenance command. It reviews template updates interactively, repairs missing managed files, adopts newly added managed templates, protects local edits from automatic overwrites, and lets the user apply safe updates, mark customized files as reviewed, write side templates, stop managing a file, or skip for later.

At the start of each session in this repository, run `echo doctor` once before making changes or giving workflow guidance. Treat it as a read-only preflight check. Do not rerun it before every follow-up in the same session unless workflow-managed files changed, the user asks, or you need to verify Echo state after applying updates.

After `echo doctor` finishes, guide the user based on the outcome:

- If the workflow is healthy, mention that the Echo check passed and proceed with the requested work.
- If `.echo/state.json` is missing because the project has not been initialized, tell the user to run `echo init` once before continuing.
- If managed workflow files are missing, unrecorded, modified, or generated from older templates, tell the user to run `echo sync` to review and repair them.
- If `echo doctor` cannot run because Echo is unavailable, tell the user how to install or run Echo for this project before relying on template status.

Echo records managed workflow file metadata in `.echo/state.json`, including template versions, file hashes, selected agent support, and whether files are `managed`, `customized`, or `unmanaged`.

If `.echo/state.json` is missing because Echo has not been adopted in the project, ask the user to run `echo init` once.
If workflow files may be missing, modified, unrecorded, or drifted from the recorded Echo state, ask the user to run `echo doctor` first.
If `echo doctor` reports missing managed files, unrecorded expected files, local edits, or older templates, ask the user to run `echo sync`.
