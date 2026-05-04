# Product Context Map

## Purpose

This map defines Sibu's durable product responsibility areas. It helps future feature briefs, technical designs, and implementation plans decide where behavior belongs without turning product boundaries into folders, services, commands, or implementation layers.

Sibu's contexts should keep the product focused on its core promise: helping developers adopt and maintain an AI-augmented development workflow that is fast, safe, understandable, and firmly under human control.

## Contexts

### Workflow Adoption & Maintenance

- Purpose: Help a repository adopt Sibu-managed AI workflow support and keep that support understandable, current, and safe to maintain over time.
- Owns:
  - First-time workflow adoption through `sibu init`.
  - Detection of whether a repo is not synced, partially synced, current, customized, unmanaged, missing managed files, or based on older templates.
  - Read-only workflow health reporting through `sibu doctor`.
  - User-directed maintenance through `sibu sync`.
  - Managed workflow file metadata, including template versions, file hashes, and managed/customized/unmanaged status.
  - Explaining what changed, what is missing, what is out of date, and what choices are available.
  - Safe options for handling template updates, including applying safe updates, writing side-by-side templates, marking customized files as reviewed, stopping management, or skipping for later.
  - Future managed workflow setup assets such as agent instructions, skills, templates, safety conventions, prompt files, and MCP or integration configuration when those become part of the workflow.
- Does not own:
  - Automatically deciding whether a user should accept an update.
  - Semantic merge assistance for locally modified managed files.
  - Silently overwriting customized workflow files.
  - The user's application code, architecture, editor, model, or runtime environment.
- Key scenarios:
  - A new repo runs `sibu init` and receives a complete baseline AI workflow setup.
  - A repo runs `sibu doctor` and sees whether its workflow setup is healthy or has drifted.
  - A repo runs `sibu sync` and reviews available template updates before deciding what to apply.
  - A managed file has local edits, so Sibu protects it and offers non-destructive choices.
  - A user decides a file should no longer be managed by Sibu.
- Related contexts:
  - Guidance Library provides the reusable assets and versioned templates that this context installs, tracks, and updates.
  - AI Development Pipeline uses the maintained workflow assets to guide day-to-day AI collaboration.
- Boundary notes:
  - This context owns repository workflow state and maintenance behavior, not the content quality of every reusable guidance asset.
  - If future integration support is mostly about tracked files, setup status, or update safety, it belongs here. If it becomes about reusable guidance metadata, it belongs in Guidance Library.

### Guidance Library

- Purpose: Provide curated, reusable AI workflow guidance units that Sibu can install, version, update, and explain across projects.
- Owns:
  - Reusable skills, templates, agent support files, prompt packs, safety guidance, and future MCP or integration recipes.
  - Guidance asset identity, purpose, versioning, compatibility, dependency notes, deprecation status, and update notes.
  - Lightweight fitness metadata, such as recommended use cases, compatible languages or tools, tested Sibu versions, and future eval-backed confidence signals.
  - The distinction between strong defaults and optional guidance users can customize or stop managing.
  - Making reusable guidance understandable enough for users and agents to choose the right tool for the job.
- Does not own:
  - Social ranking, popularity contests, or broad marketplace governance.
  - Deciding that a user must adopt a particular skill, prompt, tool, language, framework, or architecture.
  - Installing, syncing, or tracking files in a specific repository; that belongs to Workflow Adoption & Maintenance.
  - Executing product-to-code work; that belongs to AI Development Pipeline.
- Key scenarios:
  - Sibu ships or updates a clean-code skill used by agents during implementation work.
  - A template gains a new version with user-facing sync notes.
  - A future prompt pack declares compatibility, intended use, and deprecation metadata.
  - A future MCP recipe explains what it supports and when it should be installed.
  - Users can understand why a guidance asset exists and whether it fits their project.
- Related contexts:
  - Workflow Adoption & Maintenance installs and maintains guidance assets inside repos.
  - AI Development Pipeline composes guidance assets into an opinionated workflow.
- Boundary notes:
  - This context should prevent Sibu from becoming just a file copier. It owns the product meaning of reusable guidance.
  - It should not become a marketplace before the core workflow is strong. Curation and transparent fitness metadata matter more than ratings or breadth.

### AI Development Pipeline

- Purpose: Guide developers through an opinionated, small-work AI collaboration loop from product intent to implementation while keeping the engineer responsible for judgment and quality.
- Owns:
  - The recommended pipeline: product vision → product context map → feature brief → technical design → optional UX → epics/stories → AI implementation plan → executor.
  - The rules and handoffs between pipeline stages.
  - The principle that AI work should be small, explicit, reviewable, and validated where possible.
  - Skill routing for product planning, design, story planning, implementation planning, and execution.
  - Guidance that pushes users away from huge vague AI tasks and toward scoped work with clear confirmation points.
  - The user experience of choosing to use the pipeline without being forced into it.
- Does not own:
  - The user's actual product strategy, architecture decisions, code, or delivery commitments.
  - Replacing the engineer's judgment with autonomous AI execution.
  - Forcing every Sibu user or repo to follow the full pipeline.
  - Maintaining the physical files that make the pipeline available in a repo; that belongs to Workflow Adoption & Maintenance.
- Key scenarios:
  - A team starts with product vision and gradually turns it into implementation-ready story plans.
  - A developer asks an agent to implement a story, and the workflow requires a focused implementation plan first.
  - The pipeline routes a technical design task to technical-design guidance instead of generic coding instructions.
  - A user opts out of the full pipeline but still benefits from Sibu-managed workflow setup.
- Related contexts:
  - Guidance Library provides the reusable skills and templates that define each pipeline stage.
  - Workflow Adoption & Maintenance ensures those pipeline assets are present, current, and safe to update in a repo.
- Boundary notes:
  - This context owns the opinionated way of working, not the entire development environment.
  - It should remain a guide, not an autopilot. The human stays accountable for direction, acceptance, and quality.

## Cross-Context Rules

- User control is non-negotiable. Sibu may recommend, explain, and guide, but the user decides what changes are applied.
- Be transparent about what Sibu creates, manages, changes, skips, or refuses to overwrite.
- Protect local edits. Never silently overwrite customized workflow files.
- Avoid destructive actions unless the user explicitly requests them or confirms the plan.
- Prefer side-by-side outputs, review markers, or unmanage options over automatic merging when local workflow files have changed.
- Strong defaults should not become a cage. Users can customize, opt out, or take ownership of workflow pieces.
- Keep AI work small, reviewable, and grounded in repo context.
- Sibu should amplify engineers, not replace them.
- Do not organize product ownership around a specific IDE, model, agent, framework, package, service, folder, or command.
- Create a new context only when future work needs a durable product responsibility that cannot be clearly owned by the existing contexts.
