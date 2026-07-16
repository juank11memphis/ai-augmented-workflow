# Deep Module Map

## Purpose

This Deep Module Map identifies Sibu's durable implementation boundaries: modules with small outside promises that hide meaningful internal complexity.

The map is derived from the Product Vision, Business Domain Model, and Capabilities Map. It should guide future feature briefs, technical designs, and implementation plans by clarifying where behavior belongs without prescribing internal architecture, framework structure, database design, or command layout. Sibu's selected architecture skill is repo-level workflow guidance handled across the existing workflow modules, not a standalone deep module.

User Control & Trust is a cross-module rule, not a standalone module. Each module must preserve project ownership, avoid silent destructive behavior, and keep Sibu's actions understandable and reviewable.

## Modules

### Template Catalog

- Suggested module slug: `template-catalog`
- Simple interface / outside promise: provide versioned Sibu templates, selectable skill catalog entries, template metadata, and user-facing update meaning.
- Hidden complexity: template discovery, manifest interpretation, template versioning, template paths, supported workflow file metadata, template hashes, skill templates, architecture skill catalog metadata, agent-specific templates, and update/change notes.
- Owns: source template lookup, template identity, template versions, template metadata, selectable skill catalog entries including architecture skills, template change descriptions, and the distinction between template source and project-owned workflow files.
- Does not own: deciding which templates a user selected during setup, installing files into a repo, rendering tool configuration semantics, recording repo state, or applying sync decisions.
- Key scenarios:
  - Sibu needs to know which templates exist for a selected agent or workflow file.
  - Sibu needs to compare a recorded template version with the current template version.
  - Sibu needs user-facing notes explaining what changed in a template update.
  - Sibu needs to list architecture skill options from the fixed catalog without inventing a default.
  - A skill file is distributed as a managed template.
- Related modules: Agent Tool Configuration, Workflow Installer, Workflow Configuration Manager, Workflow Health Inspector, Sync Review Orchestrator.
- Boundary notes: the catalog exposes available templates, selectable skill catalog entries, and metadata; it does not own the adoption, configuration, or sync workflow that decides what to do with them.

### Agent Tool Configuration

- Suggested module slug: `agent-tool-configuration`
- Simple interface / outside promise: given selected agents and tool integrations, produce safe agent-specific tool configuration.
- Hidden complexity: per-agent configuration shapes, MCP server configuration differences, integration-specific requirements, environment-variable references, unsupported agent/tool combinations, and secret-safety rules.
- Owns: mapping selected tools such as MCP servers to each supported agent's expected configuration, rendering safe configuration content, and keeping credentials referenced rather than stored.
- Does not own: template catalog metadata in general, user credential values, external tool behavior, workflow state persistence, or the overall install/sync process.
- Key scenarios:
  - Sibu configures the Notion MCP differently for Codex, Gemini, and Claude.
  - Sibu adds tool configuration for selected agents without embedding secrets.
  - Sibu explains that a selected tool is unsupported for a selected agent.
- Related modules: Template Catalog, Workflow Installer, Workflow Configuration Manager, Workflow Health Inspector.
- Boundary notes: this module may consume template content from Template Catalog, but it owns the semantic rules for translating selected tools into safe agent-specific configuration.

### Workflow State Ledger

- Suggested module slug: `workflow-state-ledger`
- Simple interface / outside promise: tell the rest of Sibu what this repo's Sibu workflow state is and record approved state changes.
- Hidden complexity: state file location, state file schema, selected agents, selected architecture skill, managed/customized/unmanaged ownership records, recorded file hashes, recorded template versions, reviewed template versions, compatibility, and state migrations.
- Owns: durable Sibu state metadata, selected architecture skill persistence, loading state, validating state shape, updating state after approved workflow changes, and representing file ownership status consistently.
- Does not own: deciding which workflow files should be installed, computing current workflow health findings, choosing sync actions, rendering templates, or interacting with external tools.
- Key scenarios:
  - Sibu records initial metadata after workflow adoption, including the user-selected architecture skill.
  - Sibu loads recorded file hashes, selected architecture skill, and template versions before a health check.
  - Sibu updates a file's status to customized or unmanaged after a user-approved sync decision.
  - Sibu needs to preserve what the user has already reviewed.
- Related modules: Workflow Installer, Workflow Configuration Manager, Workflow Health Inspector, Sync Review Orchestrator.
- Boundary notes: the ledger represents recorded truth; it does not decide whether that truth is healthy compared with current files, supported architecture skills, and templates.

### Workflow Installer

- Suggested module slug: `workflow-installer`
- Simple interface / outside promise: given a repo and selected setup choices, install the initial Sibu workflow safely.
- Hidden complexity: setup orchestration, selected agent/skill/tool choices, required architecture skill selection, required template resolution, tool configuration coordination, existing-file handling, safe file creation, initial state recording, and installed-workflow explanation.
- Owns: first-time workflow installation, coordinating selected setup choices, requiring one explicit architecture skill choice without selecting a default, creating selected workflow files including architecture guidance, preserving project ownership during adoption, and asking the Workflow State Ledger to record initial metadata.
- Does not own: the interactive UI mechanics for asking questions, generic template metadata, agent-specific tool rendering rules, ongoing sync decisions, or health diagnosis after installation.
- Key scenarios:
  - A user runs `sibu init` in an uninitialized repo.
  - Sibu requires the user to choose exactly one architecture skill from the fixed catalog.
  - Sibu installs selected agent support files, selected architecture guidance, and optional skill files.
  - Sibu coordinates safe MCP/tool configuration for selected agents.
  - Sibu records the initial managed workflow state.
  - Sibu explains what was created and what the user controls.
- Related modules: Template Catalog, Agent Tool Configuration, Workflow State Ledger.
- Boundary notes: installation owns setup orchestration, including making architecture selection mandatory during init, but reusable template lookup, tool rendering, and state persistence stay behind their own module interfaces.

### Workflow Configuration Manager

- Suggested module slug: `workflow-configuration-manager`
- Simple interface / outside promise: given an initialized repo and an intentional configuration request, safely change selected workflow guidance or tool integrations.
- Hidden complexity: post-init readiness checks, selectable option resolution, skill and MCP selection state transitions, high-impact architecture replacement warnings, affected workflow file derivation, safe file creation/removal/update, MCP configuration coordination, hash/version recording, and user-facing explanations for intentional changes.
- Owns: post-initialization workflow configuration changes, including adding/stopping/listing optional skills, replacing selected architecture guidance after warning and confirmation, and changing MCP/tool integrations; coordinating affected workflow files; and asking the Workflow State Ledger to record approved selection changes.
- Does not own: first-time workflow installation, template catalog metadata, MCP rendering semantics, read-only health diagnosis, drift repair/update review, raw state persistence, or generic prompt/UI mechanics.
- Key scenarios:
  - A user adds a TypeScript skill after the repo is already initialized.
  - A user stops managing an optional workflow skill while preserving unrelated workflow files.
  - A user intentionally replaces the selected architecture skill after Sibu warns about downstream disruption.
  - A user enables or disables an MCP server and Sibu updates the affected agent tool configuration safely.
  - A requested configuration change is blocked because unresolved workflow drift makes mutation unsafe.
  - Sibu lists available and selected skills or MCP servers without changing files.
- Related modules: Template Catalog, Agent Tool Configuration, Workflow State Ledger, Workflow Health Inspector, Sync Review Orchestrator.
- Boundary notes: configuration management owns intentional post-init selection changes, including architecture replacement. It is not initial adoption and it is not maintenance of drift or template updates; it may reuse readiness findings so it does not mutate an unsafe workflow.

### Workflow Health Inspector

- Suggested module slug: `workflow-health-inspector`
- Simple interface / outside promise: check whether a repo's Sibu workflow is healthy without changing files.
- Hidden complexity: current file inspection, file hashing, state-to-file comparison, state-to-template comparison, selected architecture skill support checks, missing file detection, modified file detection, unrecorded file detection, outdated template detection, customized-file recognition, and normalized finding creation.
- Owns: read-only workflow diagnosis and factual health findings, including missing or unsupported selected architecture skill state.
- Does not own: applying repairs or updates, deciding which sync actions to offer, mutating workflow files, mutating state, or presenting an interactive sync review.
- Key scenarios:
  - A user runs `sibu doctor` and receives a healthy result.
  - A managed file is missing from the repo.
  - A workflow file differs from the recorded hash.
  - Workflow state has no selected architecture skill or references an unsupported architecture skill.
  - A tracked file was generated from an older template version.
  - A customized file has a newer reviewed template available.
- Related modules: Template Catalog, Workflow State Ledger, Sync Review Orchestrator.
- Boundary notes: the inspector reports what is true now, including architecture selection problems; the Sync Review Orchestrator decides what choices to offer and applies only approved changes.

### Sync Review Orchestrator

- Suggested module slug: `sync-review-orchestrator`
- Simple interface / outside promise: given workflow findings, guide the user through safe maintenance decisions and apply only approved changes.
- Hidden complexity: grouping findings, explaining maintenance choices, mapping findings to allowed actions, protecting customized files, repairing missing required architecture selection, applying repair/update/customize/unmanage/skip decisions, coordinating template content, updating state, and preserving user ownership decisions.
- Owns: user-controlled workflow maintenance, allowed action policy for findings, sync review flow, approved file changes, approved state changes, architecture selection repair decisions, and decision explanations.
- Does not own: raw state persistence, generic template metadata, read-only health inspection, first-time installation, or external tool behavior.
- Key scenarios:
  - Sibu offers to repair a missing managed file.
  - Sibu offers to apply a safe template update for an unchanged managed file.
  - Sibu protects a customized file and asks the user how to proceed.
  - Sibu guides the user to select required architecture guidance when state is missing or unsupported.
  - Sibu records that a user wants to keep a file customized or unmanage it entirely.
  - Sibu skips a finding for later without pretending it was resolved.
- Related modules: Workflow Health Inspector, Template Catalog, Workflow State Ledger, Agent Tool Configuration, Workflow Configuration Manager.
- Boundary notes: sync review is where read-only findings become user-approved maintenance actions, including repair of missing architecture selection. It must never silently overwrite project-owned work.


### Maintainer Release Support

- Suggested module slug: `maintainer-release-support`
- Simple interface / outside promise: given maintainer release intent and local repository context, plan, validate, and coordinate a safe Sibu release.
- Hidden complexity: git history inspection, conventional commit classification, changelog proposal formatting, SemVer guidance, package metadata planning, dirty-worktree and tag checks, validation command sequencing, npm publish behavior including OTP/interactive flows, git commit/tag/push ordering, GitHub Release creation, and recovery reporting after partial failure.
- Owns: maintainer-facing changelog generation, release planning, release metadata updates, release-readiness validation coordination, publication step orchestration, and release recovery guidance.
- Does not own: end-user workflow adoption/configuration/sync behavior, general source-control hosting behavior, npm as an external registry, GitHub as an external release surface, or public `sibu` workflow commands.
- Key scenarios:
  - A maintainer previews release notes and SemVer guidance from local git history.
  - A maintainer accepts a planned changelog and package metadata update.
  - Sibu validates release readiness before publishing.
  - Sibu publishes a release through commit, tag, npm publish, push, and GitHub Release creation.
  - A public release step fails and Sibu reports what completed plus manual recovery guidance.
- Related modules: Version Advisory.
- Boundary notes: this module is product-owned because Sibu maintainers need a safe, repeatable release workflow for Sibu itself. It remains maintainer-facing support, not a consumer-project workflow capability.

## Cross-Module Rules

- **Project ownership stays visible**: workflow files and artifacts belong to the project even when Sibu tracks or helps maintain them.
- **No silent destructive changes**: modules that write files, state, release metadata, tags, or public release surfaces must do so only as part of explicit initialization, intentional configuration, user-approved maintenance, or maintainer-approved release behavior.
- **Read-only and mutating behavior stay separate**: health inspection diagnoses; configuration management handles intentional post-init changes; sync review mutates only after maintenance approval.
- **Templates are source, workflow files are local copies**: modules must preserve the distinction between Sibu-provided templates and repo-owned files.
- **Local customization is first-class**: customized and unmanaged files are valid user choices, not errors to erase.
- **Secrets are never stored by Sibu-managed configuration**: tool configuration must reference credentials safely instead of embedding secret values.
- **Architecture guidance is cross-module workflow context**: required architecture selection belongs to Workflow Installer, recorded state belongs to Workflow State Ledger, replacement belongs to Workflow Configuration Manager, health/repair belongs to Workflow Health Inspector and Sync Review Orchestrator, and downstream application belongs to skill guidance. Do not create a standalone Architecture module unless future behavior hides a deeper, independent complexity behind a smaller interface.
- **Downstream skills must not invent architecture guidance**: technical design, implementation planning, and execution should hard-stop when selected architecture guidance is missing and direct the user to workflow repair.
- **Skill routing remains prompt-owned unless product behavior changes**: because routing and prerequisite policy currently live in skill instructions, it is not modeled as an app-level deep module. Selecting which optional skill files are installed after initialization belongs to Workflow Configuration Manager.
- **Maintainer-facing is still product-owned when it protects Sibu's own lifecycle**: release support may be a Deep Module even though it is not a public `sibu` command, because it hides release complexity and safety rules for Sibu maintainers.
- **New modules require hidden complexity**: add a module only when callers need a simpler promise that hides meaningful implementation detail; do not add modules for one command, one helper, one file, or one workflow step.
