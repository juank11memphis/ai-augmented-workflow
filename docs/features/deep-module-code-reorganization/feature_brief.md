# Deep Module Code Reorganization Feature Brief

## Summary

Reorganize Sibu's current codebase around the approved Deep Module Map without changing user-facing behavior. This feature is a structural refactor: rename, move, split, and consolidate files so the implementation reflects the current module boundaries while preserving every existing command, prompt, state behavior, template behavior, test expectation, and release/admin workflow.

## Product Vision Fit

Sibu promises velocity without lowering standards. The current CLI is already useful, but its internal organization should make future AI-assisted changes easier to place, review, and validate. Aligning the codebase with the Deep Module Map supports Sibu's small-work philosophy: future contributors and agents can work inside clearer boundaries instead of spreading changes across loosely related shared files.

This feature also supports trust and quality. A refactor that preserves behavior while making boundaries clearer helps Sibu evolve without making users pay for internal churn.

## Deep Module

This feature intentionally touches all existing Deep Modules because it reorganizes the full application around the approved map:

- CLI Command Surface
- Project Adoption
- Workflow State Registry
- Template Catalog and Rendering
- Workflow Target Planning
- Workflow Health Diagnosis
- Sync Review
- Skill Selection Management
- Workflow Mutation Readiness
- Version Advisory
- Interactive Guidance
- Maintainer Release Support

The Deep Module Map is the source of truth for the new organization. No new Deep Modules should be invented as part of this feature. If implementation work exposes a missing or incorrect boundary, the team should stop and update the map before continuing.

## User / Customer Problem

Sibu is growing from a small CLI into a workflow framework. As capabilities accumulate, unclear internal boundaries make it harder for humans and AI agents to know where changes belong. That increases the risk of duplicated logic, accidental behavior changes, overly broad edits, and slower review.

Users do not experience this as a new command or visible feature. They experience it indirectly: future Sibu improvements should be faster, safer, easier to validate, and less likely to regress the workflow they already trust.

## Business Goal

Make Sibu easier to maintain and extend without changing the product experience. The business value is improved delivery confidence: future features, fixes, and template changes should be easier to scope to the right module and safer to execute in small, reviewable chunks.

## Target User / Scenario

This feature serves Sibu maintainers and AI coding agents working inside the Sibu repository. It also protects end users who rely on current Sibu behavior.

The scenario is a maintainer starting a future change and being able to answer quickly:

- Which Deep Module owns this behavior?
- Where should the code live?
- What tests protect the behavior?
- What must not change from the user's perspective?

## Proposed Experience

After the refactor, the Sibu repository should feel organized around named product capabilities rather than incidental folders or broad shared utilities. Maintainers should be able to navigate from a command or behavior to the module that owns it, make a focused change, and validate that existing behavior still works.

For end users, the experience should be intentionally unchanged. The same commands should exist, produce equivalent behavior, preserve the same safety guarantees, and continue to protect local workflow files.

## MVP Scope

- Reorganize all current Sibu application code around the existing Deep Modules.
- Include user-facing CLI workflows and maintainer/admin release tooling.
- Rename, move, split, or create files where doing so makes module ownership clearer.
- Preserve all existing command names, arguments, prompts, state semantics, template behavior, sync behavior, npm advisory behavior, and release/admin behavior.
- Preserve Sibu's safety guarantees: no silent overwrites, `doctor` remains read-only, and user-controlled sync decisions remain explicit.
- Update tests as needed so they follow moved code while continuing to assert the same behavior.
- Keep documentation and module references consistent enough for downstream technical design and implementation planning.
- Validate the refactor with the existing verification suite.

## Out of Scope

- Adding new user-facing commands or capabilities.
- Changing CLI command names, arguments, output meaning, or workflow semantics.
- Changing `.sibu/state.json` semantics or introducing a state migration unless the technical design proves it is unavoidable.
- Changing the template system's user-facing behavior or template content beyond references required by moved code.
- Redesigning prompts, UX, or terminal styling for its own sake.
- Rewriting the product vision or Deep Module Map.
- Publishing a release or changing release policy as part of the refactor itself.

## Success Signals

- Maintainers can identify the owning Deep Module for current code areas without relying on tribal knowledge.
- Future feature briefs and technical designs can map implementation work to code locations more directly.
- Existing tests and verification pass after the refactor.
- Manual or automated smoke checks show current Sibu commands still behave as before.
- Reviewers can understand the refactor as structure-preserving rather than behavior-changing.
- No user-facing workflow files are silently changed by the refactor outside normal Sibu template management rules.

## Business-Level Acceptance Criteria

- All current Sibu functionality remains available after the refactor.
- `sibu init`, `sibu doctor`, `sibu sync`, `sibu skills list`, `sibu skills use`, and `sibu skills stop` preserve their current user-facing behavior.
- Maintainer/admin release tooling preserves its current behavior.
- Existing safety guarantees are preserved, especially local edit protection and explicit user choice before mutating workflow files.
- The code organization visibly reflects the approved Deep Module Map.
- No new Deep Modules are introduced without updating `docs/deep-module-map.md` first.
- The project verification suite passes before the feature is considered complete.

## Risks / Tradeoffs

- A broad refactor can accidentally change behavior even when no behavior change is intended.
- Large file moves can make review harder if done in oversized batches.
- Moving shared utilities too aggressively could create artificial boundaries or duplication.
- Keeping behavior unchanged may limit how much cleanup can happen in the first pass.
- Tests may need path updates, but test assertions should not be weakened to make the refactor easier.

## Open Questions

- Should the technical design recommend one big reorganization or several smaller module-by-module slices?
- Which manual smoke scenarios should be required in addition to automated verification?
- Should documentation describe the final folder/module convention after implementation, or should the code structure remain self-explanatory?
