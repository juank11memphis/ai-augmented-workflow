# Sibu Local Evals Workbench Feature Brief

## Summary

Sibu Local Evals Workbench gives a Sibu-managed project a convention-based local eval workspace where developers can launch a local dashboard, discover eval suites, run all test cases or one selected test case with a selected eval-run model, inspect failures, and turn failed assertions into controlled improvement loops. The feature centers on a failure-focused drawer: when an eval assertion fails, the user can ask an LLM to focus conversationally on one failed assertion at a time and explain the exact failed output, why it failed, whether the likely issue is the prompt, assertion, fixture, or uncertainty, and then draft a concrete change. Sibu may mutate files inside the target project only after the user explicitly approves a specific proposal; it must not write outside the project root or modify secrets/credentials.

## Product Vision Fit

This feature strongly fits Sibu's promise of velocity without surrendering ownership. Evals help engineers and teams improve AI-assisted workflows with evidence instead of vibes, while the approval-first repair loop protects Sibu's core belief that AI should amplify judgment, not replace it. The feature also reinforces the Small Work Loop: run a focused check, inspect the result, understand the failure, approve a narrow change, validate again.

The local workbench should feel like a practical eval lab for a repo, not a hosted analytics platform or AI autopilot. It should help developers move faster while keeping failures explainable, changes reviewable, and project files under human control.

## Business Domain Model Fit

The feature fits the AI-Augmented Development Pipeline, Skill Guidance, Workflow Adoption & State Tracking, Workflow Maintenance & Sync Review, Template Catalog, and User Control & Trust principles already described in the Business Domain Model.

Relevant domain concepts include Project / Repo, Workflow, Skill, Artifact, Small Work Loop, Hard Stop, Template, Workflow File, and project ownership. Evals become repo-local project artifacts that support reviewable AI-assisted development. The workbench and eval-creation skill should preserve the distinction between Sibu-provided conventions/templates and project-owned eval definitions, fixtures, prompts, rubrics, and run results.

This feature extends Sibu's workflow guidance surface, but it does not change Sibu into an AI IDE, hosted eval service, or autonomous fixer. It keeps eval work grounded in local project context and explicit user approval.

## Capability Coverage

This feature is supported by existing capabilities:

- **AI-Augmented Development Pipeline — Keep AI work reviewable:** eval results make AI workflow quality visible and inspectable before changes are trusted.
- **AI-Augmented Development Pipeline — Gate downstream progression:** failed evals can become a quality signal that must be understood or resolved before a workflow change is considered ready.
- **AI-Augmented Development Pipeline — Surface upstream gaps:** the failure workbench helps identify whether a failure comes from prompt guidance, eval assertion quality, fixture quality, or ambiguous expectations.
- **Skill Guidance — Provide focused skills:** a required eval-authoring skill can create and maintain eval artifacts in Sibu's expected format.
- **Skill Guidance — Define skill boundaries:** eval creation, failure analysis, proposal drafting, and approved mutation must have clear responsibilities and stopping points.
- **Template Catalog — Provide workflow templates:** Sibu can distribute the required eval-authoring skill and any conventional eval templates.
- **Workflow Adoption & State Tracking — Explain installed workflow structure:** Sibu should make the evals folder convention understandable as a repo-owned workflow artifact area.
- **Workflow Maintenance & Sync Review — Protect local edits:** approved eval repairs must respect project-owned files and avoid silent overwrite behavior.

## User / Customer Problem

Developers experimenting with AI workflows need a way to know whether prompts, skills, and assertions are improving or regressing. Raw eval output is often too hard to act on: a user can see that something failed, but not what exact string failed, why the assertion failed, whether the assertion itself is fair, or what change would best fix it. If an LLM starts editing files automatically, trust drops even faster.

The user needs an eval experience that turns one failure into understanding first, then into a proposed fix, and only then into a user-approved file mutation.

## Business Goal

Increase trust and iteration speed for Sibu-guided AI workflows by making eval failures explainable, actionable, and safely repairable. The feature should make Sibu feel like a reliable development loop for improving AI behavior: run, inspect one failed assertion, analyze, approve, mutate, rerun.

## Target User / Scenario

This is for engineers and small teams using Sibu in a local repo. They run a local eval workbench while developing or maintaining prompts, skills, workflow templates, or project-specific AI behavior. When an eval fails, they open the failed cell, work through one failed assertion at a time in conversation with LLM assistance, review a proposed fix, approve it if appropriate, and rerun the focused test case or suite to verify the improvement.

## Proposed Experience

The baseline experience should build directly on the existing eval matrix experience from the user's rpgizer project: a local page with suite selection, model/run controls, summary status, filters, phone-friendly test case list, desktop matrix table, and a drawer for selected result details.

For Sibu, the drawer becomes the main interaction surface and should be reframed around failure troubleshooting rather than generic cell inspection. For passed cells it can still show result details. For failed cells it should act as a conversational Failure Workbench that stays focused on one selected failed assertion at a time:

1. **Failure Summary**: show the active failed assertion, the exact output string or excerpt that failed, the relevant expected/golden/rubric context, and a short plain-language failure reason when available.
2. **AI Failure Analysis**: let the user ask an LLM to analyze the active failed assertion. The LLM must explain what failed and why before proposing any fix, and it must not blend multiple failed assertions into one repair unless the user explicitly chooses that direction.
3. **Likely Cause Classification**: classify the likely source as prompt issue, eval assertion issue, fixture/input issue, model nondeterminism, or unclear / needs human judgment, with evidence.
4. **Human Decision Point**: let the user choose the intended repair direction, such as improve prompt, adjust assertion, update fixture, create a regression case, or ignore for now.
5. **Proposal Preview**: let the LLM draft a specific proposed change, including affected artifact and rationale.
6. **Explicit Approval**: mutate files only after the user approves the concrete proposal. After mutation, report what changed and encourage or offer rerunning the relevant eval scope.

The workbench has two separate model concerns. The eval run model is selected in the dashboard and controls the model being evaluated. The failure analysis/proposal model is server-side workbench assistance; it uses provider credentials from the project or shell environment, requires `OPENAI_API_KEY` for OpenAI-backed assistance, and uses `SIBU_EVALS_MODEL` when provided. The browser must never receive provider API keys.

The product invariant is: Sibu may analyze and propose changes, but it must not mutate prompts, assertions, fixtures, eval definitions, workflow artifacts, or other project files until the user explicitly approves a specific proposed change. Approved changes may target any non-secret file inside the target project root, because prompts and workflow behavior may live outside the conventional `evals/` folder.

## MVP Scope

- Add a local `sibu evals` experience that runs from a Sibu-managed project, launches a local web dashboard, and uses convention over configuration.
- Discover eval suites from a root-level `evals/` folder in the managed project.
- Support a Sibu-defined eval format for eval definitions, test cases, fixtures, expected/reference context, rubric/assertions/graders, and run artifacts.
- Use the rpgizer eval matrix page as the UX baseline: suite navigation, selected suite summary, eval-run model selection, run all/run one test case, filters, result matrix, phone stacked list, and result drawer.
- Make the drawer's primary purpose failed assertion troubleshooting and improvement.
- Let users invoke LLM analysis for failed cells, focused on one selected failed assertion at a time.
- Require the LLM analysis to explain the exact failed output/string or excerpt, the failed assertion, why it failed, and whether the likely issue is in the prompt, assertion, fixture/input, nondeterminism, or unclear expectations.
- Let the LLM draft a concrete repair proposal that names affected project file(s), rationale, and expected eval impact.
- Require explicit user approval before any file mutation, including files outside `evals/`.
- After approval, apply only the approved file mutation inside the project root, reject secret/credential targets, and report what changed.
- Provide or install a required Sibu eval-authoring skill so agents create new evals in the expected format instead of inventing ad hoc structures.

## Out of Scope

- Hosted eval dashboards or cloud persistence.
- Production deployment of the eval dashboard as an end-user web app; `sibu evals` is a local web workbench, not hosted infrastructure.
- Automatic repair or broad fix-all behavior without user approval.
- Broad autonomous optimization loops that repeatedly mutate and rerun without human control.
- Complex analytics, historical trend dashboards, team reporting, or benchmark leaderboards in the first version.
- Supporting arbitrary eval folder locations or extensive eval workspace configuration in the MVP.
- Making Sibu responsible for external model quality, provider uptime, credentials, or billing; Sibu only reads server-side env such as `OPENAI_API_KEY` and optional `SIBU_EVALS_MODEL`.
- Replacing existing Sibu planning/design/implementation artifacts with evals.

## Success Signals

- Users can run `sibu evals` in a Sibu-managed project, open the local dashboard, and quickly see available local eval suites.
- Failed assertions are easier to understand because the drawer shows the exact failed output, assertion, expected context, and explanation.
- Users can distinguish prompt problems from assertion or fixture problems before changing files.
- No eval repair mutates files before a user approves a concrete proposal, and approved mutation stays inside the target project root.
- Approved proposals result in clear, narrow file changes and an obvious next step to rerun the relevant eval.
- New evals created through agents follow Sibu's expected format consistently.
- Users describe the experience as an improvement loop, not just a result viewer.

## Business-Level Acceptance Criteria

- Given a user runs `sibu evals` from a Sibu-managed project, when the project has valid evals in the conventional evals folder, then Sibu launches a local dashboard and shows the available eval suites without requiring manual dashboard configuration.
- Given an eval suite is selected, when the user chooses an eval-run model and runs all cases or one case, then the dashboard shows result status at the suite, row, and cell level.
- Given a failed assertion cell, when the user opens the drawer, then the drawer prioritizes failure troubleshooting over raw result details.
- Given a failed assertion cell, when the user selects one failed assertion and asks for analysis, then the LLM explains the exact failed output or excerpt, the failed assertion, why it failed, and the likely source of the issue.
- Given the LLM believes the source is uncertain, then the analysis must say that clearly instead of pretending confidence.
- Given the LLM drafts a fix proposal, then the user can review the exact project file(s), rationale, and expected eval impact before approving it.
- Given a proposal has not been explicitly approved, then Sibu must not mutate prompt, assertion, fixture, eval definition, workflow, or other project files.
- Given the user approves a concrete proposal, then Sibu may mutate the relevant non-secret file(s) inside the project root and must report what changed.
- Given files were mutated after approval, then the experience offers or clearly suggests rerunning the relevant eval scope.
- Given a failed cell has multiple failed assertions, then the Failure Workbench keeps analysis and repair conversation scoped to one selected failed assertion at a time.
- Given LLM credentials are missing, then eval result inspection remains available and analysis/proposal drafting clearly explains the missing server-side configuration.
- Given `SIBU_EVALS_MODEL` is set, then workbench LLM analysis/proposal drafting uses it as the default assistance model.
- Given a user asks an agent to create a new eval, then the required Sibu eval-authoring skill guides the agent to create the eval in Sibu's expected format.

## Risks / Tradeoffs

- LLM analysis can be persuasive even when wrong, so the UI must make uncertainty visible and keep approval with the user.
- A proposal preview that is too vague could become a disguised autopilot; proposals must name concrete file targets, rationale, and expected eval impact.
- Mutating project files from a local dashboard increases trust and safety requirements around diffs, scope, sensitive-file protection, project-root boundaries, and recovery.
- Convention over configuration keeps the MVP simple but may need flexibility later for repos with existing eval locations.
- Copying the rpgizer baseline accelerates design and implementation, but Sibu should adapt the language and priorities so the drawer becomes a failure workbench rather than a generic detail drawer.
- Running LLM-backed eval analysis may require credentials, assistance model selection, and cost visibility that should be handled plainly without making external providers feel Sibu-owned.
