# Capabilities Map

## Purpose

This Capabilities Map translates Sibu's Product Vision and Business Domain Model into the product and business abilities Sibu must provide.

Capabilities are written at the product level: what Sibu must be able to do for developers and teams, not how the software is structured internally.

User Control & Trust is treated as a cross-cutting principle rather than a standalone subdomain. Its concrete capabilities appear in the subdomains where users experience them: adoption, maintenance, pipeline guidance, architecture guidance, sub-agent model routing, local eval repair, and tool configuration.

## Capability Map

### Core Subdomains

#### Workflow Adoption & State Tracking

- **Initialize repo workflow**: bootstrap Sibu into an uninitialized repo so the project can begin using a repo-local AI-augmented development workflow.
- **Orchestrate initial setup choices**: guide first-time choices for agents, required architecture guidance, optional skills, and optional MCP/tool support by coordinating the relevant supporting capabilities.
- **Require architecture skill selection**: ensure `sibu init` cannot complete until the user explicitly chooses one architecture skill from Sibu's existing fixed catalog, without Sibu choosing a default.
- **Install selected workflow files**: create repo-local workflow files from selected Sibu templates while preserving that those files belong to the project.
- **Install selected architecture guidance**: create the workflow guidance files and routing context for the selected architecture skill as part of the initialized workflow.
- **Record workflow state**: store selected agents, selected architecture skill, repo-wide sub-agent model routes, template versions, file hashes, and ownership status so future workflow health and sync decisions have a reliable baseline.
- **Defer model-route selection until needed**: keep initial adoption lightweight by allowing each role-and-workload combination to request its route on first use rather than forcing every route choice during `sibu init`.
- **Explain project ownership**: make clear that installed workflow files are project-owned even when Sibu tracks them as managed files.
- **Explain installed workflow structure**: help users understand what was created, what is managed, what can be customized, and what remains under their control.

#### Workflow Configuration Management

- **List configurable workflow options**: show which optional skills, selected architecture skill, MCP/tool integrations, and Sibu-provided sub-agent model routes are available and already selected.
- **Apply intentional selection changes**: let users add or stop optional workflow guidance and tool integrations after initialization.
- **Warn before architecture replacement**: explain that replacing the selected architecture skill can disrupt prior technical designs, implementation plans, and implementation guidance before the user confirms the change.
- **Apply intentional architecture replacement**: let users replace the selected architecture skill after warning and confirmation, without treating replacement as routine drift repair.
- **Show configured model routes**: present every supported role-and-workload combination, its saved repo-wide route, recommendation status, and any missing or unavailable selection.
- **Change one model route**: let users intentionally replace the model and reasoning effort for one role-and-workload combination.
- **Reset model routes to recommendations**: let users reset one combination or all combinations to current compatible catalog recommendations only after explicit choice.
- **Preserve user-selected routes**: retain available user-selected model choices and distinguish them from Sibu recommendations without blocking or silently replacing them.
- **Check mutation readiness**: prevent post-init configuration changes when unresolved workflow drift or unsafe local state would make mutation ambiguous.
- **Update selected workflow files**: create, update, or remove affected workflow files for selected skills, selected architecture guidance, and MCP/tool integrations without changing unrelated files.
- **Record configuration state changes**: update selected skills, selected architecture skill, selected MCP servers, repo-wide model routes, file metadata, hashes, and ownership state after approved configuration changes.
- **Preserve configuration boundaries**: keep intentional configuration changes distinct from first-time adoption and sync maintenance.

#### Workflow Maintenance & Sync Review

- **Check workflow health**: inspect Sibu-managed workflow state without changing files so users know whether the workflow is healthy or needs attention.
- **Detect workflow drift**: identify missing, modified, unrecorded, customized, or outdated workflow files that need review.
- **Detect architecture selection problems**: identify missing or unsupported selected architecture skill state as workflow health that needs review or repair.
- **Detect model-route review needs**: identify unavailable saved routes and newer research-informed catalog recommendations that the user may want to review.
- **Explain maintenance findings**: make drift, local edits, architecture selection problems, model-route review needs, and template updates understandable before the user decides what to do.
- **Protect local edits**: prevent automatic overwrite of user-customized workflow files and preserve local ownership decisions.
- **Guide sync decisions**: help the user choose whether to repair, update, customize, unmanage, select missing required architecture guidance, retain or change a model route, or skip each relevant workflow change.
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
- **Plan stories into outcome milestones and tasks**: turn one deployable story into at least one outcome-grouped milestone and bounded, ordered tasks without a task-count quota.
- **Define executable task checks before execution**: give each task its own objective pass/fail check and distilled context; split or clarify uncheckable tasks rather than delegating vague work.
- **Challenge plan complexity early**: obtain independent architecture review of the exact plan version, emphasizing over-engineering and premature optimization as well as architecture fit, scope, and check quality; do not send code to the architecture reviewer.
- **Present plan findings plainly**: explain reviewer findings, proposed fixes, and unresolved risks briefly in language a human can readily understand.
- **Gate execution on exact-plan review**: automatically accept a complete review with no findings or unresolved risks and start execution; require a human decision for findings or risks, and block missing or stale reviews.
- **Execute checked tasks on a story branch**: run one bounded task per fresh-context executor iteration, commit only after its prescribed check passes, and retain concise progress history.
- **Stop on executor blockers**: escalate ambiguity, missing checks, repeated failures, undeclared flags, or material scope changes instead of permitting executor improvisation.
- **Advance through checked milestones**: record each milestone's verified outcome and advance to the next without routine human approval; stop for ambiguity, material decisions, failed checks, or other blockers.
- **Open a plain-language story PR**: create a PR at the final milestone with a clear summary of changes, user value, and verification; use its review as both final milestone and story review.
- **Surface material review choices**: present conflicting sources or recommendations and consequential product, architecture, dependency, data, security, privacy, migration, or scope decisions to the human rather than resolving them autonomously.
- **Keep deployment outside the workflow**: coordinate reviewed story delivery through the PR without handling production deployment.

#### Local Evals Workbench

- **Discover local eval suites**: find valid eval suites from the repo's conventional eval workspace without requiring dashboard-specific configuration.
- **Select compatible evaluation models**: let users choose one compatible Model Under Evaluation per run and a separate Judge Model when rubric-based grading requires one.
- **Run focused eval scope**: let users run either all test cases in a suite or one selected test case so repairs can be validated in small loops.
- **Execute real AI behavior**: exercise the Evaluation Target with suite inputs so results come from actual single-turn, multi-turn, and mocked-tool behavior rather than predefined outputs.
- **Preview run consumption**: show expected model-call volume and estimated cost before the user starts a run.
- **Show eval result status**: make suite, test case, and assertion/grader outcomes visible through a local matrix/list result experience.
- **Preserve isolated run evidence**: retain local outputs, scores, tool traces, and diagnostics across dashboard sessions without allowing run artifacts into normal source-control tracking or ordinary LLM context.
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
- **Distribute model recommendations**: package the current model recommendation catalog for supported agent environments as versioned, reviewable Sibu guidance.
- **Explain recommendation updates**: provide sync-visible notes when new models, changed provider guidance, or revised research-informed role recommendations become available.
- **Provide eval-authoring templates**: distribute Sibu's eval-authoring skill and any conventional eval artifact templates without owning project-specific eval content.

#### Skill Guidance

- **Provide focused skills**: supply task-specific guidance for product vision, domain modeling, capabilities mapping, project SADs including deep-module boundaries, BRDs, per-feature SDDs, Scrum planning, implementation planning, execution, architecture guidance, and export workflows.
- **Provide architecture skill catalog**: make Sibu's existing fixed set of architecture skills available for explicit user selection without expanding or redefining that catalog in this capability.
- **Define skill boundaries**: make each skill's purpose, required inputs, owned outputs, hard stops, and handoffs clear.
- **Support optional skill selection**: let users include non-architecture workflow guidance relevant to their project without forcing every optional skill into every repo.
- **Preserve skill handoffs**: ensure skills pass the right reviewed context downstream while avoiding responsibility for artifacts outside their scope.
- **Guide plan architecture reviews**: provide focused, read-only plan-review guidance that challenges over-engineering and premature optimization, with evidence tied to the reviewed plan version.
- **Guide eval authoring**: provide focused guidance so agents create and maintain eval suites, test cases, assertions/graders, fixtures, and expected/reference artifacts in Sibu's expected format.
- **Discover evaluation targets**: help agents identify likely repo-local generative-AI integrations, agents, prompts, and workflows, then ask the user to confirm which targets need evals.
- **Propose deep eval coverage**: analyze each confirmed target across applicable happy-path, edge, failure, abuse, safety, multi-turn, tool-interaction, malformed-input, ambiguous-input, adversarial-input, and nondeterminism scenarios before files are generated.
- **Expose coverage gaps**: distinguish systematic risk-based coverage from exhaustive claims by documenting applicable categories and reasons for any omissions.
- **Require coverage review**: present targets, scenarios, grader approaches, tool behavior, and gaps for user approval before generating suite artifacts.
- **Generate runnable eval suites**: create project-owned suites, synthetic or redacted fixtures, deterministic assertions, rubrics, mocked-tool scenarios, and test-support artifacts without changing production behavior.
- **Clarify expected behavior**: ground pass/fail expectations in repo code, prompts, tests, and documentation, and stop for user clarification when those sources are materially ambiguous.

#### Agent Support Selection

- **Select agent support**: let users choose which supported agents should receive workflow files or configuration.
- **Resolve agent-specific files**: determine which templates and workflow files are needed for each selected agent.
- **Classify delegated workloads**: assign each task given to a Sibu-provided sub-agent one provider-neutral workload class based on scope, ambiguity, and risk.
- **Support adaptive role routing**: allow the same sub-agent role to use different saved routes for bounded, demanding, or high-risk tasks.
- **Maintain research-informed recommendations**: use current official guidance, provider information, and maintainer judgment to recommend the best expected role-and-workload fit, then consider expected cost and completion time.
- **Translate recommendations by agent environment**: map provider-neutral workload classes to compatible concrete models and reasoning effort without making one provider part of Sibu's product identity.
- **Request a route on first use**: pause an unconfigured role-and-workload launch, recommend a compatible route, obtain the user's choice, and save it repo-wide for reuse.
- **Reuse explicit saved routes**: route later launches for the same role and workload class through the repo-wide choice without asking again or silently inheriting the parent model.
- **Handle unavailable routes explicitly**: pause when a saved route cannot be used, preserve it until the user chooses, and recommend a replacement without silent substitution.
- **Allow user-selected alternatives**: let users select any model available to their chosen agent environment while clearly distinguishing their choice from Sibu's current recommendation.
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
- **Template Catalog** distributes versioned model recommendation data and change notes, while **Agent Support Selection** owns role classification, quality/cost interpretation, compatibility, and route-resolution behavior.
- **Skill Guidance** must provide the fixed architecture skill catalog before **Workflow Adoption & State Tracking** can require architecture skill selection.
- **Workflow Adoption & State Tracking** must precede **Workflow Configuration Management** and **Workflow Maintenance & Sync Review**, because both depend on recorded workflow state.
- **Workflow Configuration Management** depends on **Template Catalog** for selectable skills, workflow templates, and recommendation versions; **Skill Guidance** for selected architecture guidance; **Agent Support Selection** for valid model-route choices; **MCP / Tool Configuration Support** for safe tool configuration rendering; and **Workflow Maintenance & Sync Review** readiness concepts to avoid unsafe mutation.
- **Workflow Maintenance & Sync Review** depends on **Template Catalog** for current template and recommendation versions with meaningful update notes, **Skill Guidance** to repair missing or unsupported architecture skill selections, and **Agent Support Selection** to interpret unavailable or superseded model routes.
- **AI-Augmented Development Pipeline** depends on **Skill Guidance**, because the pipeline is enforced through focused skills and their prerequisite checks.
- **AI-Augmented Development Pipeline** depends on **Workflow Adoption & State Tracking** for a selected architecture skill before SAD authoring, SDD authoring, implementation planning, or implementation execution proceeds.
- **AI-Augmented Development Pipeline** depends on **Agent Support Selection** before spawning a Sibu-provided sub-agent: the delegated task must be classified, then an explicit saved route for that role-and-workload combination must be reused or an absent/unavailable route must be resolved by the user first.
- **Plan architecture review** depends on one complete story plan, project SAD, feature SDD, selected architecture guidance, and task-level objective checks; it precedes any unattended execution.
- **Conditional plan acceptance** depends on a complete review of the exact plan version: no findings or unresolved risks permits automatic execution; findings or risks require a human decision. A changed plan needs a fresh review and the same rule.
- **Checked task execution** depends on an accepted plan, one story branch, task-specific checks, relevant conventions, and progress history.
- **Checked milestone progression** follows each verified milestone without a routine human pause; material decisions and blockers still stop unattended execution, and changed plans require fresh review and human acceptance.
- **Final story review** occurs through the final milestone PR, whose hosting remains an external source-control capability. Production deployment is not part of this pipeline capability.
- **Skill Guidance** must discover and confirm Evaluation Targets, obtain approval for the Eval Coverage Plan, and generate runnable suites before the **Local Evals Workbench** can execute them.
- **Local Evals Workbench** depends on **Skill Guidance** and **Template Catalog** for Sibu's eval-authoring conventions, while Evaluation Targets, suite definitions, fixtures, and test-support files remain project-owned.
- **Local Evals Workbench** depends on external **LLM provider APIs** for target execution, rubric judging, analysis, and proposal drafting; non-LLM result inspection should remain available when provider credentials are unavailable.
- **Local Evals Workbench** depends on **User Control & Trust** constraints before applying any repair proposal to project files.
- **Maintainer Release Support** depends on source control history, package metadata, npm publishing, GitHub Releases, and validation scripts, but those external systems remain outside Sibu's owned domain.
- **User Control & Trust** is not sequenced as a separate stage; it constrains every capability where Sibu creates, changes, exports, publishes, or asks AI to act on project-owned work.

## Known Gaps / Evolution Notes

- **SAD/SDD rollout**: these capabilities describe the agreed replacement direction. Renamed authoring skills and updated distribution/consumer contracts still need implementation; the old standalone map and design artifacts are not additional permanent pipeline stages.

- **Initial setup breadth**: Sibu intentionally defers sub-agent model-route choices until each role-and-workload combination is first needed; other future setup choices may still need an init-versus-later decision.
- **Workflow configuration breadth**: post-init configuration includes skills, architecture guidance, MCP servers, and repo-wide Sibu-provided sub-agent model routes; future options still need an explicit ownership decision.
- **Initial provider mapping**: the first recommendation catalog may map only Codex models while workload classes remain provider-neutral for later supported agent environments.
- **Recommendation freshness**: release-and-sync awareness favors reviewed, explainable maintainer guidance over immediate live discovery of every provider model.
- **Team routes vs personal preferences**: the initial capability stores repo-wide choices; private per-developer overrides remain possible future evolution.
- **Catalog coverage**: users may choose available models absent from the catalog; Sibu must not present either catalog recommendations or user-selected routes as guaranteed quality, cost, or completion-time outcomes.
- **Architecture replacement risk**: replacing architecture guidance is allowed, but future feature work should define the exact warning, confirmation, and repair experience carefully.
- **Skill selection depth**: optional skills may start as template choices, but could evolve into richer recommendations based on project type.
- **MCP/tool configuration maturity**: tool integrations are optional and changing quickly, so Sibu should keep them configurable without making them core product identity.
- **Template update explainability**: sync quality depends on meaningful update notes, not just version numbers.
- **Pipeline strictness**: Sibu must balance enforcing artifact prerequisites and required architecture guidance with staying lightweight for narrow fixes.
- **Plan-review host compatibility**: supported agents may differ in sub-agent availability; the workflow must keep the plan-review and human-decision gates intact without assuming concurrent reviewers.
- **Release workflow scope**: maintainer release support should stay focused on Sibu's own publication process unless the product explicitly expands into release management for consumer projects.

- **Local eval format maturity**: the first eval format should be conventional and narrow, but may need migration/versioning once real projects create many suites.
- **Coverage depth without false completeness**: target discovery and coverage analysis should systematically explore applicable risk categories while making omissions and uncertainty visible.
- **Local-first execution scope**: initial execution is dashboard-only, uses one Model Under Evaluation per run, and mocks external tools; headless CI, multi-model comparison, and real external-tool calls remain future evolution.
- **Run artifact isolation**: persisted local evidence must stay useful for regression review without entering Git or routine LLM context accidentally.
- **Repair safety breadth**: approved eval repairs may target any project file, so future work should strengthen diff preview, sensitive-file protection, and recovery behavior before broad automation.
- **Provider configuration**: MVP can standardize on `OPENAI_API_KEY` and `SIBU_EVALS_MODEL`, while future work may need multi-provider configuration without leaking credentials into project files.
