# Capabilities Map

## Purpose

This Capabilities Map translates Sibu's Product Vision and Business Domain Model into the product and business abilities Sibu must provide.

Capabilities are written at the product level: what Sibu must be able to do for developers and teams, not how the software is structured internally.

User Control & Trust is treated as a cross-cutting principle rather than a standalone subdomain. Its concrete capabilities appear in the subdomains where users experience them: adoption, maintenance, pipeline guidance, architecture guidance, local eval repair, and tool configuration.

## Capability Map

### Core Subdomains

#### Workflow Adoption & State Tracking

- **Initialize repo workflow**: bootstrap Sibu into an uninitialized repo so the project can begin using a repo-local AI-augmented development workflow.
- **Orchestrate initial setup choices**: guide first-time choices for agents, required architecture guidance, optional skills, and optional MCP/tool support by coordinating the relevant supporting capabilities.
- **Require architecture skill selection**: ensure `sibu init` cannot complete until the user explicitly chooses one architecture skill from Sibu's existing fixed catalog, without Sibu choosing a default.
- **Install selected workflow files**: create repo-local workflow files from selected Sibu templates while preserving that those files belong to the project.
- **Install selected architecture guidance**: create the workflow guidance files and routing context for the selected architecture skill as part of the initialized workflow.
- **Record workflow state**: store selected agents, selected architecture skill, template versions, file hashes, and ownership status so future workflow health and sync decisions have a reliable baseline.
- **Explain project ownership**: make clear that installed workflow files are project-owned even when Sibu tracks them as managed files.
- **Explain installed workflow structure**: help users understand what was created, what is managed, what can be customized, and what remains under their control.

#### Workflow Configuration Management

- **List configurable workflow options**: show which optional skills, selected architecture skill, and MCP/tool integrations are available and which are already selected.
- **Apply intentional selection changes**: let users add or stop optional workflow guidance and tool integrations after initialization.
- **Warn before architecture replacement**: explain that replacing the selected architecture skill can disrupt prior technical designs, implementation plans, and implementation guidance before the user confirms the change.
- **Apply intentional architecture replacement**: let users replace the selected architecture skill after warning and confirmation, without treating replacement as routine drift repair.
- **Check mutation readiness**: prevent post-init configuration changes when unresolved workflow drift or unsafe local state would make mutation ambiguous.
- **Update selected workflow files**: create, update, or remove affected workflow files for selected skills, selected architecture guidance, and MCP/tool integrations without changing unrelated files.
- **Record configuration state changes**: update selected skills, selected architecture skill, selected MCP servers, file metadata, hashes, and ownership state after approved configuration changes.
- **Preserve configuration boundaries**: keep intentional configuration changes distinct from first-time adoption and sync maintenance.

#### Workflow Maintenance & Sync Review

- **Check workflow health**: inspect Sibu-managed workflow state without changing files so users know whether the workflow is healthy or needs attention.
- **Detect workflow drift**: identify missing, modified, unrecorded, customized, or outdated workflow files that need review.
- **Detect architecture selection problems**: identify missing or unsupported selected architecture skill state as workflow health that needs review or repair.
- **Explain maintenance findings**: make drift, local edits, architecture selection problems, and template updates understandable before the user decides what to do.
- **Protect local edits**: prevent automatic overwrite of user-customized workflow files and preserve local ownership decisions.
- **Guide sync decisions**: help the user choose whether to repair, update, customize, unmanage, select missing required architecture guidance, or skip each relevant workflow change.
- **Apply approved maintenance changes**: update workflow files and state metadata only after the user chooses an action.

#### AI-Augmented Development Pipeline

- **Route work to the right skill**: match product, domain, planning, design, implementation, or export requests to the appropriate focused workflow.
- **Enforce artifact prerequisites**: require upstream artifacts before downstream planning, design, or implementation work proceeds.
- **Surface upstream gaps**: stop and identify missing or insufficient product, domain, feature, design, or planning context instead of inventing downstream decisions.
- **Keep progression user-directed**: require sufficiently clear upstream context, while letting the user choose when to request the next artifact without BRD, SAD, or SDD approval statuses, signatures, or sign-off gates.
- **Preserve artifact ownership boundaries**: keep each skill focused on its owned artifact instead of producing unrelated downstream outputs.
- **Carry reviewed context downstream**: use accepted upstream artifacts as the source of truth for later planning and implementation work.
- **Carry architecture guidance downstream**: use the repo's selected architecture skill as required context for project SAD authoring, feature SDD authoring, implementation planning, and implementation execution.
- **Hard-stop on missing architecture guidance**: refuse downstream technical or implementation work when the repo has no selected architecture skill, directing the user to repair workflow configuration instead of inventing guidance.
- **Keep narrow fixes lightweight**: avoid forcing the full product pipeline for small code, documentation, or maintenance tasks when direction and ownership are already clear.
- **Maintain project architecture context**: provide a project-level SAD after the Capabilities Map, preserving deep-module guidance and applying the selected architecture skill without making the SAD a prerequisite for business-level BRDs.
- **Ground feature designs in shared architecture**: use each feature's BRD, the project SAD, selected architecture guidance, and required UX to produce an SDD with requirement traceability and existing module ownership.
- **Explain feature behavior visually**: include a main-flow Mermaid sequence diagram in each SDD, allowing a justified alternative for changes without meaningful interaction flow.
- **Route architectural changes upstream**: pause SDD work that changes module boundaries or system-wide decisions and direct the user to update the SAD first; keep architecture-compatible details in the SDD.
- **Keep AI work reviewable**: guide work into small, explicit, validated chunks that preserve engineer judgment and accountability.
- **Determine specialist-review applicability**: send stories that change source code, tests, dependencies, schemas, or runtime configuration through automated implementation review while keeping documentation-only work on the existing validation and human-review path.
- **Establish a shared review snapshot**: give architecture and technical-lead reviewers the same immutable story diff and validation evidence so their outcomes apply to one identifiable implementation state.
- **Coordinate specialist implementation review**: obtain independent architecture and technical-lead assessments concurrently when the host supports it, or sequentially against the unchanged snapshot when concurrency is unavailable.
- **Consolidate review findings**: combine and deduplicate evidence-based reviewer findings into one coherent repair packet without blurring specialist ownership.
- **Route bounded implementation repair**: give each blocking-or-major combined packet to a fresh, narrowly briefed repair executor without replanning, require revalidation, invalidate approvals for earlier snapshots, and allow at most three shared repair rounds plus one final review.
- **Escalate material review decisions**: stop unattended repair when authoritative sources conflict, the repair budget is exhausted, or a change requires significant product, architecture, dependency, data, security, privacy, migration, or scope judgment.
- **Preserve final human story approval**: treat automated specialist approval as evidence for the user rather than permission to mark steps approved, commit changes, or continue delivery autonomously.

#### Local Evals Workbench

- **Discover local eval suites**: find valid eval suites from the repo's conventional eval workspace without requiring dashboard-specific configuration.
- **Run focused eval scope**: let users run either all test cases in a suite or one selected test case so repairs can be validated in small loops.
- **Show eval result status**: make suite, test case, and assertion/grader outcomes visible through a local matrix/list result experience.
- **Inspect failure evidence**: show the exact output or excerpt, failed assertion/grader, expected/reference context, diagnostics, and raw artifacts needed to understand a failure.
- **Analyze one failed assertion at a time**: support conversational LLM analysis focused on a single selected failed assertion, even when a cell has multiple failures.
- **Classify likely failure cause**: help distinguish prompt issues, assertion/grader issues, fixture/input issues, model nondeterminism, and unclear expectations with explicit uncertainty.
- **Draft concrete repair proposals**: produce specific proposed project file changes with affected files, rationale, and expected eval impact.
- **Gate repair mutations by approval**: prevent prompt, assertion, fixture, eval definition, workflow artifact, or other project file mutation until the user approves the concrete proposal.
- **Apply approved project repairs**: mutate only approved files inside the project root, avoid secrets/credentials, and report exactly what changed.
- **Guide eval reruns after repair**: offer or suggest rerunning the relevant test case or suite after an approved change.
- **Handle missing LLM configuration plainly**: keep result inspection available while explaining that analysis/proposal drafting needs server-side provider credentials such as `OPENAI_API_KEY` and may use `SIBU_EVALS_MODEL`.

#### Maintainer Release Support

- **Generate release notes guidance**: inspect git history and propose changelog entries that maintainers can review and edit.
- **Suggest SemVer direction**: derive version bump guidance from conventional commits and breaking-change markers without replacing maintainer judgment.
- **Plan release metadata updates**: preview package metadata and changelog changes before writing files.
- **Validate release readiness**: run the build, test, packaging, and runtime checks required before publication.
- **Coordinate publication steps**: execute release commit, tag, npm publish, push, and GitHub Release creation in a predictable maintainer-approved order.
- **Support release recovery**: report completed steps and manual recovery guidance when a public release step fails.
- **Keep release tooling maintainer-facing**: support publishing Sibu itself without exposing release automation as an end-user workflow command.

### Supporting Subdomains

#### Template Catalog

- **Provide workflow templates**: maintain source templates for agent instructions, skills, conventions, and workflow files.
- **Version templates**: track template versions so projects can detect freshness, drift, and available updates.
- **Describe template changes**: provide user-facing update notes that make sync decisions understandable.
- **Support safe template adoption**: make templates available for initialization and sync without implying that Sibu may silently overwrite project-owned files.
- **Provide eval-authoring templates**: distribute Sibu's eval-authoring skill and any conventional eval artifact templates without owning project-specific eval content.

#### Skill Guidance

- **Provide focused skills**: supply task-specific guidance for product vision, domain modeling, capabilities mapping, project SADs including deep-module boundaries, BRDs, per-feature SDDs, Scrum planning, implementation planning, execution, architecture guidance, and export workflows.
- **Provide architecture skill catalog**: make Sibu's existing fixed set of architecture skills available for explicit user selection without expanding or redefining that catalog in this capability.
- **Define skill boundaries**: make each skill's purpose, required inputs, owned outputs, hard stops, and handoffs clear.
- **Support optional skill selection**: let users include non-architecture workflow guidance relevant to their project without forcing every optional skill into every repo.
- **Preserve skill handoffs**: ensure skills pass the right reviewed context downstream while avoiding responsibility for artifacts outside their scope.
- **Guide specialist implementation reviews**: provide focused architecture-review and technical-lead-review guidance with distinct responsibilities, evidence standards, severity rules, snapshot-bound outcomes, and read-only reviewer authority.
- **Guide eval authoring**: provide focused guidance so agents create and maintain eval suites, test cases, assertions/graders, fixtures, and expected/reference artifacts in Sibu's expected format.

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
- **LLM provider APIs**: external APIs such as OpenAI may power failure analysis and proposal drafting; Sibu only reads server-side credentials from the project/shell environment and must not expose them to the browser.
- **Editors / IDEs**: external development surfaces remain outside Sibu's core product boundary.

## Capability Dependencies / Sequencing

- **Template Catalog**, **Skill Guidance**, **Agent Support Selection**, and **MCP / Tool Configuration Support** enable **Workflow Adoption & State Tracking**.
- **Skill Guidance** must provide the fixed architecture skill catalog before **Workflow Adoption & State Tracking** can require architecture skill selection.
- **Workflow Adoption & State Tracking** must precede **Workflow Configuration Management** and **Workflow Maintenance & Sync Review**, because both depend on recorded workflow state.
- **Workflow Configuration Management** depends on **Template Catalog** for selectable skills and workflow templates, **Skill Guidance** for selected architecture guidance, **MCP / Tool Configuration Support** for safe tool configuration rendering, and **Workflow Maintenance & Sync Review** readiness concepts to avoid unsafe mutation.
- **Workflow Maintenance & Sync Review** depends on **Template Catalog** for current template versions and meaningful update notes, and on **Skill Guidance** to repair missing or unsupported architecture skill selections.
- **AI-Augmented Development Pipeline** depends on **Skill Guidance**, because the pipeline is enforced through focused skills and their prerequisite checks.
- **AI-Augmented Development Pipeline** depends on **Workflow Adoption & State Tracking** for a selected architecture skill before SAD authoring, SDD authoring, implementation planning, or implementation execution proceeds.
- **Specialist implementation review** depends on a validated story implementation, a stable shared snapshot, the project SAD, feature SDD, selected architecture guidance, clean-code guidance, and applicable language or framework guidance.
- **Repair routing** depends on both reviewer outcomes for the same snapshot; parallel execution is preferred when supported, but shared-snapshot consistency is required regardless of scheduling.
- **Fresh repair execution** depends on a narrow handoff containing the original story and plan, authoritative sources and skills, current snapshot identity and changed files, combined findings, and prior validation evidence.
- **Human story approval** follows automated specialist approval or review escalation and remains required before approval metadata, commit, or feature continuation.
- **Local Evals Workbench** depends on **Skill Guidance** and **Template Catalog** for Sibu's eval-authoring conventions, while project-specific eval suites and target files remain project-owned.
- **Local Evals Workbench** depends on external **LLM provider APIs** only for analysis and proposal drafting; eval result inspection should still work without provider credentials.
- **Local Evals Workbench** depends on **User Control & Trust** constraints before applying any repair proposal to project files.
- **Maintainer Release Support** depends on source control history, package metadata, npm publishing, GitHub Releases, and validation scripts, but those external systems remain outside Sibu's owned domain.
- **User Control & Trust** is not sequenced as a separate stage; it constrains every capability where Sibu creates, changes, exports, publishes, or asks AI to act on project-owned work.

## Known Gaps / Evolution Notes

- **SAD/SDD rollout**: these capabilities describe the agreed replacement direction. Renamed authoring skills and updated distribution/consumer contracts still need implementation; the old standalone map and design artifacts are not additional permanent pipeline stages.

- **Initial setup breadth**: Sibu may need to decide how much `init` should configure up front versus defer to later `sync` or setup flows.
- **Workflow configuration breadth**: post-init configuration now has a first-class capability boundary; future work should decide which options beyond skills, architecture guidance, and MCP servers belong there.
- **Architecture replacement risk**: replacing architecture guidance is allowed, but future feature work should define the exact warning, confirmation, and repair experience carefully.
- **Skill selection depth**: optional skills may start as template choices, but could evolve into richer recommendations based on project type.
- **MCP/tool configuration maturity**: tool integrations are optional and changing quickly, so Sibu should keep them configurable without making them core product identity.
- **Template update explainability**: sync quality depends on meaningful update notes, not just version numbers.
- **Pipeline strictness**: Sibu must balance enforcing artifact prerequisites and required architecture guidance with staying lightweight for narrow fixes.
- **Reviewer host compatibility**: supported agents may differ in sub-agent concurrency, so the workflow must prefer parallel specialist review without making simultaneous execution a correctness requirement.
- **Release workflow scope**: maintainer release support should stay focused on Sibu's own publication process unless the product explicitly expands into release management for consumer projects.

- **Local eval format maturity**: the first eval format should be conventional and narrow, but may need migration/versioning once real projects create many suites.
- **Repair safety breadth**: approved eval repairs may target any project file, so future work should strengthen diff preview, sensitive-file protection, and recovery behavior before broad automation.
- **Provider configuration**: MVP can standardize on `OPENAI_API_KEY` and `SIBU_EVALS_MODEL`, while future work may need multi-provider configuration without leaking credentials into project files.
