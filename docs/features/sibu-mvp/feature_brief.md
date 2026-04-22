# Sibu MVP Feature Brief

## Summary

The Sibu MVP is the first usable version of the AI workflow framework: a CLI-supported loop that lets a developer adopt Sibu in a repository, verify the health of the AI workflow setup, safely keep that setup current, and add selected skills after adoption. The MVP centers on `sibu init`, `sibu doctor`, `sibu sync`, and `sibu skills use <skill_name>` — plus a clear definition of required skills, selectable skills, missing skill opportunities, and support for Windsurf as an additional agent target alongside Codex, Claude, and Gemini. Its purpose is not only to give the team a working AI-augmented development workflow, but also to expose concrete work that team members can own to help complete the MVP.

## Product Vision Fit

This feature directly supports Sibu's product north star: a developer should be able to run `sibu init` in a repo with no AI workflow, start working immediately, and feel guided into a better way of collaborating with AI.

The MVP keeps the product focused on Sibu's core promise: strong defaults, local control, visible workflow state, and small, responsible AI-assisted work. It avoids trying to become an AI IDE or a broad automation platform, while still meeting users where they work by supporting agent targets such as Codex, Claude, Gemini, and Windsurf. Instead, it establishes the minimum reliable loop needed for developers and teammates to begin using, testing, extending, and improving the workflow.

## User / Customer Problem

The team wants to move faster with AI, but the workflow is still emerging. Without an MVP boundary, contributors may not know:

- how to adopt Sibu in a project
- which workflow files and skills are essential
- which pieces are optional or selectable
- how to add a selectable skill after the initial adoption step
- whether a repo's AI workflow setup is healthy or drifting
- what skills are missing and need to be built
- where they can contribute meaningful work toward completing Sibu

The result is friction: people may want to help, but they lack a concrete entry point and a clear map of what is already defined versus what still needs ownership.

## Business Goal

The MVP should make Sibu usable enough for the team to use it in real development work while also turning the unfinished parts of the product into visible, assignable opportunities.

Success means the team can start practicing AI-augmented development with Sibu now, while using Sibu itself to identify and prioritize the remaining work needed to complete the MVP.

## Target User / Scenario

Primary users are the repository owner and team members contributing to Sibu.

They use the MVP when:

- setting up Sibu in a repository for the first time
- checking whether the workflow setup is healthy
- reviewing or applying workflow template updates
- understanding which skills are required for the workflow to function
- choosing which optional skills should be available in a project
- adding a selectable skill after `sibu init` has already run and the repo is otherwise clean
- using Windsurf as a supported Sibu agent target alongside Codex, Claude, and Gemini
- identifying missing required or selectable skills that need to be assigned to contributors
- onboarding team members into practical AI-assisted development work

## Proposed Experience

A developer should be able to approach a repo and understand the Sibu workflow through a small set of reliable CLI actions:

1. Run `sibu init` to adopt Sibu in the project.
2. Run `sibu doctor` to inspect whether the workflow setup is healthy.
3. Run `sibu sync` to review and resolve drift, missing files, or available template updates.
4. Run `sibu skills use <skill_name>` to add a selectable skill after adoption, when the workflow state is clean enough to make the change safely.
5. Use Windsurf as a supported Sibu agent target alongside Codex, Claude, and Gemini.
6. See which skills are required for the baseline workflow.
7. See which skills are selectable for project-specific workflows.
8. See which required or selectable skills are missing, incomplete, or not yet available.
9. Use those missing skills as a contribution map for assigning work to team members.

The MVP should make the loop understandable and confidence-building. It should help developers start using AI responsibly while also making the remaining product work visible.

## MVP Scope

- `sibu init` exists and works as the one-time adoption command for a repository.
- `sibu init` creates the initial workflow support files without overwriting existing user-owned files unexpectedly.
- `sibu init` records workflow metadata needed to understand what Sibu manages.
- `sibu doctor` exists and works as a read-only health check.
- `sibu doctor` reports whether managed workflow files are healthy, missing, modified, unrecorded, or generated from older templates.
- `sibu sync` exists and works as the post-init maintenance command.
- `sibu sync` helps users review and repair workflow drift without silently overwriting local edits.
- The minimum acceptable `sibu sync` experience leaves the project in a good workflow state whenever it runs.
- `sibu sync` tells the user whether there are template changes to apply.
- `sibu sync` tells the user whether there are new selectable skills to consider.
- `sibu sync` tells the user whether there are new required skills the project should have.
- `sibu skills use <skill_name>` exists as the explicit post-init command for selecting and adding an available selectable skill.
- `sibu skills use <skill_name>` only proceeds when the existing Sibu workflow state is clean enough to safely apply the skill selection; if `sibu sync` is needed first, Sibu tells the user clearly.
- Selecting a skill after init updates the project workflow state transparently and preserves the same local-control expectations as `sibu sync`.
- The MVP supports Windsurf as an additional first-class agent target alongside Codex, Claude, and Gemini.
- Windsurf support covers the workflow files and instructions needed for Windsurf to participate in the Sibu loop, not deep editor automation.
- The MVP includes an engineer-defined minimal set of required skills needed for the baseline AI development workflow.
- The MVP includes an engineer-defined set of selectable skills that can be added based on project needs.
- The MVP includes the human task of identifying missing required skills so the team knows what blocks the workflow.
- The MVP includes the human task of identifying missing selectable skills so the team can see future extension opportunities.
- Missing skills are presented clearly enough to become assignable work for team members.
- The MVP supports the team using Sibu in real development work while continuing to build and improve Sibu.
- The experience reinforces small, reviewable, human-controlled AI development work.

## Out of Scope

- Becoming a full AI IDE or editor-integrated development environment.
- Automating large end-to-end software projects without human planning and review.
- Supporting every possible programming language, framework, agent, or editor in the first version.
- Deep Windsurf-specific editor automation beyond generating or maintaining the workflow files needed for Windsurf to participate in the Sibu loop.
- Building a marketplace or remote registry for skills.
- Providing detailed project management, sprint planning, or task assignment features.
- Guaranteeing that every selectable skill is implemented by the MVP.
- Advanced analytics about AI usage or developer productivity.
- Complex multi-repo organization management.

## Success Signals

- A team member can run `sibu init` in a repo and understand what was created and managed.
- A team member can run `sibu doctor` and clearly understand whether the workflow is healthy.
- A team member can run `sibu sync` and safely resolve or defer workflow drift.
- A team member can run `sibu skills use <skill_name>` after `sibu init` to add a selectable skill when the repo's Sibu state is clean.
- If a selectable skill cannot be added because the workflow state is not clean, the user understands that `sibu sync` is the next step.
- A team member using Windsurf can participate in the same Sibu-managed workflow loop as users of Codex, Claude, and Gemini.
- The team can name the required skills for the MVP baseline.
- The team can distinguish selectable skills from required skills.
- Human-identified missing required and selectable skills are clear enough to assign as follow-up work.
- New contributors can pick up a human-defined missing skill task or workflow gap and start contributing without needing extensive verbal onboarding.
- The team uses the MVP to do real AI-assisted development work on Sibu itself.
- The workflow feels lightweight, practical, and trust-building rather than bureaucratic.

## Business-Level Acceptance Criteria

- A repository without Sibu can adopt the MVP workflow through `sibu init`.
- A repository with Sibu can be checked through `sibu doctor` without making changes.
- A repository with drift or missing workflow files can be guided through `sibu sync`.
- Sibu clearly communicates what it created, what it manages, and what it will not overwrite automatically.
- Sibu presents the engineer-defined distinction between required skills and selectable skills.
- Sibu lets a user add an available selectable skill through `sibu skills use <skill_name>` after `sibu init` has already been run.
- Sibu only allows post-init skill selection when the current workflow state is clean, or clearly directs the user to run `sibu sync` first.
- Sibu supports Windsurf in the MVP as an additional agent target it can set up or maintain alongside Codex, Claude, and Gemini.
- The MVP work includes documenting any required skills that humans identify as missing or unavailable.
- The MVP work includes documenting any selectable skills that humans identify as missing or unavailable.
- Missing skills are identified by a human and described clearly enough to become contributor assignments.
- The MVP enables at least one team member other than the original author to start using Sibu for AI-assisted development.
- The MVP enables at least one team member to take ownership of a concrete missing skill task or workflow gap identified by a human.

## Risks / Tradeoffs

- If the MVP tries to include too many skills, it may become too broad to finish and use quickly in real development work.
- If human-identified missing skills are documented too vaguely, they will not become useful contribution opportunities.
- If `sync` feels unsafe, users may not trust Sibu with workflow maintenance.
- If required skills are too opinionated, teams may feel boxed in rather than supported.
- If selectable skills are too loose, the MVP may feel unfinished or confusing.
- If post-init skill selection bypasses clean-state checks, users may lose trust that Sibu protects their local workflow files.
- If Windsurf support expands into deep editor automation, Sibu may drift toward the AI IDE category it explicitly avoids.
- If the CLI output is too technical or too verbose, it may reduce the sense of momentum Sibu is meant to create.

## Open Questions

- What repo or project should be used as the first real development target for using Sibu while building Sibu?
- What must Sibu generate or maintain for Windsurf so users get the same baseline workflow support they get with Codex, Claude, and Gemini?
- Should `sibu skills use <skill_name>` support only one skill per command in the MVP, or allow multiple skills once the single-skill path is proven?
