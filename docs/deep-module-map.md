# Deep Module Map

## Purpose

This Deep Module Map identifies Sibu's durable implementation boundaries: modules with small outside promises that hide meaningful internal complexity.

The map is derived from the Product Vision, Business Domain Model, and Capabilities Map. It should guide future feature briefs, technical designs, and implementation plans by clarifying where behavior belongs without prescribing internal architecture, framework structure, database design, or command layout.

User Control & Trust is a cross-module rule, not a standalone module. Each module must preserve project ownership, avoid silent destructive behavior, and keep Sibu's actions understandable and reviewable.

## Modules

### Template Catalog

- Suggested module slug: `template-catalog`
- Simple interface / outside promise: provide versioned Sibu templates, template metadata, and user-facing update meaning.
- Hidden complexity: template discovery, manifest interpretation, template versioning, template paths, supported workflow file metadata, template hashes, skill templates, agent-specific templates, and update/change notes.
- Owns: source template lookup, template identity, template versions, template metadata, template change descriptions, and the distinction between template source and project-owned workflow files.
- Does not own: deciding which templates a user selected during setup, installing files into a repo, rendering tool configuration semantics, recording repo state, or applying sync decisions.
- Key scenarios:
  - Sibu needs to know which templates exist for a selected agent or workflow file.
  - Sibu needs to compare a recorded template version with the current template version.
  - Sibu needs user-facing notes explaining what changed in a template update.
  - A skill file is distributed as a managed template.
- Related modules: Agent Tool Configuration, Workflow Installer, Workflow Health Inspector, Sync Review Orchestrator.
- Boundary notes: the catalog exposes available templates and metadata; it does not own the adoption or sync workflow that decides what to do with them.

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
- Related modules: Template Catalog, Workflow Installer, Workflow Health Inspector.
- Boundary notes: this module may consume template content from Template Catalog, but it owns the semantic rules for translating selected tools into safe agent-specific configuration.

### Workflow State Ledger

- Suggested module slug: `workflow-state-ledger`
- Simple interface / outside promise: tell the rest of Sibu what this repo's Sibu workflow state is and record approved state changes.
- Hidden complexity: state file location, state file schema, selected agents, managed/customized/unmanaged ownership records, recorded file hashes, recorded template versions, reviewed template versions, compatibility, and state migrations.
- Owns: durable Sibu state metadata, loading state, validating state, updating state after approved workflow changes, and representing file ownership status consistently.
- Does not own: deciding which workflow files should be installed, computing current workflow health findings, choosing sync actions, rendering templates, or interacting with external tools.
- Key scenarios:
  - Sibu records initial metadata after workflow adoption.
  - Sibu loads recorded file hashes and template versions before a health check.
  - Sibu updates a file's status to customized or unmanaged after a user-approved sync decision.
  - Sibu needs to preserve what the user has already reviewed.
- Related modules: Workflow Installer, Workflow Health Inspector, Sync Review Orchestrator.
- Boundary notes: the ledger represents recorded truth; it does not decide whether that truth is healthy compared with current files and templates.

### Workflow Installer

- Suggested module slug: `workflow-installer`
- Simple interface / outside promise: given a repo and selected setup choices, install the initial Sibu workflow safely.
- Hidden complexity: setup orchestration, selected agent/skill/tool choices, required template resolution, tool configuration coordination, existing-file handling, safe file creation, initial state recording, and installed-workflow explanation.
- Owns: first-time workflow installation, coordinating selected setup choices, creating selected workflow files, preserving project ownership during adoption, and asking the Workflow State Ledger to record initial metadata.
- Does not own: the interactive UI mechanics for asking questions, generic template metadata, agent-specific tool rendering rules, ongoing sync decisions, or health diagnosis after installation.
- Key scenarios:
  - A user runs `sibu init` in an uninitialized repo.
  - Sibu installs selected agent support files and optional skill files.
  - Sibu coordinates safe MCP/tool configuration for selected agents.
  - Sibu records the initial managed workflow state.
  - Sibu explains what was created and what the user controls.
- Related modules: Template Catalog, Agent Tool Configuration, Workflow State Ledger.
- Boundary notes: installation owns setup orchestration, but reusable template lookup, tool rendering, and state persistence stay behind their own module interfaces.

### Workflow Health Inspector

- Suggested module slug: `workflow-health-inspector`
- Simple interface / outside promise: check whether a repo's Sibu workflow is healthy without changing files.
- Hidden complexity: current file inspection, file hashing, state-to-file comparison, state-to-template comparison, missing file detection, modified file detection, unrecorded file detection, outdated template detection, customized-file recognition, and normalized finding creation.
- Owns: read-only workflow diagnosis and factual health findings.
- Does not own: applying repairs or updates, deciding which sync actions to offer, mutating workflow files, mutating state, or presenting an interactive sync review.
- Key scenarios:
  - A user runs `sibu doctor` and receives a healthy result.
  - A managed file is missing from the repo.
  - A workflow file differs from the recorded hash.
  - A tracked file was generated from an older template version.
  - A customized file has a newer reviewed template available.
- Related modules: Template Catalog, Workflow State Ledger, Sync Review Orchestrator.
- Boundary notes: the inspector reports what is true now; the Sync Review Orchestrator decides what choices to offer and applies only approved changes.

### Sync Review Orchestrator

- Suggested module slug: `sync-review-orchestrator`
- Simple interface / outside promise: given workflow findings, guide the user through safe maintenance decisions and apply only approved changes.
- Hidden complexity: grouping findings, explaining maintenance choices, mapping findings to allowed actions, protecting customized files, applying repair/update/customize/unmanage/skip decisions, coordinating template content, updating state, and preserving user ownership decisions.
- Owns: user-controlled workflow maintenance, allowed action policy for findings, sync review flow, approved file changes, approved state changes, and decision explanations.
- Does not own: raw state persistence, generic template metadata, read-only health inspection, first-time installation, or external tool behavior.
- Key scenarios:
  - Sibu offers to repair a missing managed file.
  - Sibu offers to apply a safe template update for an unchanged managed file.
  - Sibu protects a customized file and asks the user how to proceed.
  - Sibu records that a user wants to keep a file customized or unmanage it entirely.
  - Sibu skips a finding for later without pretending it was resolved.
- Related modules: Workflow Health Inspector, Template Catalog, Workflow State Ledger, Agent Tool Configuration.
- Boundary notes: sync review is where read-only findings become user-approved maintenance actions. It must never silently overwrite project-owned work.

## Cross-Module Rules

- **Project ownership stays visible**: workflow files and artifacts belong to the project even when Sibu tracks or helps maintain them.
- **No silent destructive changes**: modules that write files or state must do so only as part of initialization or user-approved maintenance behavior.
- **Read-only and mutating behavior stay separate**: health inspection diagnoses; sync review mutates only after approval.
- **Templates are source, workflow files are local copies**: modules must preserve the distinction between Sibu-provided templates and repo-owned files.
- **Local customization is first-class**: customized and unmanaged files are valid user choices, not errors to erase.
- **Secrets are never stored by Sibu-managed configuration**: tool configuration must reference credentials safely instead of embedding secret values.
- **Skill routing remains prompt-owned unless product behavior changes**: because routing and prerequisite policy currently live in skill instructions, it is not modeled as an app-level deep module.
- **New modules require hidden complexity**: add a module only when callers need a simpler promise that hides meaningful implementation detail; do not add modules for one command, one helper, one file, or one workflow step.
