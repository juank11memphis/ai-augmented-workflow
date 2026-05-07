# Deep Module Map

## Purpose

This map describes Sibu's current implementation boundaries so feature briefs, technical designs, and implementation plans can place work in the right area without coupling callers to CLI details, template internals, file hashing, or state-migration rules.

A Deep Module here is not a folder mandate. It is a durable capability with a small outside promise and meaningful hidden complexity.

## Modules

### CLI Command Surface
- Suggested module slug: `cli-command-surface`
- Simple interface / outside promise: Expose Sibu's user-facing commands and route each invocation to the right application behavior.
- Hidden complexity: Commander setup, command naming, version wiring, argument capture, command dispatch, process exit behavior, and keeping the public CLI vocabulary stable while handlers evolve.
- Owns: The `sibu` command tree, command descriptions, command payloads, and dispatch from CLI input to feature handlers.
- Does not own: The business rules for init, doctor, sync, skill use, skill stop, or release administration.
- Key scenarios: `sibu init`, `sibu doctor`, `sibu sync`, `sibu skills list`, `sibu skills use <skill_name>`, and `sibu skills stop <skill_name>`.
- Related modules: Project Adoption, Workflow Health Diagnosis, Sync Review, Skill Selection Management, MCP Server Selection Management, Maintainer Release Support.
- Boundary notes: New user-facing commands belong here only for routing and command contract. Their behavior should live in the module that owns the capability.

### Project Adoption
- Suggested module slug: `project-adoption`
- Simple interface / outside promise: Initialize a project with a safe, recorded AI workflow without overwriting existing user files.
- Hidden complexity: Agent selection, optional skill and MCP server selection, project overview collection, target-file planning, template rendering, existing-file preservation, initial state creation, first-run idempotency, and malformed-state protection.
- Owns: First-time setup behavior, missing initial file creation, selected agent/skill/MCP server capture during init, and initial `.sibu/state.json` creation.
- Does not own: Ongoing drift detection, template update review, later skill add/remove flows, or template catalog definitions.
- Key scenarios: A new repo runs `sibu init`; an already initialized repo runs `sibu init`; `AGENTS.md` exists before Sibu adoption; `.sibu/state.json` exists but is invalid.
- Related modules: Workflow Target Planning, Template Catalog and Rendering, Workflow State Registry, Interactive Guidance.
- Boundary notes: Adoption should create or record the starting workflow. Post-init repair and update choices belong to Sync Review.

### Workflow State Registry
- Suggested module slug: `workflow-state-registry`
- Simple interface / outside promise: Read, validate, clone, and write Sibu's record of managed workflow files and selections.
- Hidden complexity: State schema validation, managed/customized/unmanaged status semantics, selected skill and MCP server metadata, template version tracking, file hash recording, reviewed-version tracking, backward-compatible optional fields, and safe handling of missing or malformed JSON.
- Owns: `.sibu/state.json` shape, state reads for health checks, state writes after workflow mutations, and state metadata semantics.
- Does not own: Which files should be targeted, how templates render, what actions users choose, or how command output is phrased.
- Key scenarios: Doctor needs a trustworthy state read; init writes initial metadata; sync updates reviewed template versions; skill or MCP stop marks a file unmanaged; skill or MCP use records new selections.
- Related modules: Workflow Target Planning, Workflow Health Diagnosis, Sync Review, Skill Selection Management, MCP Server Selection Management.
- Boundary notes: State is Sibu's memory, not the source of template truth. Template definitions stay in Template Catalog and Rendering.

### Template Catalog and Rendering
- Suggested module slug: `template-catalog-rendering`
- Simple interface / outside promise: Turn a template identity plus current project selections into concrete workflow file contents.
- Hidden complexity: Template discovery, manifest validation, global and per-template versions, user-facing change notes, project overview substitution, optional skill routing injection, MCP configuration rendering, selected skill/MCP template lookup, and bundled template paths in installed packages.
- Owns: Reading templates, reading `templates/manifest.json`, resolving template versions, rendering skill routing, rendering selected MCP configuration content, and extracting existing project overview text when refreshing `AGENTS.md`.
- Does not own: Deciding when files should be written, whether local edits are acceptable, or how sync actions are presented.
- Key scenarios: Init renders missing files; sync renders latest template content; skill use refreshes `AGENTS.md`; MCP use refreshes agent config files; side templates are written for user review.
- Related modules: Workflow Target Planning, Project Adoption, Sync Review, Skill Selection Management, MCP Server Selection Management.
- Boundary notes: Template changes should be visible through manifest versions and change notes. File mutation decisions belong outside this module.

### Workflow Target Planning
- Suggested module slug: `workflow-target-planning`
- Simple interface / outside promise: Given selected agents, skills, and MCP servers, tell the rest of Sibu which workflow files should exist and which templates produce them.
- Hidden complexity: Mandatory skills, selectable language/framework/database/architecture/workflow skills, selectable MCP servers, agent-specific target paths, deduplicating shared skill files across agents, resolving MCP config targets per agent, existing state selections, and target metadata such as whether a project overview is required.
- Owns: Supported agent catalog, selectable skill catalogs, selectable MCP server catalog, target resolution, target deduplication, and conversion from state selections to concrete targets.
- Does not own: File content rendering, file creation, drift diagnosis, or interactive selection prompts.
- Key scenarios: Init plans first files; doctor checks expected targets; sync detects newly expected templates; skill use finds the one new target to add; MCP use finds config targets to add or refresh.
- Related modules: Template Catalog and Rendering, Workflow State Registry, Project Adoption, Workflow Health Diagnosis, Skill Selection Management, MCP Server Selection Management.
- Boundary notes: If future agents, selectable skills, or selectable MCP servers are added, this module owns how their template targets are discovered. Skill content and MCP config content remain template artifacts.

### Workflow Health Diagnosis
- Suggested module slug: `workflow-health-diagnosis`
- Simple interface / outside promise: Check workflow health without changing project files, and tell the user what needs review.
- Hidden complexity: Missing state handling, unsupported selections, expected-target comparison, missing-file detection, hash-based local modification detection, template version drift, reviewed-template suppression, managed status counts, npm update advisory, and safe next-step guidance.
- Owns: `sibu doctor` behavior, read-only drift classification, health summary output, and update advice.
- Does not own: Applying fixes, prompting for sync choices, writing templates, or mutating state.
- Key scenarios: Healthy workflow check; missing `.sibu/state.json`; locally modified managed file; missing managed file; stale template version; newer Sibu npm version available.
- Related modules: Workflow State Registry, Workflow Target Planning, Template Catalog and Rendering, Version Advisory, Sync Review, MCP Server Selection Management.
- Boundary notes: This module may recommend `sibu sync`, but it must stay read-only.

### Sync Review
- Suggested module slug: `sync-review`
- Simple interface / outside promise: Let users review workflow drift and explicitly choose safe actions for each affected file.
- Hidden complexity: Preview status classification, actionable vs informational statuses, local edit protection, missing file recreation, new template adoption, template update application, side-template writing, mark-reviewed semantics, stop-managing semantics, selection migrations, and state/file mutation coordination.
- Owns: `sibu sync`, sync previews, sync action prompts, applying chosen sync actions, and the rule that Sibu does not overwrite local edits automatically.
- Does not own: First-time project initialization, read-only diagnosis output, selectable skill or MCP command shortcuts, or template definitions.
- Key scenarios: Apply an update when no local edits exist; mark local edits as customized/reviewed; recreate a missing managed file; start managing a newly expected file; write a side template under `.sibu/sync/`; stop managing a file.
- Related modules: Workflow State Registry, Template Catalog and Rendering, Workflow Target Planning, Interactive Guidance, Skill Selection Management, MCP Server Selection Management.
- Boundary notes: Any workflow file mutation after init should generally pass through this module unless it is a narrowly scoped skill or MCP add/remove operation with its own clean-state preflight.

### Skill Selection Management
- Suggested module slug: `skill-selection-management`
- Simple interface / outside promise: Add or stop managing selectable skills while keeping `AGENTS.md`, skill files, and Sibu state consistent.
- Hidden complexity: Skill id resolution across categories, duplicate-selection no-ops, architecture-skill exclusivity, clean-workflow preflight, new target detection, safe `AGENTS.md` routing refresh, unmanaged status recording, optional deletion prompts, and local-edit checks before deletion.
- Owns: `sibu skills list`, `sibu skills use`, `sibu skills stop`, selected skill state changes, and skill-specific managed-file lifecycle decisions.
- Does not own: Mandatory skill installation rules, template content, general sync actions, or product-level skill authoring guidance.
- Key scenarios: List available skills with selected markers; add TypeScript guidance to a clean workflow; block adding a skill when sync has unresolved drift; stop managing a selected skill; keep or delete the stopped skill file.
- Related modules: Workflow Mutation Readiness, Workflow Target Planning, Template Catalog and Rendering, Workflow State Registry, Sync Review.
- Boundary notes: Skill selection changes are allowed to mutate workflow files directly only after proving the workflow is clean enough to avoid losing user edits.

### MCP Server Selection Management
- Suggested module slug: `mcp-server-selection-management`
- Simple interface / outside promise: Add or stop managing selectable MCP server configuration while keeping agent config files and Sibu state consistent.
- Hidden complexity: MCP server id resolution, per-agent config target differences, duplicate-selection no-ops, clean-workflow preflight, config target detection, safe config rendering/refresh, unmanaged status recording, optional deletion or keep behavior where applicable, and local-edit checks before changing agent config files.
- Owns: `sibu mcp list`, `sibu mcp use`, `sibu mcp stop`, selected MCP server state changes, and MCP-specific managed-file lifecycle decisions.
- Does not own: Installing MCP server prerequisites, authenticating with providers, validating external credentials, skill guidance content, general sync actions, or agent command routing.
- Key scenarios: List available MCP servers with selected markers; configure the official GitHub MCP server for selected agents; block MCP use when sync has unresolved drift; stop managing a selected MCP server; preserve or unmanage affected config files without silently overwriting local edits.
- Related modules: Workflow Mutation Readiness, Workflow Target Planning, Template Catalog and Rendering, Workflow State Registry, Sync Review, Project Adoption, Interactive Guidance.
- Boundary notes: MCP selection changes are allowed to mutate workflow files directly only after proving the workflow is clean enough to avoid losing user edits. Sibu configures MCP server entries but does not install runtimes, manage credentials, or verify provider auth.

### Workflow Mutation Readiness
- Suggested module slug: `workflow-mutation-readiness`
- Simple interface / outside promise: Decide whether a targeted workflow mutation is safe to perform now or must be blocked until sync review.
- Hidden complexity: State validation, manifest loading, sync preview generation, actionable drift filtering, concise blocker reporting, and exposing enough context for callers to guide the user.
- Owns: Clean-state preflight for operations like `sibu skills use` and `sibu mcp use` that bypass full interactive sync.
- Does not own: Applying sync actions, rendering templates, or deciding which skill should be selected.
- Key scenarios: Block skill use when managed files are modified; allow skill use when all previews are non-actionable; show a few drift items as hints.
- Related modules: Sync Review, Workflow Health Diagnosis, Workflow State Registry, Skill Selection Management, MCP Server Selection Management.
- Boundary notes: This module is a guardrail. It should not become a second sync implementation.

### Version Advisory
- Suggested module slug: `version-advisory`
- Simple interface / outside promise: Tell Sibu whether the installed CLI appears current without making health checks fail when the network is unavailable.
- Hidden complexity: npm registry lookup, semver-ish comparison, cache freshness, unavailable-result handling, deterministic environment overrides, cache-path resolution, and user-facing advisory lines.
- Owns: Latest-version checks for `@juancr11/sibu`, lookup/cache policy, override hooks for validation, and update-available result classification.
- Does not own: Template drift detection, package publishing, release notes, or whether project files are updated.
- Key scenarios: Doctor reports an available npm update; registry lookup fails but doctor still completes; validation forces an update or offline result.
- Related modules: Workflow Health Diagnosis, Maintainer Release Support.
- Boundary notes: Updating the npm package changes Sibu's bundled templates and detection logic, but never changes project files by itself.

### Interactive Guidance
- Suggested module slug: `interactive-guidance`
- Simple interface / outside promise: Ask concise CLI questions and display Sibu output in a consistent, human, non-corporate voice.
- Hidden complexity: Clack prompt types, cancel handling, multi-select semantics, optional none selections, intro rendering, terminal styling, grouped skill display, user-facing hints, and validation messages.
- Owns: Shared prompts, intro/outro presentation, selection questions, and consistent CLI communication patterns.
- Does not own: Business decisions made from answers, state mutation, template rendering, or command routing.
- Key scenarios: Agent selection during init; language/framework/database/architecture/workflow skill selection; MCP server selection; sync action choices; keep/delete prompt after stopping a skill or MCP-managed file; grouped skill and MCP list output.
- Related modules: Project Adoption, Sync Review, Skill Selection Management, MCP Server Selection Management, Workflow Health Diagnosis.
- Boundary notes: This module should keep interaction reusable without hiding product rules inside UI code.

### Maintainer Release Support
- Suggested module slug: `maintainer-release-support`
- Simple interface / outside promise: Help maintainers prepare release artifacts without mixing release mechanics into end-user workflow commands.
- Hidden complexity: Changelog generation, git history inspection, semver handling, package version updates, release plan assembly, GitHub release interaction, and release validation flow coordination.
- Owns: Admin-only changelog and release workflow commands under `src/admin`.
- Does not own: Runtime project adoption, doctor/sync behavior, template rendering for user projects, or npm version advisory checks in installed projects.
- Key scenarios: Generate changelog text; validate package version changes; prepare a maintainer release workflow.
- Related modules: Version Advisory, Template Catalog and Rendering.
- Boundary notes: Keep this module separate from the user-facing Sibu workflow so release automation cannot accidentally change project workflow semantics.

## Cross-Module Rules

- User ownership is the default. Existing files and local edits must be preserved unless the user explicitly chooses a mutating action.
- `sibu doctor` must remain read-only. Any repair, template adoption, or state mutation belongs to sync or a guarded targeted mutation.
- Template truth comes from bundled templates and `templates/manifest.json`; project truth comes from local files plus `.sibu/state.json`.
- File overwrite paths must account for local edits using recorded hashes or equivalent protection.
- State mutations should update `updatedAt`, relevant template versions, hashes, and managed/customized/unmanaged status consistently.
- Adding support for a new agent, selectable skill, or selectable MCP server should update target planning, template catalog metadata, user prompts, and sync/doctor expectations together.
- Skill and MCP add/remove shortcuts must be blocked when broader workflow drift exists; send users to `sibu sync` instead of resolving drift implicitly.
- Cross-module behavior should prefer small command handlers that delegate to reusable modules rather than duplicating state, template, hash, or target logic.
- User-facing output should stay concise, practical, and explicit about what Sibu changed or refused to change.
