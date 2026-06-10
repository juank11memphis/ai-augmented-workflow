# Capabilities Map

## Purpose

This Capabilities Map translates Sibu's Product Vision and Business Domain Model into the product and business abilities Sibu must provide.

Capabilities are written at the product level: what Sibu must be able to do for developers and teams, not how the software is structured internally.

User Control & Trust is treated as a cross-cutting principle rather than a standalone subdomain. Its concrete capabilities appear in the subdomains where users experience them: adoption, maintenance, pipeline guidance, and tool configuration.

## Capability Map

### Core Subdomains

#### Workflow Adoption & State Tracking

- **Initialize repo workflow**: bootstrap Sibu into an uninitialized repo so the project can begin using a repo-local AI-augmented development workflow.
- **Orchestrate initial setup choices**: guide first-time choices for agents, optional skills, and optional MCP/tool support by coordinating the relevant supporting capabilities.
- **Install selected workflow files**: create repo-local workflow files from selected Sibu templates while preserving that those files belong to the project.
- **Record workflow state**: store selected agents, template versions, file hashes, and ownership status so future workflow health and sync decisions have a reliable baseline.
- **Explain project ownership**: make clear that installed workflow files are project-owned even when Sibu tracks them as managed files.
- **Explain installed workflow structure**: help users understand what was created, what is managed, what can be customized, and what remains under their control.

#### Workflow Configuration Management

- **List configurable workflow options**: show which optional skills and MCP/tool integrations are available and which are already selected.
- **Apply intentional selection changes**: let users add or stop optional workflow guidance and tool integrations after initialization.
- **Check mutation readiness**: prevent post-init configuration changes when unresolved workflow drift or unsafe local state would make mutation ambiguous.
- **Update selected workflow files**: create, update, or remove affected workflow files for selected skills and MCP/tool integrations without changing unrelated files.
- **Record configuration state changes**: update selected skills, selected MCP servers, file metadata, hashes, and ownership state after approved configuration changes.
- **Preserve configuration boundaries**: keep intentional configuration changes distinct from first-time adoption and sync maintenance.

#### Workflow Maintenance & Sync Review

- **Check workflow health**: inspect Sibu-managed workflow state without changing files so users know whether the workflow is healthy or needs attention.
- **Detect workflow drift**: identify missing, modified, unrecorded, customized, or outdated workflow files that need review.
- **Explain maintenance findings**: make drift, local edits, and template updates understandable before the user decides what to do.
- **Protect local edits**: prevent automatic overwrite of user-customized workflow files and preserve local ownership decisions.
- **Guide sync decisions**: help the user choose whether to repair, update, customize, unmanage, or skip each relevant workflow change.
- **Apply approved maintenance changes**: update workflow files and state metadata only after the user chooses an action.

#### AI-Augmented Development Pipeline

- **Route work to the right skill**: match product, domain, planning, design, implementation, or export requests to the appropriate focused workflow.
- **Enforce artifact prerequisites**: require upstream artifacts before downstream planning, design, or implementation work proceeds.
- **Surface upstream gaps**: stop and identify missing or insufficient product, domain, feature, design, or planning context instead of inventing downstream decisions.
- **Gate downstream progression**: require upstream artifacts to be reviewed or clear enough before they become inputs for later workflow stages.
- **Preserve artifact ownership boundaries**: keep each skill focused on its owned artifact instead of producing unrelated downstream outputs.
- **Carry reviewed context downstream**: use accepted upstream artifacts as the source of truth for later planning and implementation work.
- **Keep narrow fixes lightweight**: avoid forcing the full product pipeline for small code, documentation, or maintenance tasks when direction and ownership are already clear.
- **Keep AI work reviewable**: guide work into small, explicit, validated chunks that preserve engineer judgment and accountability.

### Supporting Subdomains

#### Template Catalog

- **Provide workflow templates**: maintain source templates for agent instructions, skills, conventions, and workflow files.
- **Version templates**: track template versions so projects can detect freshness, drift, and available updates.
- **Describe template changes**: provide user-facing update notes that make sync decisions understandable.
- **Support safe template adoption**: make templates available for initialization and sync without implying that Sibu may silently overwrite project-owned files.

#### Skill Guidance

- **Provide focused skills**: supply task-specific guidance for product vision, domain modeling, capabilities mapping, deep module mapping, feature briefs, technical design, Scrum planning, implementation planning, execution, and export workflows.
- **Define skill boundaries**: make each skill's purpose, required inputs, owned outputs, hard stops, and handoffs clear.
- **Support optional skill selection**: let users include workflow guidance relevant to their project without forcing every skill into every repo.
- **Preserve skill handoffs**: ensure skills pass the right reviewed context downstream while avoiding responsibility for artifacts outside their scope.

#### Agent Support Selection

- **Select agent support**: let users choose which supported agents should receive workflow files or configuration.
- **Resolve agent-specific files**: determine which templates and workflow files are needed for each selected agent.
- **Keep agent support adaptable**: allow Sibu to support changing agent ecosystems without making any one agent the center of the product.

#### MCP / Tool Configuration Support

- **Select tool integrations**: let users choose optional MCP/tool connections that fit their workflow.
- **Render safe tool configuration**: generate agent-specific tool configuration that references credentials safely instead of storing secrets.
- **Keep external tools optional**: preserve Sibu's boundary from GitHub, Notion, MCP servers, editors, AI agents, and other external systems.
- **Separate configuration from credentials**: help users configure access paths while keeping secret values outside Sibu-managed files.

### Generic / External Capabilities

Sibu may coordinate with external systems, but it does not own their capabilities.

- **Source control hosting**: external systems such as GitHub may hold repositories, issues, pull requests, checks, and review workflows.
- **Documentation workspaces**: external systems such as Notion may receive exported planning artifacts.
- **MCP servers**: external tool-access endpoints provide capabilities to agents when selected by the user.
- **AI models and coding agents**: external providers and tools assist with AI work, but Sibu does not provide the models or replace engineer judgment.
- **Editors / IDEs**: external development surfaces remain outside Sibu's core product boundary.

## Capability Dependencies / Sequencing

- **Template Catalog**, **Skill Guidance**, **Agent Support Selection**, and **MCP / Tool Configuration Support** enable **Workflow Adoption & State Tracking**.
- **Workflow Adoption & State Tracking** must precede **Workflow Configuration Management** and **Workflow Maintenance & Sync Review**, because both depend on recorded workflow state.
- **Workflow Configuration Management** depends on **Template Catalog** for selectable skills and workflow templates, **MCP / Tool Configuration Support** for safe tool configuration rendering, and **Workflow Maintenance & Sync Review** readiness concepts to avoid unsafe mutation.
- **Workflow Maintenance & Sync Review** depends on **Template Catalog** for current template versions and meaningful update notes.
- **AI-Augmented Development Pipeline** depends on **Skill Guidance**, because the pipeline is enforced through focused skills and their prerequisite checks.
- **User Control & Trust** is not sequenced as a separate stage; it constrains every capability where Sibu creates, changes, exports, or asks AI to act on project-owned work.

## Known Gaps / Evolution Notes

- **Initial setup breadth**: Sibu may need to decide how much `init` should configure up front versus defer to later `sync` or setup flows.
- **Workflow configuration breadth**: post-init configuration now has a first-class capability boundary; future work should decide which options beyond skills and MCP servers belong there.
- **Skill selection depth**: optional skills may start as template choices, but could evolve into richer recommendations based on project type.
- **MCP/tool configuration maturity**: tool integrations are optional and changing quickly, so Sibu should keep them configurable without making them core product identity.
- **Template update explainability**: sync quality depends on meaningful update notes, not just version numbers.
- **Pipeline strictness**: Sibu must balance enforcing artifact prerequisites with staying lightweight for narrow fixes.
