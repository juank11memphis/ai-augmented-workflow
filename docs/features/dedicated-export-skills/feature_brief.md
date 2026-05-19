# Dedicated Export Skills Feature Brief

## Summary

Dedicated Export Skills move external publishing behavior out of Sibu's planning and documentation authoring skills and into focused exporter skills. When a project enables a supported MCP server such as GitHub or Notion, Sibu should also make the matching export skill available so agents know how to publish the right local artifacts to the right external destination without bloating every authoring skill with export rules.

## Product Vision Fit

Sibu's product vision favors small, well-shaped AI collaboration, clear workflow boundaries, and user control. Dedicated export skills support that by keeping authoring skills focused on creating high-quality local Markdown artifacts while giving users explicit, opt-in pathways for external publishing. This preserves Sibu's lightweight workflow promise: strong defaults, clear responsibilities, and no hidden external side effects.

## Deep Module

Skill Selection Management (`skill-selection-management`) and MCP Server Selection Management (`mcp-server-selection-management`) own the user-facing selection behavior for export skills and their MCP dependencies.

Workflow Target Planning (`workflow-target-planning`) owns the catalog relationship between selectable MCP servers and matching export skills across supported agent targets. Template Catalog and Rendering (`template-catalog-rendering`) owns the exporter skill templates and removal of export guidance from authoring skill templates. Sync Review (`sync-review`) owns offering already-initialized projects a safe path to adopt the new matching export skill when an MCP server is already selected.

## User / Customer Problem

Sibu's planning and documentation skills currently risk carrying destination-specific export behavior, such as Notion export instructions in document writers or GitHub export behavior in Scrum planning. That makes skills less focused, increases maintenance cost, and can surprise users by mixing local artifact creation with external publishing concerns.

Users need export behavior to be discoverable and convenient when they have configured the relevant MCP server, but still separated from the core authoring workflow so local Markdown remains the canonical artifact.

## Business Goal

Make Sibu's skill system easier to understand, maintain, and extend by separating artifact authoring from artifact exporting, while increasing the usefulness of MCP server selection through paired export capabilities.

## Target User / Scenario

The primary user is a Sibu adopter who has enabled GitHub or Notion MCP support and wants their agent to publish existing feature artifacts externally.

Typical scenarios include:

- A user has a completed feature plan and asks an agent to export that feature's Epics and User Stories to GitHub.
- A user has feature documentation and asks an agent to export the feature's core docs to Notion.
- A user selects the GitHub or Notion MCP during `sibu init`, `sibu mcp use`, or `sibu sync` and expects Sibu to provide the matching export workflow guidance.
- A user explicitly runs `sibu skills use export-to-github` or `sibu skills use export-to-notion` before selecting the required MCP server and needs Sibu to explain and include the dependency.

## Proposed Experience

Sibu offers two focused exporter skills:

- `export-to-github`, invoked with a feature name, guides an agent to export that feature's Epics and User Stories to GitHub issues/projects using the configured GitHub MCP capabilities.
- `export-to-notion`, invoked with a feature name, guides an agent to export only that feature's feature brief, UX design, and technical design Markdown files to Notion using the configured Notion MCP capabilities.

When a user selects the GitHub MCP server, Sibu should include `export-to-github` as an explained companion skill. When a user selects the Notion MCP server, Sibu should include `export-to-notion` the same way. During `sibu init`, these companion export skills should not appear later as pre-selected items in the optional workflow skills prompt, because that would imply the user can or should make a second decision about the pairing. Instead, Sibu should state the automatic pairing near the MCP selection and include it in the final setup summary.

For targeted `sibu mcp use` and `sibu sync`, Sibu should also offer or apply the matching export skill through the normal guarded workflow. When a user selects an export skill directly and the required MCP server is not selected, Sibu should clearly explain the dependency and guide the user through adding the required MCP server too. The experience should preserve user control through explicit messaging and sync review, not through redundant prompts that make required pairings look optional.

Exporter skills should work for all available agent targets where the export workflow is actually feasible. If a target cannot support the required MCP/tooling path, Sibu should avoid pretending the export skill works there.

Planning and documentation skills should stop owning export behavior. They should create local artifacts and then finish with the local path response expected for their pipeline stage. Export instructions, export gates, and destination-specific publishing rules should move into the dedicated exporter skills.

## MVP Scope

- Create a selectable `export-to-github` skill for exporting a named feature's Epics and User Stories to GitHub.
- Create a selectable `export-to-notion` skill for exporting a named feature's feature brief, UX design, and technical design Markdown files to Notion.
- Pair GitHub MCP selection with the GitHub export skill during `sibu init`, `sibu mcp use`, and `sibu sync` adoption flows.
- Pair Notion MCP selection with the Notion export skill during `sibu init`, `sibu mcp use`, and `sibu sync` adoption flows.
- During `sibu init`, explain MCP-implied export skills near MCP selection and omit those implied skills from the later optional workflow skill prompt.
- When a user selects an export skill directly, explain and include the required MCP server if it is not already selected.
- Support all available agent targets where the required export workflow is feasible.
- Move existing Notion export guidance out of feature brief, UX, and technical design authoring skills and into `export-to-notion`.
- Move existing GitHub export guidance out of Scrum planning and into `export-to-github`.
- Keep local Markdown artifacts canonical even when exported externally.

## Out of Scope

- Exporting arbitrary documents beyond the specified feature brief, UX design, technical design, Epics, and User Stories.
- Replacing local Markdown artifacts with Notion, GitHub, or another external system as the source of truth.
- Building a general-purpose export framework for every future destination.
- Validating external provider authentication beyond Sibu's normal MCP selection and agent guidance.
- Supporting external destinations without a configured or selected MCP path.
- Automatically exporting artifacts merely because an MCP server or export skill is selected.
- Creating new product pipeline stages, implementation plans, or technical designs as part of export.

## Success Signals

- Authoring skills become shorter and more focused because destination-specific export guidance is removed.
- Users who enable GitHub or Notion MCP support can discover and use the matching export skill without manual setup guesswork.
- Existing projects with selected GitHub or Notion MCP support see a safe `sibu sync` path to adopt the matching exporter skill.
- Users can request export by feature name instead of manually locating every artifact.
- Local Markdown remains the trusted canonical artifact before and after external export.

## Business-Level Acceptance Criteria

- Selecting the GitHub MCP server causes Sibu to include or offer `export-to-github` in the same workflow where appropriate.
- Selecting the Notion MCP server causes Sibu to include or offer `export-to-notion` in the same workflow where appropriate.
- During `sibu init`, MCP-implied export skills are explained as companion additions instead of shown as pre-selected choices in the optional workflow skills prompt.
- `sibu sync` offers already-initialized projects with selected GitHub or Notion MCP support a safe way to adopt the matching export skill.
- Running `sibu skills use export-to-github` without GitHub MCP selected tells the user that GitHub MCP is required and guides them to add it.
- Running `sibu skills use export-to-notion` without Notion MCP selected tells the user that Notion MCP is required and guides them to add it.
- `export-to-github` is designed around receiving a feature name and exporting that feature's Epics and User Stories.
- `export-to-notion` is designed around receiving a feature name and exporting only the feature brief, UX design, and technical design Markdown files.
- Feature brief, UX, technical design, and Scrum planning skills no longer contain their own export gates or optional export sections.
- Export skills do not automatically publish anything unless the user asks an agent to run the export workflow.

## Risks / Tradeoffs

- Pairing MCP selection with export skills makes setup more helpful, but Sibu must avoid silently expanding external integration behavior beyond what the user understands.
- Removing export guidance from authoring skills simplifies those skills, but users who were used to automatic post-authoring export prompts may need to learn the new explicit exporter workflow.
- Supporting all feasible agent targets is valuable, but Sibu should be honest when an agent target cannot actually perform the export.
- Direct skill selection with automatic dependency guidance improves usability, but dependency handling must preserve the same local-edit protections and sync readiness standards as other workflow mutations.
